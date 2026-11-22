import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import Job, { CATEGORIES } from "../models/Job.js";
import User from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { MIN_WAGE, hourlyEquivalent } from "../utils/pay.js";

const router = Router();
const time = z.string().regex(/^\d{2}:\d{2}$/);

const jobSchema = z.object({
  title: z.string().trim().min(2).max(80),
  titleKo: z.string().trim().max(80).optional(),
  category: z.enum(CATEGORIES),
  city: z.string().min(1).max(40),
  area: z.string().max(40).optional(),
  lat: z.number().min(33).max(39),
  lng: z.number().min(124).max(132),
  days: z.array(z.number().int().min(0).max(6)).max(7).default([]),
  start: time.optional(), end: time.optional(), flexible: z.boolean().optional(),
  payType: z.enum(["hourly", "daily", "monthly"]),
  pay: z.number().int().positive().max(20000000),
  payHours: z.number().min(1).max(300).optional(),
  koreanLevel: z.union([z.literal(0), z.literal(1), z.literal(3), z.literal(5)]).default(0),
  flags: z.array(z.enum(["weekend", "evening", "remote", "english", "noexp"])).max(5).default([]),
  description: z.string().max(3000).default(""),
  deadline: z.coerce.date().optional(),
});

function checkWage(body, res) {
  const hourly = hourlyEquivalent(body);
  if (hourly < MIN_WAGE) {
    res.status(400).json({ error: `Pay is below the minimum wage (₩${MIN_WAGE.toLocaleString()}/hour). This is ₩${Math.floor(hourly).toLocaleString()}/hour.` });
    return false;
  }
  return true;
}

// PUBLIC: list jobs
router.get("/", async (req, res) => {
  const { q, city, cat, english, page = 1 } = req.query;
  const filter = { status: "open" };
  if (city) filter.city = String(city);
  if (cat) filter.category = { $in: String(cat).split(",") };
  if (english === "1") filter.flags = "english";
  if (q) filter.$text = { $search: String(q).slice(0, 60) };
  const limit = 20, skip = (Math.max(1, Number(page) || 1) - 1) * limit;
  const [items, total] = await Promise.all([
    Job.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select("-description -__v").lean(),
    Job.countDocuments(filter),
  ]);
  res.json({ items, total, page: Number(page) || 1, pages: Math.ceil(total / limit) });
});

// PUBLIC: jobs near me
router.get("/near", async (req, res) => {
  const lat = Number(req.query.lat), lng = Number(req.query.lng);
  const km = Math.min(Number(req.query.km) || 10, 50);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return res.status(400).json({ error: "lat and lng are required" });
  const items = await Job.aggregate([
    { $geoNear: { near: { type: "Point", coordinates: [lng, lat] }, distanceField: "distanceM",
                  maxDistance: km * 1000, spherical: true, query: { status: "open" } } },
    { $limit: 30 },
    { $project: { description: 0, __v: 0 } },
  ]);
  res.json({ items });
});

// EMPLOYER: my jobs
router.get("/mine", requireAuth, requireRole("employer"), async (req, res) => {
  const items = await Job.find({ employer: req.user.id }).sort({ createdAt: -1 }).lean();
  res.json({ items });
});

// PUBLIC: one job
router.get("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Job not found" });
  const job = await Job.findById(req.params.id).lean();
  if (!job) return res.status(404).json({ error: "Job not found" });
  const emp = await User.findById(job.employer).select("company").lean();
  res.json({ job, company: emp?.company || null });
});

// EMPLOYER: post a job
router.post("/", requireAuth, requireRole("employer"), validate(jobSchema), async (req, res) => {
  if (!checkWage(req.body, res)) return;
  const count = await Job.countDocuments({ employer: req.user.id });
  if (count >= 50) return res.status(400).json({ error: "You can have at most 50 jobs." });
  const me = await User.findById(req.user.id).select("company.name").lean();
  const { lat, lng, ...rest } = req.body;
  const job = await Job.create({
    ...rest, employer: req.user.id, companyName: me?.company?.name || "Company",
    location: { type: "Point", coordinates: [lng, lat] },
  });
  res.status(201).json({ job });
});

// EMPLOYER: edit my job
router.patch("/:id", requireAuth, requireRole("employer"), validate(jobSchema.partial()), async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id, employer: req.user.id });
  if (!job) return res.status(404).json({ error: "Job not found" });
  if (!checkWage({ ...job.toObject(), ...req.body }, res)) return;
  const { lat, lng, ...rest } = req.body;
  job.set(rest);
  if (lat !== undefined && lng !== undefined) job.location = { type: "Point", coordinates: [lng, lat] };
  await job.save();
  res.json({ job });
});

// EMPLOYER: open / close
router.post("/:id/status", requireAuth, requireRole("employer"),
  validate(z.object({ status: z.enum(["open", "closed"]) })), async (req, res) => {
  const r = await Job.updateOne({ _id: req.params.id, employer: req.user.id }, { $set: { status: req.body.status } });
  if (!r.matchedCount) return res.status(404).json({ error: "Job not found" });
  res.json({ ok: true });
});

// EMPLOYER: delete
router.delete("/:id", requireAuth, requireRole("employer"), async (req, res) => {
  const r = await Job.deleteOne({ _id: req.params.id, employer: req.user.id });
  if (!r.deletedCount) return res.status(404).json({ error: "Job not found" });
  res.json({ ok: true });
});

export default router;