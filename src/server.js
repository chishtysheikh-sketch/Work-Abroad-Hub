import "dotenv/config";
import http from "node:http";
import { Server } from "socket.io";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { registerChat } from "./sockets/chat.js";
import { registerFbLive } from "./sockets/fbLive.js";

const PORT = process.env.PORT || 4000;
await connectDB(process.env.MONGODB_URI);

const server = http.createServer(app);
const io = new Server(server);
app.set("io", io);
registerChat(io);      // chat-test.html (Part 8)
registerFbLive(io);    // live updates for the real website (Part 10)

server.listen(PORT, () => console.log(`🚀 Server running: http://localhost:${PORT}`));
process.on("SIGTERM", () => server.close(() => process.exit(0)));
