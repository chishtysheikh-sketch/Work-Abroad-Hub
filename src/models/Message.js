import mongoose from "mongoose";
const { Schema } = mongoose;

const messageSchema = new Schema({
  conversation: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
  from:      { type: Schema.Types.ObjectId, ref: "User", required: true },
  text:      { type: String, maxlength: 1000, default: "" },
  deleted:   { type: Boolean, default: false },
  hiddenFor: [{ type: Schema.Types.ObjectId }],
}, { timestamps: true });

messageSchema.index({ conversation: 1, _id: -1 });

export default mongoose.model("Message", messageSchema);
