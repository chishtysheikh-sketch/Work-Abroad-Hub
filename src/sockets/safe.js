// P11: safe Socket.IO event handlers.
// Without this, ONE bad message (e.g. socket.emit("sub", null)) threw inside the handler and crashed the
// whole server. on() always passes a plain object + a real ack function, and catches sync AND async errors.
import { logger } from "../utils/logger.js";

export function on(socket, event, handler) {
  socket.on(event, (...args) => {
    const ack = typeof args[args.length - 1] === "function" ? args.pop() : () => {};
    const payload = args[0] !== null && typeof args[0] === "object" && !Array.isArray(args[0]) ? args[0] : {};
    const fail = err => {
      logger.error({ err, event, uid: socket.data?.uid || socket.user?.id || null }, "socket handler failed");
      try { ack({ ok: false, error: "Server error, try again" }); } catch { /* ack already sent */ }
    };
    try {
      const r = handler(payload, ack);
      if (r && typeof r.catch === "function") r.catch(fail);
    } catch (err) { fail(err); }
  });
}
