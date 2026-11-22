import mongoose from "mongoose";
const { Schema } = mongoose;

const conversationSchema = new Schema({
  employer: { type: Schema.Types.ObjectId, ref: "User", required: true },
  student:  { type: Schema.Types.ObjectId, ref: "User", required: true },
  employerName: String,
  studentName: String,
  jobTitle: String,
  lastMessage: { text: String, from: Schema.Types.ObjectId, at: Date },
  readAt:    { type: Map, of: Date, default: {} },
  clearedAt: { type: Map, of: Date, default: {} },
}, { timestamps: true });

conversationSchema.index({ employer: 1, student: 1 }, { unique: true });
conversationSchema.index({ employer: 1, updatedAt: -1 });
conversationSchema.index({ student: 1, updatedAt: -1 });

conversationSchema.methods.has = function (userId) {
  return String(this.employer) === String(userId) || String(this.student) === String(userId);
};
conversationSchema.methods.other = function (userId) {
  return String(this.employer) === String(userId) ? this.student : this.employer;
};

export default mongoose.model("Conversation", conversationSchema);
