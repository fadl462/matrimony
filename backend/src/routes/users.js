const express = require("express");
const { z } = require("zod");

const { User, Profile, Preference, HoroscopeDetails, Interest, VideoProfile } = require("../models");
const { requireAuth } = require("../middleware/auth");
const { validate } = require("../middleware/validate");

const router = express.Router();
router.use(requireAuth);

async function fullUser(userId) {
  return User.findByPk(userId, {
    include: ["profile", "preference", "horoscope", "videoProfile", "interests"],
  });
}

router.get("/me", async (req, res) => {
  const user = await fullUser(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  const { passwordHash, ...safe } = user.toJSON();
  res.json(safe);
});

const profileSchema = z.object({
  fullName: z.string().min(2).optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  bio: z.string().max(2000).optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  religion: z.string().optional(),
  motherTongue: z.string().optional(),
  education: z.string().optional(),
  profession: z.string().optional(),
  incomeRangeKey: z.string().optional(),
  height_cm: z.number().int().min(100).max(250).optional(),
});

router.put("/me/profile", validate(profileSchema), async (req, res) => {
  const data = { ...req.body };
  if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth);

  let profile = await Profile.findOne({ where: { userId: req.user.id } });
  if (profile) {
    await profile.update(data);
  } else {
    profile = await Profile.create({
      userId: req.user.id,
      fullName: data.fullName || "Member",
      dateOfBirth: data.dateOfBirth || new Date("2000-01-01"),
      gender: data.gender || "OTHER",
      ...data,
    });
  }

  // Mark complete once the essentials are in — used by the frontend to
  // gate access to search/matching until onboarding is meaningfully done.
  const isComplete = Boolean(
    profile.fullName && profile.city && profile.gender && profile.education
  );
  if (isComplete !== profile.profileComplete) {
    profile.profileComplete = isComplete;
    await profile.save();
  }

  res.json(profile);
});

const preferenceSchema = z.object({
  minAge: z.number().int().min(18).optional(),
  maxAge: z.number().int().max(100).optional(),
  maxDistanceKm: z.number().int().min(1).optional(),
  preferredGenders: z.string().optional(), // CSV, e.g. "MALE,FEMALE"
  preferredReligion: z.string().optional(),
  horoscopeMatchRequired: z.boolean().optional(),
  weightInterests: z.number().min(0).max(3).optional(),
  weightLocation: z.number().min(0).max(3).optional(),
  weightHoroscope: z.number().min(0).max(3).optional(),
  weightEducation: z.number().min(0).max(3).optional(),
  weightLifestyle: z.number().min(0).max(3).optional(),
});

router.put("/me/preferences", validate(preferenceSchema), async (req, res) => {
  let preference = await Preference.findOne({ where: { userId: req.user.id } });
  if (preference) {
    await preference.update(req.body);
  } else {
    preference = await Preference.create({ userId: req.user.id, ...req.body });
  }
  res.json(preference);
});

const horoscopeSchema = z.object({
  birthTime: z.string().optional(),
  birthPlace: z.string().optional(),
  moonSign: z.string().optional(),
  star: z.string().optional(),
  manglikStatus: z.enum(["yes", "no", "unknown"]).optional(),
  gunaScore: z.number().int().min(0).max(36).optional(),
});

router.put("/me/horoscope", validate(horoscopeSchema), async (req, res) => {
  let horoscope = await HoroscopeDetails.findOne({ where: { userId: req.user.id } });
  if (horoscope) {
    await horoscope.update(req.body);
  } else {
    horoscope = await HoroscopeDetails.create({ userId: req.user.id, ...req.body });
  }
  res.json(horoscope);
});

const interestsSchema = z.object({
  interests: z.array(z.string().min(2).max(50)).max(20),
});

router.put("/me/interests", validate(interestsSchema), async (req, res) => {
  const { interests } = req.body;
  const normalized = interests.map((name) => name.toLowerCase().trim());

  // Ensure each interest tag exists, then replace the user's set entirely
  // (simplest semantics for a "select your interests" UI).
  const interestRecords = await Promise.all(
    normalized.map(async (name) => {
      const [rec] = await Interest.findOrCreate({ where: { name }, defaults: { name } });
      return rec;
    })
  );

  const user = await User.findByPk(req.user.id);
  await user.setInterests(interestRecords); // Sequelize magic method from belongsToMany "interests" alias

  res.json({ interests: interestRecords.map((i) => i.name) });
});

// Public-ish view of another member's profile (still requires auth, but
// omits sensitive fields the owner sees on their own /me).
router.get("/:id", async (req, res) => {
  const user = await User.findByPk(req.params.id, {
    include: ["profile", "videoProfile", "interests"],
  });
  if (!user || !user.isActive) return res.status(404).json({ error: "User not found" });

  res.json({
    id: user.id,
    profile: user.profile,
    videoProfile: user.videoProfile
      ? { status: user.videoProfile.status, durationSec: user.videoProfile.durationSec }
      : null,
    interests: user.interests.map((i) => i.name),
  });
});

module.exports = router;
