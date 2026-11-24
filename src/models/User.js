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
  blockedReason: { type: String, maxlength: 500 },        // P9: shown to the user in the email
  blockedAt:     Date,
  isAdmin:      { type: Boolean, default: false },        // P9: SEPARATE from role (role is overwritten by the website profile)
  emailVerified:     { type: Boolean, default: false },
  emailVerifyHash:   { type: String, select: false },   // sha256 of the link token (never the token itself)
  emailVerifyExp:    { type: Date, select: false },
  emailCodeHash:     { type: String, select: false },   // sha256 of the 6-digit code in the same email
  emailCodeExp:      { type: Date, select: false },     // the code works for 30 minutes
  emailCodeTries:    { type: Number, default: 0, select: false },   // wrong codes; 5 → ask for a new email
  emailVerifySentAt: Date,
  emailVerifyCount:  { type: Number, default: 0 },      // emails sent today (max 5)
  emailVerifyDay:    String,                            // "YYYY-MM-DD" of that count
  resetHash:         { type: String, select: false },   // sha256 of the password-reset token
  resetExp:          { type: Date, select: false },     // reset link works for 30 minutes
  passwordChangedAt: Date,
  hasPassword:       { type: Boolean, default: true },  // false = Google-only account (P6)
  lastLoginAt:       Date,                              // for "set a password" on Google-only accounts
  googleSub:         { type: String, unique: true, sparse: true },   // Google's id for this person (P6)
  notifyEmail: {                                        // P8: which notifications also come by email
    application: { type: Boolean, default: true },
    status:      { type: Boolean, default: true },
    message:     { type: Boolean, default: true },
  },
}, { timestamps: true });

// browser e pathanor age gopon jinish shoriye dey
userSchema.methods.toPublic = function () {
  const u = this.toObject();
  delete u.passwordHash; delete u.tokenVersion; delete u.__v;
  delete u.failedLogins; delete u.lockUntil; delete u.emailVerifyCount; delete u.emailVerifyDay;
  delete u.resetHash; delete u.resetExp; delete u.googleSub; delete u.isAdmin;
  delete u.emailCodeHash; delete u.emailCodeExp; delete u.emailCodeTries;
  if (u.role !== "student") delete u.student;
  if (u.role !== "employer") delete u.company;
  u.id = String(u._id);
  return u;
};

export default mongoose.model("User", userSchema);