import jwt from "jsonwebtoken";
import { checkToken } from "../utils/session.js";

export const COOKIE_NAME = "wah_token";
const isProd = () => process.env.NODE_ENV === "production";
const WEEK = 7 * 24 * 60 * 60 * 1000;

// httpOnly: page scripts can't read it · sameSite lax: other sites can't send it with forms
// secure: only sent over HTTPS in production · path "/": whole site
const cookieOptions = () => ({ httpOnly: true, secure: isProd(), sameSite: "lax", path: "/" });

export function setAuthCookie(res, user) {
  const token = jwt.sign(
    { id: String(user._id), role: user.role, v: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
  res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: WEEK });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
}

export function readToken(token) {
  try { return jwt.verify(token, process.env.JWT_SECRET); } catch { return null; }
}

// also rejects tokens from before "log out everywhere" and blocked accounts
export async function requireAuth(req, res, next) {
  const data = await checkToken(req.cookies?.[COOKIE_NAME]);
  if (!data) return res.status(401).json({ error: "Please log in." });
  req.user = data;
  next();
}

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: "You are not allowed to do this." });
