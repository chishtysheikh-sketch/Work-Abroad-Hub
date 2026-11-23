// P9: "🚩 Report" from users (a job, a user or a chat message), handled in the admin panel.
import mongoose from "mongoose";
const { Schema } = mongoose;

export const REPORT_KINDS = ["job", "user", "message"];

const reportSchema = new Schema({
  reporter:   { type: String, required: true },        // uid
  kind:       { type: String, enum: REPORT_KINDS, required: true },
  targetId:   { type: String, required: true },        // job id / user uid / message id
  ownerUid:   String,                                  // job: the employer · message: the sender · user: = targetId
  chatId:     String,                                  // message reports only
  reason:     { type: String, required: true, maxlength: 500 },
  snapshot:   { type: String, maxlength: 300 },        // job title / message text at the time of the report
  status:     { type: String, enum: ["open", "resolved"], default: "open" },
  note:       { type: String, maxlength: 500 },        // admin's note when resolving
  resolvedBy: String,
  resolvedAt: Date,
  createdAt:  { type: Date, default: Date.now },
}, { versionKey: false });

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reporter: 1, createdAt: -1 });
// one OPEN report per person per thing
reportSchema.index({ reporter: 1, kind: 1, targetId: 1 }, { unique: true, partialFilterExpression: { status: "open" } });

export default mongoose.model("Report", reportSchema);
