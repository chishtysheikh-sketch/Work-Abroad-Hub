// Email + password login with:
//  - account lockout: 5 wrong passwords → locked for 15 minutes
//  - bcrypt cost upgrade: old hashes with cost < 12 are re-hashed on a successful login
//  - blocked accounts can't log in
// Passwords and hashes are never logged.
import bcrypt from "bcryptjs";
import User from "../models/User.js";

export const BCRYPT_COST = 12;
const MAX_TRIES = 5;
const LOCK_MS = 15 * 60 * 1000;

// compared against when the email doesn't exist, so both cases take the same time
let dummyHash = null;
const getDummy = async () => (dummyHash ??= await bcrypt.hash("not-a-real-password-1", BCRYPT_COST));

// → { user } on success, otherwise { status, code, error }
export async function passwordLogin(email, password) {
  const wrong = { status: 401, code: "auth/invalid-credential", error: "Wrong email or password." };
  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user) { await bcrypt.compare(String(password), await getDummy()); return wrong; }

  if (user.lockUntil && user.lockUntil > new Date()) {
    return { status: 429, code: "auth/too-many-requests", error: "Too many wrong passwords. Try again in 15 minutes." };
  }

  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) {
    const tries = (user.failedLogins || 0) + 1;
    const set = tries >= MAX_TRIES ? { failedLogins: 0, lockUntil: new Date(Date.now() + LOCK_MS) } : { failedLogins: tries };
    await User.updateOne({ _id: user._id }, { $set: set });
    return wrong;
  }

  if (user.blocked) return { status: 403, code: "auth/user-disabled", error: "This account has been blocked." };

  const set = {};
  if (user.failedLogins || user.lockUntil) { set.failedLogins = 0; set.lockUntil = null; }
  if (bcrypt.getRounds(user.passwordHash) < BCRYPT_COST) set.passwordHash = await bcrypt.hash(String(password), BCRYPT_COST);
  if (Object.keys(set).length) await User.updateOne({ _id: user._id }, { $set: set });
  return { user };
}
