const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { z } = require("zod");
const rateLimit = require("express-rate-limit");

const { User, Profile, Preference, OAuthAccount, PhoneVerification } = require("../models");
const audit = require("../utils/audit");
const { validate } = require("../middleware/validate");
const { sendOtp } = require("../services/sms");
const { verifyProviderToken } = require("../services/oauth");

const router = express.Router();

// Tighter limiter for auth endpoints specifically (brute-force protection
// beyond the app-wide limiter in index.js).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later." },
});
router.use(authLimiter);

function issueToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function sanitizeUser(user) {
  const plain = user.toJSON ? user.toJSON() : user;
  const { passwordHash, ...safe } = plain;
  return safe;
}

// ---------------------------------------------------------------------------
// PATH 1: Email + password
// ---------------------------------------------------------------------------
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2),
});

router.post("/signup/email", validate(signupSchema), async (req, res) => {
  const { email, password, fullName } = req.body;

  const existing = await User.findOne({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS) || 12);

  const user = await User.create({ email, passwordHash, signupMethod: "EMAIL" });
  await Profile.create({
    userId: user.id,
    fullName,
    dateOfBirth: new Date("2000-01-01"), // placeholder until onboarding completes
    gender: "OTHER",
  });
  await Preference.create({ userId: user.id });

  await audit.record({ userId: user.id, action: "signup_email", ipAddress: req.ip });

  const token = issueToken(user);
  res.status(201).json({ token, user: sanitizeUser(user) });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post("/login/email", validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email } });

  // Same error for "no such user" and "wrong password" — don't leak which one.
  const invalid = () => res.status(401).json({ error: "Invalid email or password" });

  if (!user || !user.passwordHash) return invalid();
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return invalid();

  if (user.isSuspended) {
    return res.status(403).json({ error: "This account has been suspended" });
  }

  user.lastLoginAt = new Date();
  await user.save();
  await audit.record({ userId: user.id, action: "login_email", ipAddress: req.ip });

  const token = issueToken(user);
  res.json({ token, user: sanitizeUser(user) });
});

// ---------------------------------------------------------------------------
// PATH 2: Social OAuth (Google / Facebook)
// See services/oauth.js for the production-hardening note — this prototype
// verifies tokens in "mock" mode since no live provider credentials exist
// in this environment. Swap in real verification before launch.
// ---------------------------------------------------------------------------
const oauthSchema = z.object({
  provider: z.enum(["google", "facebook"]),
  token: z.string().optional(),
  // Present only in mock mode — the frontend's mock OAuth screen sends the
  // profile directly since there's no real provider to redirect to.
  mockProfile: z
    .object({
      providerId: z.string(),
      email: z.string().email(),
      name: z.string().optional(),
    })
    .optional(),
});

router.post("/oauth/callback", validate(oauthSchema), async (req, res) => {
  const { provider, token, mockProfile } = req.body;

  let profile;
  try {
    profile = await verifyProviderToken(provider, token, mockProfile);
  } catch (err) {
    return res.status(401).json({ error: `OAuth verification failed: ${err.message}` });
  }

  let oauthAccount = await OAuthAccount.findOne({
    where: { provider, providerId: profile.providerId },
  });

  let user;
  if (oauthAccount) {
    user = await User.findByPk(oauthAccount.userId);
  } else {
    // Link to an existing email account if one matches, otherwise create new.
    const existingByEmail = await User.findOne({ where: { email: profile.email } });

    if (existingByEmail) {
      user = existingByEmail;
    } else {
      user = await User.create({
        email: profile.email,
        signupMethod: provider === "google" ? "GOOGLE_OAUTH" : "FACEBOOK_OAUTH",
        isVerified: true, // provider already verified the email
      });
      await Profile.create({
        userId: user.id,
        fullName: profile.name || "New User",
        dateOfBirth: new Date("2000-01-01"),
        gender: "OTHER",
      });
      await Preference.create({ userId: user.id });
    }

    await OAuthAccount.create({ userId: user.id, provider, providerId: profile.providerId });
  }

  if (user.isSuspended) {
    return res.status(403).json({ error: "This account has been suspended" });
  }

  user.lastLoginAt = new Date();
  await user.save();
  await audit.record({ userId: user.id, action: `login_oauth_${provider}`, ipAddress: req.ip });

  const jwtToken = issueToken(user);
  res.json({ token: jwtToken, user: sanitizeUser(user) });
});

// ---------------------------------------------------------------------------
// PATH 3: Phone number verification (OTP)
// ---------------------------------------------------------------------------
const requestOtpSchema = z.object({
  phone: z.string().min(8, "Enter a valid phone number with country code"),
});

router.post("/phone/request-otp", validate(requestOtpSchema), async (req, res) => {
  const { phone } = req.body;

  let user = await User.findOne({ where: { phone } });
  if (!user) {
    user = await User.create({ phone, signupMethod: "PHONE" });
    await Profile.create({
      userId: user.id,
      fullName: "New User",
      dateOfBirth: new Date("2000-01-01"),
      gender: "OTHER",
    });
    await Preference.create({ userId: user.id });
  }

  const code = String(crypto.randomInt(100000, 999999));
  const otpHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const existingRecord = await PhoneVerification.findOne({ where: { userId: user.id } });
  if (existingRecord) {
    await existingRecord.update({ otpHash, expiresAt, attempts: 0, verified: false });
  } else {
    await PhoneVerification.create({ userId: user.id, otpHash, expiresAt });
  }

  await sendOtp(phone, code);
  await audit.record({ userId: user.id, action: "phone_otp_requested", ipAddress: req.ip });

  res.json({ message: "OTP sent", userId: user.id });
  // NOTE: in mock SMS mode the code is written to the server log (see
  // services/sms.js) so the flow is testable without a real phone.
});

const verifyOtpSchema = z.object({
  userId: z.string().uuid(),
  code: z.string().length(6),
});

router.post("/phone/verify-otp", validate(verifyOtpSchema), async (req, res) => {
  const { userId, code } = req.body;

  const record = await PhoneVerification.findOne({ where: { userId } });
  if (!record) return res.status(400).json({ error: "No OTP request found for this user" });

  if (record.verified) {
    return res.status(400).json({ error: "OTP already used, request a new one" });
  }
  if (record.expiresAt < new Date()) {
    return res.status(400).json({ error: "OTP expired, request a new one" });
  }
  if (record.attempts >= 5) {
    return res.status(429).json({ error: "Too many incorrect attempts, request a new OTP" });
  }

  const valid = await bcrypt.compare(code, record.otpHash);
  if (!valid) {
    record.attempts += 1;
    await record.save();
    return res.status(401).json({ error: "Incorrect code" });
  }

  record.verified = true;
  await record.save();

  const user = await User.findByPk(userId);
  user.isVerified = true;
  user.lastLoginAt = new Date();
  await user.save();

  await audit.record({ userId, action: "phone_otp_verified", ipAddress: req.ip });

  const token = issueToken(user);
  res.json({ token, user: sanitizeUser(user) });
});

module.exports = router;
