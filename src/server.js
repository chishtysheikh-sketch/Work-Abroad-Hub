import { env } from "./config/env.js";     // must be first: checks .env and stops with a clear message if wrong
import http from "node:http";
import mongoose from "mongoose";
import { Server } from "socket.io";
import { logger } from "./utils/logger.js";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { registerFbLive } from "./sockets/fbLive.js";
import { minWageWarning } from "./utils/pay.js";

// P11: a bug nobody caught → write WHAT happened (with the stack) and stop. A process manager / host
// (or nodemon in development) starts a fresh, clean server; carrying on in an unknown state is worse.
function crash(what, err) {
  logger.fatal({ err }, `💥 ${what}: ${err?.message || err} → stopping the server`);
  process.exit(1);
}
process.on("unhandledRejection", reason => crash("unhandled promise rejection", reason));
process.on("uncaughtException", err => crash("uncaught exception", err));

try {
  await connectDB(env.MONGODB_URI);
} catch (err) {
  logger.fatal({ err }, `❌ Can't connect to MongoDB (${err.message}). Is it running? (brew services start mongodb-community)`);
  process.exit(1);
}

const server = http.createServer(app);
const io = new Server(server);
app.set("io", io);
registerFbLive(io);    // live updates for the real website (Part 10)

server.on("error", err => {
  if (err.code === "EADDRINUSE") {
    logger.fatal(`Port ${env.PORT} is already in use. Another server is running. Stop it or run: kill $(lsof -ti :${env.PORT})`);
    process.exit(1);
  }
  crash("server error", err);
});
server.listen(env.PORT, () => {
  logger.info(`🚀 Server running: http://localhost:${env.PORT}`);
  const w = minWageWarning(); if (w) logger.warn(w);
});

// P11: graceful shutdown (Ctrl+C, or SIGTERM from the host when it restarts / deploys):
// 1. stop accepting new connections and close every live socket (requests already running may finish)
// 2. close MongoDB   3. exit. If that takes more than 10 s, exit anyway.
let stopping = false;
async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  logger.info(`👋 ${signal} received: shutting down…`);
  const force = setTimeout(() => { logger.error("shutdown took longer than 10 s → forcing exit"); process.exit(1); }, 10_000);
  force.unref();
  try {
    await new Promise((resolve, reject) => io.close(err => (err ? reject(err) : resolve())));   // sockets + HTTP server
    logger.info("   ✓ HTTP server and live connections closed");
    mongoose.connection.removeAllListeners("disconnected");      // a planned close is not an alarm
    await mongoose.disconnect();
    logger.info("   ✓ MongoDB closed. Bye!");
    process.exit(0);
  } catch (err) {
    logger.error({ err }, "shutdown problem");
    process.exit(1);
  }
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
