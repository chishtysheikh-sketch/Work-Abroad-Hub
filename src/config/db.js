import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

export const POOL_SIZE = 20;      // P10: up to 20 MongoDB connections at once (queries beyond that wait in line)

export async function connectDB(uri) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, { maxPoolSize: POOL_SIZE, serverSelectionTimeoutMS: 10000 });
  logger.info(`✅ MongoDB connected: ${mongoose.connection.name} (pool: max ${POOL_SIZE} connections)`);
  // P11: say it when the database goes away / comes back (health check turns 503 meanwhile)
  mongoose.connection.on("disconnected", () => logger.error("❌ MongoDB disconnected"));
  mongoose.connection.on("reconnected", () => logger.info("✅ MongoDB reconnected"));
}