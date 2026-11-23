import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { COOKIE_NAME } from "../middleware/auth.js";
import { checkToken } from "../utils/session.js";
import { on } from "./safe.js";
import { logger } from "../utils/logger.js";

function getCookie(header, name) {
  const m = (header || "").match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

export function registerChat(io) {
  // only logged-in users can connect
  io.use(async (socket, next) => {
    const user = await checkToken(getCookie(socket.handshake.headers.cookie, COOKIE_NAME)).catch(() => null);
    if (!user) return next(new Error("unauthorized"));
    socket.user = user;
    next();
  });

  io.on("connection", (socket) => {
    const me = socket.user.id;
    socket.join(`user:${me}`);

    let count = 0;
    const timer = setInterval(() => (count = 0), 10000);
    socket.on("disconnect", () => clearInterval(timer));

    const loadConvo = async (id) => {
      if (!mongoose.isValidObjectId(id)) return null;
      const c = await Conversation.findById(id);
      return c && c.has(me) ? c : null;
    };

    on(socket, "chat:join", async ({ conversationId } = {}, ack = () => {}) => {
      const c = await loadConvo(conversationId);
      if (!c) return ack({ ok: false, error: "Chat not found" });
      socket.join(`chat:${c._id}`);
      ack({ ok: true });
    });

    on(socket, "chat:leave", ({ conversationId } = {}) => socket.leave(`chat:${conversationId}`));

    on(socket, "chat:send", async ({ conversationId, text } = {}, ack = () => {}) => {
      try {
        if (++count > 20) return ack({ ok: false, error: "Slow down a little" });
        text = String(text || "").trim().slice(0, 1000);
        if (!text) return ack({ ok: false, error: "Empty message" });
        const c = await loadConvo(conversationId);
        if (!c) return ack({ ok: false, error: "Chat not found" });
        const msg = await Message.create({ conversation: c._id, from: me, text });
        await Conversation.updateOne({ _id: c._id }, {
          $set: { lastMessage: { text: text.slice(0, 120), from: me, at: msg.createdAt },
                  [`readAt.${me}`]: msg.createdAt } });
        io.to(`chat:${c._id}`).emit("chat:new", msg);
        io.to(`user:${c.other(me)}`).emit("chat:badge", { conversationId: String(c._id), text: text.slice(0, 60) });
        ack({ ok: true, id: msg._id });
      } catch (e) { logger.error({ err: e }, "chat:send failed"); ack({ ok: false, error: "Not sent, try again" }); }
    });

    on(socket, "chat:seen", async ({ conversationId } = {}) => {
      const c = await loadConvo(conversationId); if (!c) return;
      const at = new Date();
      await Conversation.updateOne({ _id: c._id }, { $max: { [`readAt.${me}`]: at } });
      io.to(`chat:${c._id}`).emit("chat:seen", { conversationId: String(c._id), userId: me, at });
    });

    on(socket, "chat:unsend", async ({ messageId } = {}, ack = () => {}) => {
      if (!mongoose.isValidObjectId(messageId)) return ack({ ok: false });
      const msg = await Message.findOneAndUpdate(
        { _id: messageId, from: me, deleted: false },
        { $set: { deleted: true, text: "" } }, { returnDocument: "after" });
      if (!msg) return ack({ ok: false, error: "Can't unsend this" });
      io.to(`chat:${msg.conversation}`).emit("chat:unsent", { messageId: String(msg._id) });
      ack({ ok: true });
    });

    on(socket, "chat:hide", async ({ messageId } = {}, ack = () => {}) => {
      if (!mongoose.isValidObjectId(messageId)) return ack({ ok: false });
      const msg = await Message.findById(messageId).select("conversation").lean();
      const c = msg && await loadConvo(msg.conversation);
      if (!c) return ack({ ok: false });
      await Message.updateOne({ _id: messageId }, { $addToSet: { hiddenFor: me } });
      ack({ ok: true });
    });

    on(socket, "chat:typing", ({ conversationId } = {}) =>
      socket.to(`chat:${conversationId}`).emit("chat:typing", { conversationId, userId: me }));
  });
}
