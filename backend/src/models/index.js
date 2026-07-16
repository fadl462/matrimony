const { DataTypes, Sequelize } = require("sequelize");
const sequelize = require("../db/sequelize");

// NOTE: for a larger codebase you'd split each model into its own file
// under src/models/*.js. Kept in one file here for a small, easy-to-scan
// prototype — the schema itself (fields, relations, indexes) is what matters
// for review, and it's identical either way.

const User = sequelize.define(
  "User",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email: { type: DataTypes.STRING, unique: true, allowNull: true },
    phone: { type: DataTypes.STRING, unique: true, allowNull: true },
    passwordHash: { type: DataTypes.STRING, allowNull: true },
    signupMethod: {
      type: DataTypes.ENUM("EMAIL", "GOOGLE_OAUTH", "FACEBOOK_OAUTH", "PHONE"),
      defaultValue: "EMAIL",
    },
    role: { type: DataTypes.ENUM("MEMBER", "MODERATOR", "ADMIN"), defaultValue: "MEMBER" },
    isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    isSuspended: { type: DataTypes.BOOLEAN, defaultValue: false },
    lastLoginAt: { type: DataTypes.DATE, allowNull: true },
  },
  { indexes: [{ fields: ["role"] }, { fields: ["isActive"] }] }
);

const Profile = sequelize.define("Profile", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  fullName: { type: DataTypes.STRING, allowNull: false },
  dateOfBirth: { type: DataTypes.DATE, allowNull: false },
  gender: { type: DataTypes.ENUM("MALE", "FEMALE", "OTHER"), allowNull: false },
  bio: DataTypes.TEXT,
  city: DataTypes.STRING,
  region: DataTypes.STRING,
  country: DataTypes.STRING,
  latitude: DataTypes.FLOAT,
  longitude: DataTypes.FLOAT,
  religion: DataTypes.STRING,
  motherTongue: DataTypes.STRING,
  education: DataTypes.STRING,
  profession: DataTypes.STRING,
  incomeRangeKey: DataTypes.STRING,
  height_cm: DataTypes.INTEGER,
  photoUrl: DataTypes.STRING,
  profileComplete: { type: DataTypes.BOOLEAN, defaultValue: false },
});

const OAuthAccount = sequelize.define(
  "OAuthAccount",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    provider: DataTypes.STRING,
    providerId: DataTypes.STRING,
    accessToken: DataTypes.STRING,
  },
  { indexes: [{ unique: true, fields: ["provider", "providerId"] }] }
);

const PhoneVerification = sequelize.define("PhoneVerification", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  otpHash: DataTypes.STRING,
  expiresAt: DataTypes.DATE,
  attempts: { type: DataTypes.INTEGER, defaultValue: 0 },
  verified: { type: DataTypes.BOOLEAN, defaultValue: false },
});

const Interest = sequelize.define("Interest", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, unique: true, allowNull: false },
});

const Preference = sequelize.define("Preference", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  minAge: DataTypes.INTEGER,
  maxAge: DataTypes.INTEGER,
  maxDistanceKm: DataTypes.INTEGER,
  preferredGenders: DataTypes.STRING,
  preferredReligion: DataTypes.STRING,
  horoscopeMatchRequired: { type: DataTypes.BOOLEAN, defaultValue: false },
  weightInterests: { type: DataTypes.FLOAT, defaultValue: 1.0 },
  weightLocation: { type: DataTypes.FLOAT, defaultValue: 1.0 },
  weightHoroscope: { type: DataTypes.FLOAT, defaultValue: 1.0 },
  weightEducation: { type: DataTypes.FLOAT, defaultValue: 0.5 },
  weightLifestyle: { type: DataTypes.FLOAT, defaultValue: 0.5 },
});

const HoroscopeDetails = sequelize.define("HoroscopeDetails", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  birthTime: DataTypes.STRING,
  birthPlace: DataTypes.STRING,
  moonSign: DataTypes.STRING,
  star: DataTypes.STRING,
  manglikStatus: DataTypes.STRING,
  gunaScore: DataTypes.INTEGER,
});

const VideoProfile = sequelize.define("VideoProfile", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  originalPath: { type: DataTypes.STRING, allowNull: false },
  compressedPath: DataTypes.STRING,
  status: { type: DataTypes.STRING, defaultValue: "processing" },
  durationSec: DataTypes.INTEGER,
  sizeBytes: DataTypes.INTEGER,
  moderationFlag: { type: DataTypes.BOOLEAN, defaultValue: false },
});

