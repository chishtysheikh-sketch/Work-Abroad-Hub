import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import User from "../models/User.js";
import { validate } from "../middleware/validate.js";
import { setAuthCookie, clearAuthCookie, requireAuth } from "../middleware/auth.js";

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8, "at least 8 characters").max(72),
  role: z.enum(["student", "employer"]),
  name: z.string().trim().min(1).max(60),
  phone: z.string().max(20).optional(),
  agree: z.literal(true, { error: "please accept the Terms and Privacy Policy" }),
  student: z.object({
    visa: z.string().max(20).optional(), topik: z.string().max(20).optional(),
    school: z.string().max(80).optional(), city: z.string().max(40).optional(),
    birth: z.string().max(10).optional(),
  }).optional(),
  company: z.object({
    name: z.string().min(1).max(60), bizNumber: z.string().min(10).max(20),
    type: z.string().max(20).optional(), city: z.string().max(40).optional(),
    address: z.string().max(120).optional(), contact: z.string().max(60).optional(),
  }).optional(),
});

router.post("/register", authLimiter, validate(registerSchema), async (req, res) => {
  const { email, password, role, name, phone, student, company } = req.body;
  if (role === "employer" && !company) return res.status(400).json({ error: "Company details are required." });
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    email, passwordHash, role, name, phone, agreedAt: new Date(),
    student: role === "student" ? (student || {}) : undefined,
    company: role === "employer" ? company : undefined,
  });
  setAuthCookie(res, user);
  res.status(201).json({ user: user.toPublic() });
});

const loginSchema = z.object({ email: z.email(), password: z.string().min(1).max(72) });

router.post("/login", authLimiter, validate(loginSchema), async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select("+passwordHash");
  const ok = user && await bcrypt.compare(req.body.password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Wrong email or password." });
  setAuthCookie(res, user);
  res.json({ user: user.toPublic() });
});

router.post("/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user || (user.tokenVersion || 0) !== req.user.v) {
    clearAuthCookie(res);
    return res.status(401).json({ error: "Please log in." });
  }
  res.json({ user: user.toPublic() });
});

export default router;