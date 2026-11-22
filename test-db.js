import "dotenv/config";
import mongoose from "mongoose";

await mongoose.connect(process.env.MONGODB_URI);
console.log("✅ Connected to database:", mongoose.connection.name);

await mongoose.connection.db.collection("hello").insertOne({
  msg: "Hello from Work Abroad Hub",
  at: new Date(),
});
console.log("✅ Saved a test document");

await mongoose.disconnect();