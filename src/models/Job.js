import mongoose from "mongoose";
const { Schema } = mongoose;

export const CATEGORIES = ["cafe", "retail", "tutor", "translation", "office", "tourism", "events", "online"];

const pointSchema = new Schema(
  { type: { type: String, enum: ["Point"], required: true },
    coordinates: { type: [Number], required: true } },
  { _id: false }
);

const jobSchema = new Schema({
  employer:    { type: Schema.Types.ObjectId, ref: "User", required: true },
  companyName: { type: String, required: true },
  title:       { type: String, required: true, trim: true, maxlength: 80 },
  titleKo:     { type: String, trim: true, maxlength: 80 },
  category:    { type: String, enum: CATEGORIES, required: true },
  city:        { type: String, required: true, maxlength: 40 },
  area:        { type: String, maxlength: 40 },
  location:    { type: pointSchema, required: true },
  days:        [{ type: Number, min: 0, max: 6 }],
  start: String, end: String, flexible: Boolean,
  payType:     { type: String, enum: ["hourly", "daily", "monthly"], default: "hourly" },
  pay:         { type: Number, required: true, min: 0 },
  payHours:    { type: Number, min: 1, max: 300 },
  koreanLevel: { type: Number, enum: [0, 1, 3, 5], default: 0 },
  flags:       [{ type: String, enum: ["weekend", "evening", "remote", "english", "noexp"] }],
  description: { type: String, maxlength: 3000 },
  deadline:    Date,
  status:      { type: String, enum: ["open", "closed"], default: "open" },
  applicationCount: { type: Number, default: 0 },
}, { timestamps: true });

jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ employer: 1, createdAt: -1 });
jobSchema.index({ location: "2dsphere" });
jobSchema.index({ category: 1, city: 1, status: 1 });
jobSchema.index({ title: "text", description: "text", companyName: "text" });

export default mongoose.model("Job", jobSchema);