import mongoose from "mongoose";
const { Schema } = mongoose;

const userSchema = new Schema({
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role:         { type: String, enum: ["student", "employer", "admin"], required: true },
  name:         { type: String, required: true, trim: true, maxlength: 60 },
  phone:        { type: String, maxlength: 20 },
  photoUrl:     String,
  student: {
    visa: String, topik: String, school: String, city: String, birth: String,
  },
  company: {
    name: String, bizNumber: String, type: { type: String }, city: String,
    address: String, contact: String, verified: { type: Boolean, default: false },
  },
  agreedAt:     Date,
  tokenVersion: { type: Number, default: 0 },
  failedLogins: { type: Number, default: 0 },     // wrong passwords in a row
  lockUntil:    Date,                             // locked after 5 wrong passwords
  blocked:      { type: Boolean, default: false },
  emailVerified:     { type: Boolean, default: false },
  emailVerifyHash:   { type: String, select: false },   // sha256 of the link token (never the token itself)
  emailVerifyExp:    { type: Date, select: false },
  emailVerifySentAt: Date,
  emailVerifyCount:  { type: Number, default: 0 },      // emails sent today (max 5)
  emailVerifyDay:    String,                            // "YYYY-MM-DD" of that count
}, { timestamps: true });

// browser e pathanor age gopon jinish shoriye dey
userSchema.methods.toPublic = function () {
  const u = this.toObject();
  delete u.passwordHash; delete u.tokenVersion; delete u.__v;
  delete u.failedLogins; delete u.lockUntil; delete u.emailVerifyCount; delete u.emailVerifyDay;
  if (u.role !== "student") delete u.student;
  if (u.role !== "employer") delete u.company;
  u.id = String(u._id);
  return u;
};

export default mongoose.model("User", userSchema);