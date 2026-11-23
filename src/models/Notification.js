// P8: notifications stored on the server (the same on every device).
import mongoose from "mongoose";
const { Schema } = mongoose;

export const NOTIF_TYPES = ["application", "status", "message", "job", "system"];

const notificationSchema = new Schema({
  user:  { type: String, required: true },                 // uid of the person who gets it
  type:  { type: String, enum: NOTIF_TYPES, required: true },
  title: { type: String, required: true, maxlength: 200 },
  body:  { type: String, default: "", maxlength: 500 },
  link: {                                                   // what a click opens
    kind:   { type: String, enum: ["job", "application", "chat"] },
    id:     String,
    jobId:  String,
    chatId: String,
  },
  count:     { type: Number, default: 1 },                  // grouped messages: how many
  read:      { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },             // also "last updated" for grouped messages
}, { versionKey: false });

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });   // deleted after 90 days
// at most ONE unread message notification per person per chat (new messages update it)
notificationSchema.index({ user: 1, "link.chatId": 1 },
  { unique: true, partialFilterExpression: { type: "message", read: false }, name: "one_unread_msg_per_chat" });

notificationSchema.methods.toClient = function () {
  return { id: String(this._id), type: this.type, title: this.title, body: this.body, link: this.link || {},
           count: this.count || 1, read: !!this.read, createdAt: this.createdAt };
};

export default mongoose.model("Notification", notificationSchema);
