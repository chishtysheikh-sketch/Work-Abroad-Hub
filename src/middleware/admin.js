// P9: admin-only routes.
// requireAdmin = logged in (valid, not blocked, not logged-out cookie) AND User.isAdmin === true,
// read fresh from the database on every request — never from the cookie (the cookie only holds id/role/version).
import User from "../models/User.js";
import { COOKIE_NAME } from "./auth.js";
import { checkToken } from "../utils/session.js";

export async function requireAdmin(req, res, next) {
  const t = await checkToken(req.cookies?.[COOKIE_NAME]);
  if (!t) return res.status(401).json({ code: "unauthenticated", error: "Please log in." });
  const u = await User.findById(t.id).select("email isAdmin blocked").lean().catch(() => null);
  if (!u || u.blocked || u.isAdmin !== true) return res.status(403).json({ code: "permission-denied", error: "Admins only." });
  req.user = { ...t, email: u.email };
  next();
}
