// P9: every admin action is written here (who did what to whom, and when).
import mongoose from "mongoose";
const { Schema } = mongoose;

const adminLogSchema = new Schema({
  admin:      { type: String, required: true },        // admin's uid
  adminEmail: String,
  action:     { type: String, required: true },        // e.g. "user.block", "job.hide", "employer.verify", "report.resolve"
  target:     { type: String, required: true },        // e.g. "user:<uid>", "job:<ownerUid>/<jobId>"
  details:    { type: Schema.Types.Mixed, default: {} },
  at:         { type: Date, default: Date.now },
}, { versionKey: false });

adminLogSchema.index({ at: -1 });
adminLogSchema.index({ target: 1, at: -1 });

export default mongoose.model("AdminLog", adminLogSchema);
