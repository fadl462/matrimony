const express = require("express");
const { z } = require("zod");
const { Op, fn, col } = require("sequelize");

const { User, Match, Message, Report, VideoProfile, AdminAction } = require("../models");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");
const { validate } = require("../middleware/validate");
const audit = require("../utils/audit");

const router = express.Router();
router.use(requireAuth, requireRole("ADMIN", "MODERATOR"));

// ---------------------------------------------------------------------------
// Analytics — the numbers an admin dashboard's home page needs
// ---------------------------------------------------------------------------
router.get("/analytics/overview", async (req, res) => {
  const [
    totalUsers,
    verifiedUsers,
    suspendedUsers,
    newUsersLast7d,
    totalMatches,
    mutualMatches,
    totalMessages,
    openReports,
    videosPending,
  ] = await Promise.all([
    User.count(),
    User.count({ where: { isVerified: true } }),
    User.count({ where: { isSuspended: true } }),
    User.count({ where: { createdAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 3600 * 1000) } } }),
    Match.count(),
    Match.count({ where: { mutualLike: true } }),
    Message.count(),
    Report.count({ where: { status: "OPEN" } }),
    VideoProfile.count({ where: { status: "processing" } }),
  ]);

  const signupBreakdownRaw = await User.findAll({
    attributes: ["signupMethod", [fn("COUNT", col("id")), "count"]],
    group: ["signupMethod"],
    raw: true,
  });

  res.json({
    totalUsers,
    verifiedUsers,
    suspendedUsers,
    newUsersLast7d,
    totalMatches,
    mutualMatches,
    mutualMatchRate: totalMatches ? Number((mutualMatches / totalMatches).toFixed(3)) : 0,
    totalMessages,
    openReports,
    videosPending,
    signupBreakdown: signupBreakdownRaw.map((s) => ({
      method: s.signupMethod,
      count: Number(s.count),
    })),
  });
});

// A/B test performance — mutual-match rate per matching-engine variant.
// This is exactly the hook the brief asked for: tunable weighting + A/B
// testing hooks, surfaced somewhere a product manager can actually read it.
router.get("/analytics/ab-tests", async (req, res) => {
  const variants = await Match.findAll({
    attributes: ["variant", [fn("COUNT", col("id")), "total"]],
    group: ["variant"],
    raw: true,
  });

  const results = await Promise.all(
    variants.map(async (v) => {
      const mutual = await Match.count({ where: { variant: v.variant, mutualLike: true } });
      const total = Number(v.total);
      return {
        variant: v.variant,
        totalMatches: total,
        mutualMatches: mutual,
        mutualRate: total ? Number((mutual / total).toFixed(3)) : 0,
      };
    })
  );

  res.json({ results });
});

// ---------------------------------------------------------------------------
// User management / moderation
// ---------------------------------------------------------------------------
const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().optional(), // search by email/phone
  suspended: z.coerce.boolean().optional(),
});

router.get("/users", async (req, res) => {
  const parsed = listUsersSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Invalid query" });
  const { page, pageSize, q, suspended } = parsed.data;

  const where = {};
  if (typeof suspended === "boolean") where.isSuspended = suspended;
  if (q) where[Op.or] = [{ email: { [Op.substring]: q } }, { phone: { [Op.substring]: q } }];

  const { rows: users, count: total } = await User.findAndCountAll({
    where,
    include: ["profile"],
    order: [["createdAt", "DESC"]],
    offset: (page - 1) * pageSize,
    limit: pageSize,
  });

  res.json({
    total,
    page,
    pageSize,
    users: users.map((u) => {
      const { passwordHash, ...safe } = u.toJSON();
      return safe;
    }),
  });
});

const suspendSchema = z.object({ suspend: z.boolean(), notes: z.string().optional() });

router.post("/users/:id/suspend", validate(suspendSchema), async (req, res) => {
  const { id } = req.params;
  const { suspend, notes } = req.body;

  const user = await User.findByPk(id);
  if (!user) return res.status(404).json({ error: "User not found" });
  user.isSuspended = suspend;
  await user.save();

  await AdminAction.create({
    adminId: req.user.id,
    actionType: suspend ? "suspend_user" : "unsuspend_user",
    targetType: "user",
    targetId: id,
    notes,
  });
  await audit.record({
    userId: req.user.id,
    action: suspend ? "admin_suspend_user" : "admin_unsuspend_user",
    metadata: { targetId: id },
  });

  res.json({ id: user.id, isSuspended: user.isSuspended });
});

router.post("/users/:id/verify", async (req, res) => {
  const { id } = req.params;
  const user = await User.findByPk(id);
  if (!user) return res.status(404).json({ error: "User not found" });
  user.isVerified = true;
  await user.save();

  await AdminAction.create({
    adminId: req.user.id,
    actionType: "verify_user",
    targetType: "user",
    targetId: id,
  });
  res.json({ id: user.id, isVerified: user.isVerified });
});

// ---------------------------------------------------------------------------
// Reports (user-filed) — moderation queue
// ---------------------------------------------------------------------------
router.get("/reports", async (req, res) => {
  const status = req.query.status;
  const reports = await Report.findAll({
    where: status ? { status } : undefined,
    order: [["createdAt", "DESC"]],
    include: [
      { association: "reporter", include: ["profile"] },
      { association: "reported", include: ["profile"] },
    ],
    limit: 100,
  });
  res.json({ reports });
});

const resolveReportSchema = z.object({
  status: z.enum(["REVIEWING", "RESOLVED", "DISMISSED"]),
  notes: z.string().optional(),
});

router.post("/reports/:id/resolve", validate(resolveReportSchema), async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  const report = await Report.findByPk(id);
  if (!report) return res.status(404).json({ error: "Report not found" });

  report.status = status;
  report.resolvedAt = ["RESOLVED", "DISMISSED"].includes(status) ? new Date() : null;
  await report.save();

  await AdminAction.create({
    adminId: req.user.id,
    actionType: "resolve_report",
    targetType: "report",
    targetId: id,
    notes,
  });

  res.json(report);
});

// ---------------------------------------------------------------------------
// Video moderation queue
// ---------------------------------------------------------------------------
router.get("/videos/pending", async (req, res) => {
  const videos = await VideoProfile.findAll({
    where: { [Op.or]: [{ status: "processing" }, { moderationFlag: true }] },
    include: [{ association: "User", include: ["profile"] }],
    order: [["createdAt", "DESC"]],
  });
  res.json({ videos });
});

const moderateVideoSchema = z.object({ action: z.enum(["approve", "remove"]) });

router.post("/videos/:userId/moderate", validate(moderateVideoSchema), async (req, res) => {
  const { userId } = req.params;
  const { action } = req.body;

  const video = await VideoProfile.findOne({ where: { userId } });
  if (!video) return res.status(404).json({ error: "Video not found" });

  if (action === "approve") {
    video.status = "ready";
    video.moderationFlag = false;
    await video.save();
    await AdminAction.create({
      adminId: req.user.id,
      actionType: "approve_video",
      targetType: "video",
      targetId: userId,
    });
    return res.json(video);
  }

  video.status = "failed";
  video.moderationFlag = true;
  await video.save();
  await AdminAction.create({
    adminId: req.user.id,
    actionType: "remove_video",
    targetType: "video",
    targetId: userId,
  });
  res.json(video);
});

module.exports = router;
