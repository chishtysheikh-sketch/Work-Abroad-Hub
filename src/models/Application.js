import mongoose from "mongoose";
const { Schema } = mongoose;

const applicationSchema = new Schema({
  job:      { type: Schema.Types.ObjectId, ref: "Job", required: true },
  employer: { type: Schema.Types.ObjectId, ref: "User", required: true },
  student:  { type: Schema.Types.ObjectId, ref: "User", required: true },
  jobTitle: String,
  companyName: String,
  message:  { type: String, maxlength: 1000 },
  profile: {
    name: String, email: String, phone: String, photoUrl: String,
    visa: String, topik: String, school: String,
  },
  status: { type: String, enum: ["new", "contacted", "interview", "hired", "rejected"], default: "new" },
}, { timestamps: true });

applicationSchema.index({ job: 1, student: 1 }, { unique: true });
applicationSchema.index({ employer: 1, createdAt: -1 });
applicationSchema.index({ student: 1, createdAt: -1 });

export default mongoose.model("Application", applicationSchema);