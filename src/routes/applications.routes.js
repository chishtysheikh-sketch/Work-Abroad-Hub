import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import Application from "../models/Application.js";
import Job from "../models/Job.js";
import User from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();
router.use(requireAuth);

// STUDENT: apply
router.post("/", requireRole("student"),
  validate(z.object({ jobId: z.string(), message: z.string().max(1000).default("") })),
  async (req, res) => {
  if (!mongoose.isValidObjectId(req.body.jobId)) return res.status(404).json({ error: "Job not found." });
  const job = await Job.findOne({ _id: req.body.jobId, status: "open" }).lean();
  if (!job) return res.status(404).json({ error: "This job is closed or does not exist." });
  const me = await User.findById(req.user.id).lean();
  const app = await Application.create({
    job: job._id, employer: job.employer, student: me._id,
    jobTitle: job.title, companyName: job.companyName, message: req.body.message,
    profile: { name: me.name, email: me.email, phone: me.phone, photoUrl: me.photoUrl,
               visa: me.student?.visa, topik: me.student?.topik, school: me.student?.school },
  });
  await Job.updateOne({ _id: job._id }, { $inc: { applicationCount: 1 } });
  req.app.get("io")?.to(`user:${job.employer}`).emit("application:new", { id: app._id, jobTitle: job.title, name: me.name });
  res.status(201).json({ application: app });
});

// STUDENT: my applications
router.get("/mine", requireRole("student"), async (req, res) => {
  const items = await Application.find({ student: req.user.id }).sort({ createdAt: -1 }).lean();
  res.json({ items });
});

// EMPLOYER: applications to my jobs
router.get("/received", requireRole("employer"), async (req, res) => {
  const filter = { employer: req.user.id };
  if (req.query.job && mongoose.isValidObjectId(req.query.job)) filter.job = req.query.job;
  const items = await Application.find(filter).sort({ createdAt: -1 }).limit(500).lean();
  res.json({ items });
});

// EMPLOYER: dashboard numbers
router.get("/stats", requireRole("employer"), async (req, res) => {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const [stats] = await Application.aggregate([
    { $match: { employer: new mongoose.Types.ObjectId(req.user.id) } },
    { $facet: {
        byStatus: [ { $group: { _id: "$status", count: { $sum: 1 } } } ],
        last30Days: [
          { $match: { createdAt: { $gte: since } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Seoul" } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } } ],
        topJobs: [ { $group: { _id: "$jobTitle", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 5 } ],
    } },
  ]);
  res.json(stats);
});

// EMPLOYER: change status
router.patch("/:id", requireRole("employer"),
  validate(z.object({ status: z.enum(["new", "contacted", "interview", "hired", "rejected"]) })),
  async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Application not found." });
  const app = await Application.findOneAndUpdate(
    { _id: req.params.id, employer: req.user.id },
    { $set: { status: req.body.status } },
    { returnDocument: "after" });
  if (!app) return res.status(404).json({ error: "Application not found." });
  req.app.get("io")?.to(`user:${app.student}`).emit("application:status", { id: app._id, status: app.status, jobTitle: app.jobTitle });
  res.json({ application: app });
});

export default router;