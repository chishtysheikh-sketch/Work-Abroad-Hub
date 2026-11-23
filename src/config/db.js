import mongoose from "mongoose";

export const POOL_SIZE = 20;      // P10: up to 20 MongoDB connections at once (queries beyond that wait in line)

export async function connectDB(uri) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, { maxPoolSize: POOL_SIZE, serverSelectionTimeoutMS: 10000 });
  console.log(`✅ MongoDB connected: ${mongoose.connection.name} (pool: max ${POOL_SIZE} connections)`);
}