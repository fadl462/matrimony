const express = require("express");
const { z } = require("zod");
const { Op } = require("sequelize");

const { User, Match } = require("../models");
const { requireAuth } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { computeMatch, adjustWeightsFromFeedback } = require("../services/matching");
const audit = require("../utils/audit");

const router = express.Router();
router.use(requireAuth);

const actionSchema = z.object({
  targetUserId: z.string().uuid(),
  action: z.enum(["liked", "passed", "blocked"]),
});

// POST /match/action  { targetUserId, action }
// Records the action, feeds it back into the matching engine's per-user
// weights (see services/matching.js), and reports whether it created a
// mutual match.
router.post("/action", validate(actionSchema), async (req, res) => {
  const { targetUserId, action } = req.body;
  const userId = req.user.id;

  if (targetUserId === userId) {
    return res.status(400).json({ error: "Cannot act on your own profile" });
  }

  const include = ["profile", "preference", "horoscope", "interests"];
  const [me, target] = await Promise.all([
    User.findByPk(userId, { include }),
    User.findByPk(targetUserId, { include }),
  ]);
  if (!target) return res.status(404).json({ error: "Target user not found" });

  const { score, breakdown, variant } = await computeMatch(me, target);

  const [userAId, userBId] = [userId, targetUserId].sort();
  const isUserA = userAId === userId;

  let record = await Match.findOne({ where: { userAId, userBId } });

  if (record) {
    if (isUserA) record.userAAction = action;
    else record.userBAction = action;
  } else {
    record = Match.build({
      userAId,
      userBId,
      score,
      variant,
      breakdown: JSON.stringify(breakdown),
      userAAction: isUserA ? action : null,
      userBAction: isUserA ? null : action,
    });
  }

  record.mutualLike = record.userAAction === "liked" && record.userBAction === "liked";
  await record.save();

  await adjustWeightsFromFeedback(userId, breakdown, action);
  await audit.record({
    userId,
    action: `match_action_${action}`,
    metadata: { targetUserId, score },
  });

  res.json({ mutualLike: record.mutualLike, score });
});

// GET /match/mutual - members you and the other party both liked
router.get("/mutual", async (req, res) => {
  const userId = req.user.id;
  const matches = await Match.findAll({
    where: {
      mutualLike: true,
      [Op.or]: [{ userAId: userId }, { userBId: userId }],
    },
    order: [["updatedAt", "DESC"]],
    include: [
      { association: "userA", include: ["profile", "videoProfile"] },
      { association: "userB", include: ["profile", "videoProfile"] },
    ],
  });

  const results = matches.map((m) => {
    const other = m.userAId === userId ? m.userB : m.userA;
    return {
      matchId: m.id,
      score: m.score,
      otherUser: {
        id: other.id,
        profile: other.profile,
        videoAvailable: other.videoProfile?.status === "ready",
      },
      matchedAt: m.updatedAt,
    };
  });

  res.json({ results });
});

module.exports = router;