const Match = sequelize.define(
  "Match",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userAId: { type: DataTypes.UUID, allowNull: false },
    userBId: { type: DataTypes.UUID, allowNull: false },
    score: { type: DataTypes.FLOAT, allowNull: false },
    variant: { type: DataTypes.STRING, defaultValue: "v1_default_weights" },
    breakdown: DataTypes.TEXT, // JSON string
    userAAction: DataTypes.STRING,
    userBAction: DataTypes.STRING,
    mutualLike: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    indexes: [
      { unique: true, fields: ["userAId", "userBId"] },
      { fields: ["userAId", "score"] },
      { fields: ["userBId", "score"] },
    ],
  }
);

const Message = sequelize.define(
  "Message",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    senderId: { type: DataTypes.UUID, allowNull: false },
    receiverId: { type: DataTypes.UUID, allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    readAt: DataTypes.DATE,
  },
  { indexes: [{ fields: ["senderId", "receiverId"] }, { fields: ["receiverId", "readAt"] }] }
);

const Report = sequelize.define(
  "Report",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    reporterId: { type: DataTypes.UUID, allowNull: false },
    reportedId: { type: DataTypes.UUID, allowNull: false },
    reason: { type: DataTypes.STRING, allowNull: false },
    details: DataTypes.TEXT,
    status: {
      type: DataTypes.ENUM("OPEN", "REVIEWING", "RESOLVED", "DISMISSED"),
      defaultValue: "OPEN",
    },
    resolvedAt: DataTypes.DATE,
  },
  { indexes: [{ fields: ["status"] }] }
);

const AdminAction = sequelize.define(
  "AdminAction",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    adminId: { type: DataTypes.UUID, allowNull: false },
    actionType: { type: DataTypes.STRING, allowNull: false },
    targetType: { type: DataTypes.STRING, allowNull: false },
    targetId: { type: DataTypes.STRING, allowNull: false },
    notes: DataTypes.TEXT,
  },
  { indexes: [{ fields: ["actionType"] }] }
);

const AuditLog = sequelize.define(
  "AuditLog",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: true },
    action: { type: DataTypes.STRING, allowNull: false },
    metadata: DataTypes.TEXT, // JSON string
    ipAddress: DataTypes.STRING,
  },
  { indexes: [{ fields: ["action"] }, { fields: ["createdAt"] }] }
);

// ---------------------------------------------------------------------------
// Associations
// ---------------------------------------------------------------------------
User.hasOne(Profile, { as: "profile", foreignKey: "userId", onDelete: "CASCADE" });
Profile.belongsTo(User, { foreignKey: "userId" });

User.hasMany(OAuthAccount, { as: "oauthAccounts", foreignKey: "userId", onDelete: "CASCADE" });
OAuthAccount.belongsTo(User, { foreignKey: "userId" });

User.hasOne(PhoneVerification, { as: "phoneVerification", foreignKey: "userId", onDelete: "CASCADE" });
PhoneVerification.belongsTo(User, { foreignKey: "userId" });

User.hasOne(Preference, { as: "preference", foreignKey: "userId", onDelete: "CASCADE" });
Preference.belongsTo(User, { foreignKey: "userId" });

User.hasOne(HoroscopeDetails, { as: "horoscope", foreignKey: "userId", onDelete: "CASCADE" });
HoroscopeDetails.belongsTo(User, { foreignKey: "userId" });

User.hasOne(VideoProfile, { as: "videoProfile", foreignKey: "userId", onDelete: "CASCADE" });
VideoProfile.belongsTo(User, { foreignKey: "userId" });

// Many-to-many User <-> Interest through UserInterest join table
User.belongsToMany(Interest, { as: "interests", through: "UserInterest", foreignKey: "userId", otherKey: "interestId" });
Interest.belongsToMany(User, { as: "users", through: "UserInterest", foreignKey: "interestId", otherKey: "userId" });

Message.belongsTo(User, { as: "sender", foreignKey: "senderId" });
Message.belongsTo(User, { as: "receiver", foreignKey: "receiverId" });

Match.belongsTo(User, { as: "userA", foreignKey: "userAId" });
Match.belongsTo(User, { as: "userB", foreignKey: "userBId" });

Report.belongsTo(User, { as: "reporter", foreignKey: "reporterId" });
Report.belongsTo(User, { as: "reported", foreignKey: "reportedId" });

AdminAction.belongsTo(User, { as: "admin", foreignKey: "adminId" });

AuditLog.belongsTo(User, { foreignKey: "userId" });

module.exports = {
  sequelize,
  Sequelize,
  User,
  Profile,
  OAuthAccount,
  PhoneVerification,
  Interest,
  Preference,
  HoroscopeDetails,
  VideoProfile,
  Match,
  Message,
  Report,
  AdminAction,
  AuditLog,
};
