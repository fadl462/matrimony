require("dotenv").config();
const bcrypt = require("bcryptjs");
const {
  sequelize, User, Profile, Preference, HoroscopeDetails, Interest,
} = require("../models");

const INTERESTS = [
  "music", "travel", "cooking", "reading", "football", "fitness",
  "movies", "photography", "hiking", "yoga", "art", "dancing",
];

const DEMO_PROFILES = [
  { fullName: "Ama Owusu", email: "ama@example.com", city: "Accra", country: "Ghana", lat: 5.6037, lon: -0.1870, religion: "Christian", education: "MBA", gender: "FEMALE", moonSign: "Leo", manglik: "no", interests: ["music", "travel", "cooking"] },
  { fullName: "Kwame Mensah", email: "kwame@example.com", city: "Accra", country: "Ghana", lat: 5.5600, lon: -0.2050, religion: "Christian", education: "BSc Engineering", gender: "MALE", moonSign: "Leo", manglik: "no", interests: ["football", "fitness", "movies"] },
  { fullName: "Efua Asante", email: "efua@example.com", city: "Kumasi", country: "Ghana", lat: 6.6885, lon: -1.6244, religion: "Christian", education: "BA Sociology", gender: "FEMALE", moonSign: "Virgo", manglik: "unknown", interests: ["reading", "yoga", "art"] },
  { fullName: "Priya Sharma", email: "priya@example.com", city: "Mumbai", country: "India", lat: 19.0760, lon: 72.8777, religion: "Hindu", education: "MBA", gender: "FEMALE", moonSign: "Leo", manglik: "yes", interests: ["dancing", "travel", "photography"] },
  { fullName: "Rahul Verma", email: "rahul@example.com", city: "Mumbai", country: "India", lat: 19.2183, lon: 72.9781, religion: "Hindu", education: "MBA", gender: "MALE", moonSign: "Leo", manglik: "yes", interests: ["hiking", "photography", "movies"] },
];

async function main() {
  await sequelize.sync();

  console.log("Seeding interests...");
  const interestMap = {};
  for (const name of INTERESTS) {
    const [rec] = await Interest.findOrCreate({ where: { name }, defaults: { name } });
    interestMap[name] = rec;
  }

  console.log("Seeding demo member accounts...");
  const passwordHash = await bcrypt.hash("Password123!", 10);

  for (const p of DEMO_PROFILES) {
    const existing = await User.findOne({ where: { email: p.email } });
    if (existing) continue;

    const user = await User.create({
      email: p.email,
      passwordHash,
      signupMethod: "EMAIL",
      isVerified: true,
    });

    await Profile.create({
      userId: user.id,
      fullName: p.fullName,
      dateOfBirth: new Date(1993, 4, 12),
      gender: p.gender,
      city: p.city,
      country: p.country,
      latitude: p.lat,
      longitude: p.lon,
      religion: p.religion,
      education: p.education,
      profileComplete: true,
    });

    await Preference.create({ userId: user.id });
    await HoroscopeDetails.create({
      userId: user.id,
      moonSign: p.moonSign,
      manglikStatus: p.manglik,
      gunaScore: 28,
    });

    await user.setInterests(p.interests.map((i) => interestMap[i]));
  }

  console.log("Seeding admin account...");
  const adminEmail = "admin@matrimony.local";
  const existingAdmin = await User.findOne({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const admin = await User.create({
      email: adminEmail,
      passwordHash: await bcrypt.hash("AdminPass123!", 10),
      signupMethod: "EMAIL",
      role: "ADMIN",
      isVerified: true,
    });
    await Profile.create({
      userId: admin.id,
      fullName: "Platform Admin",
      dateOfBirth: new Date(1990, 0, 1),
      gender: "OTHER",
    });
    await Preference.create({ userId: admin.id });
  }

  console.log("Seed complete.");
  console.log("Demo login: ama@example.com / Password123! (and others, see seed.js)");
  console.log("Admin login: admin@matrimony.local / AdminPass123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await sequelize.close();
  });
