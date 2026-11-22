import jwt from "jsonwebtoken";

export const COOKIE_NAME = "wah_token";
const isProd = () => process.env.NODE_ENV === "production";

export function setAuthCookie(res, user) {
  const token = jwt.sign(
    { id: String(user._id), role: user.role, v: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true, secure: isProd(), sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: isProd(), sameSite: "lax" });
}

export function readToken(token) {
  try { return jwt.verify(token, process.env.JWT_SECRET); } catch { return null; }
}

export function requireAuth(req, res, next) {
  const data = readToken(req.cookies?.[COOKIE_NAME]);
  if (!data) return res.status(401).json({ error: "Please log in." });
  req.user = data;
  next();
}

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: "You are not allowed to do this." });