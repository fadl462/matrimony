const express = require("express");
const { z } = require("zod");
const { Op } = require("sequelize");

const { User, Profile, HoroscopeDetails, Interest } = require("../models");
const { requireAuth } = require("../middleware/auth");
const { haversineKm, computeMatch } = require("../services/matching");

const router = express.Router();
router.use(requireAuth);

const searchSchema = z.object({
  minAge: z.coerce.number().int().min(18).optional(),
  maxAge: z.coerce.number().int().max(100).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  city: z.string().optional(),
  maxDistanceKm: z.coerce.number().int().min(1).max(20000).optional(),
  interests: z.string().optional(), // CSV
  religion: z.string().optional(),
  moonSign: z.string().optional(),
  manglikStatus: z.enum(["yes", "no", "unknown"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

// GET /search?minAge=25&maxAge=35&city=Accra&interests=music,travel&moonSign=Leo
router.get("/", async (req, res) => {
  const parsed = searchSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query params", details: parsed.error.flatten() });
  }
  const q = parsed.data;

  const me = await User.findByPk(req.user.id, {
    include: ["profile", "preference", "horoscope", "interests"],
  });
  if (!me?.profile) {
    return res.status(400).json({ error: "Complete your profile before searching" });
  }

  const userWhere = {
    id: { [Op.ne]: req.user.id },
    isActive: true,
    isSuspended: false,
  };

  const profileWhere = {};
  if (q.gender) profileWhere.gender = q.gender;
  if (q.city) profileWhere.city = { [Op.substring]: q.city };
  if (q.religion) profileWhere.religion = q.religion;

  if (q.minAge || q.maxAge) {
    const now = new Date();
    const dob = {};
    // older DOB = younger age; maxAge -> earliest birth date bound, etc.
    if (q.maxAge) dob[Op.gte] = new Date(now.getFullYear() - q.maxAge - 1, now.getMonth(), now.getDate());
    if (q.minAge) dob[Op.lte] = new Date(now.getFullYear() - q.minAge, now.getMonth(), now.getDate());
    profileWhere.dateOfBirth = dob;
  }

  const horoscopeWhere = {};
  if (q.moonSign) horoscopeWhere.moonSign = q.moonSign;
  if (q.manglikStatus) horoscopeWhere.manglikStatus = q.manglikStatus;

  const includes = [
    { association: "profile", where: Object.keys(profileWhere).length ? profileWhere : undefined, required: true },
    { association: "horoscope", where: Object.keys(horoscopeWhere).length ? horoscopeWhere : undefined, required: Object.keys(horoscopeWhere).length > 0 },
    { association: "videoProfile", required: false },
    { association: "interests", required: false },
  ];

  if (q.interests) {
    const list = q.interests.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (list.length) {
      includes[3] = { association: "interests", where: { name: { [Op.in]: list } }, required: true };
    }
  }

  // Fetch a candidate pool, then score+sort in application code (the
  // weighted score isn't expressible as a single SQL ORDER BY). At real
  // scale, pre-filter harder in SQL (this WHERE already does that) and
  // consider a background job that maintains the Match table incrementally
  // instead of recomputing on every request — see the Postgres/PostGIS note
  // in the project README for pushing the distance filter into the DB too.
  let candidates = await User.findAll({
    where: userWhere,
    include: includes,
    limit: 300, // candidate pool cap before scoring/pagination
  });

  // When we filtered by interests above, `interests` on each result only
  // contains the MATCHING interests (Sequelize include-where behavior) —
  // reload each candidate's full interest list for accurate Jaccard scoring.
  if (q.interests) {
    const ids = candidates.map((c) => c.id);
    const full = await User.findAll({
      where: { id: { [Op.in]: ids } },
      include: ["profile", "horoscope", "videoProfile", "interests"],
    });
    const byId = new Map(full.map((u) => [u.id, u]));
    candidates = candidates.map((c) => byId.get(c.id));
  }

  let scored = await Promise.all(
    candidates.map(async (candidate) => {
      const result = await computeMatch(me, candidate);
      const distanceKm = haversineKm(
        me.profile.latitude,
        me.profile.longitude,
        candidate.profile.latitude,
        candidate.profile.longitude
      );
      return { candidate, ...result, distanceKm };
    })
  );

  if (q.maxDistanceKm) {
    scored = scored.filter((s) => s.distanceKm === null || s.distanceKm <= q.maxDistanceKm);
  }

  scored.sort((a, b) => b.score - a.score);

  const start = (q.page - 1) * q.pageSize;
  const pageItems = scored.slice(start, start + q.pageSize);

  res.json({
    total: scored.length,
    page: q.page,
    pageSize: q.pageSize,
    results: pageItems.map((s) => ({
      id: s.candidate.id,
      score: s.score,
      breakdown: s.breakdown,
      variant: s.variant,
      distanceKm: s.distanceKm === null ? null : Math.round(s.distanceKm),
      profile: s.candidate.profile,
      interests: s.candidate.interests.map((i) => i.name),
      videoAvailable: s.candidate.videoProfile?.status === "ready",
    })),
  });
});

module.exports = router;
