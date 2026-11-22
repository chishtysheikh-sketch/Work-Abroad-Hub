import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();
router.use(requireAuth);

// my chats
router.get("/", async (req, res) => {
  const me = req.user.id;
  const field = req.user.role === "employer" ? "employer" : "student";
  const list = await Conversation.find({ [field]: me }).sort({ updatedAt: -1 }).limit(100).lean();
  const visible = list.filter(c => {
    const cleared = c.clearedAt?.[me];
    return !cleared || (c.lastMessage?.at && new Date(c.lastMessage.at) > new Date(cleared));
  });
  res.json({ items: visible });
});

// open a chat with someone
router.post("/start", validate(z.object({ otherUserId: z.string(), jobTitle: z.string().max(80).optional() })), async (req, res) => {
  if (!mongoose.isValidObjectId(req.body.otherUserId)) return res.status(404).json({ error: "User not found." });
  const me = await User.findById(req.user.id).lean();
  const other = await User.findById(req.body.otherUserId).lean();
  if (!other || other.role === me.role) return res.status(400).json({ error: "Chat is only between a student and an employer." });
  const employer = me.role === "employer" ? me : other;
  const student  = me.role === "student"  ? me : other;
  const convo = await Conversation.findOneAndUpdate(
    { employer: employer._id, student: student._id },
    { $setOnInsert: { employerName: employer.company?.name || employer.name, studentName: student.name },
      $set: { jobTitle: req.body.jobTitle || "" } },
    { upsert: true, returnDocument: "after" });
  res.json({ conversation: convo.toJSON({ flattenMaps: true }) });
});

// message history (30 at a time)
router.get("/:id/messages", async (req, res) => {
  const me = req.user.id;
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Chat not found" });
  const convo = await Conversation.findById(req.params.id);
  if (!convo || !convo.has(me)) return res.status(404).json({ error: "Chat not found" });
  const filter = { conversation: convo._id, hiddenFor: { $ne: me } };
  const cleared = convo.clearedAt?.get(me);
  if (cleared) filter.createdAt = { $gt: cleared };
  if (req.query.before && mongoose.isValidObjectId(req.query.before)) filter._id = { $lt: req.query.before };
  const items = await Message.find(filter).sort({ _id: -1 }).limit(30).lean();
  res.json({ items: items.reverse(), conversation: convo.toJSON({ flattenMaps: true }) });
});

// delete chat (only for me)
router.delete("/:id", async (req, res) => {
  const me = req.user.id;
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Chat not found" });
  const r = await Conversation.updateOne(
    { _id: req.params.id, $or: [{ employer: me }, { student: me }] },
    { $set: { [`clearedAt.${me}`]: new Date(), [`readAt.${me}`]: new Date() } });
  if (!r.matchedCount) return res.status(404).json({ error: "Chat not found" });
  res.json({ ok: true });
});

export default router;
