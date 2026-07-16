const express = require("express");
const { z } = require("zod");
const { Op } = require("sequelize");

const { Match, Message } = require("../models");
const { requireAuth } = require("../middleware/auth");
const { validate } = require("../middleware/validate");

const router = express.Router();
router.use(requireAuth);

async function isMutualMatch(userId, otherId) {
  const [userAId, userBId] = [userId, otherId].sort();
  const match = await Match.findOne({ where: { userAId, userBId } });
  return Boolean(match?.mutualLike);
}

const sendSchema = z.object({
  receiverId: z.string().uuid(),
  body: z.string().min(1).max(4000),
});

router.post("/", validate(sendSchema), async (req, res) => {
  const senderId = req.user.id;
  const { receiverId, body } = req.body;

  // Messaging gated behind a mutual match — mirrors how most matrimony
  // platforms prevent unsolicited contact and reduce harassment reports.
  const allowed = await isMutualMatch(senderId, receiverId);
  if (!allowed) {
    return res.status(403).json({ error: "You can only message members you've mutually matched with" });
  }

  const message = await Message.create({ senderId, receiverId, body });
  res.status(201).json(message);
});

router.get("/thread/:otherUserId", async (req, res) => {
  const userId = req.user.id;
  const { otherUserId } = req.params;

  const allowed = await isMutualMatch(userId, otherUserId);
  if (!allowed) {
    return res.status(403).json({ error: "No mutual match with this member" });
  }

  const messages = await Message.findAll({
    where: {
      [Op.or]: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    },
    order: [["createdAt", "ASC"]],
    limit: 200,
  });

  await Message.update(
    { readAt: new Date() },
    { where: { senderId: otherUserId, receiverId: userId, readAt: null } }
  );

  res.json({ messages });
});

router.get("/inbox", async (req, res) => {
  const userId = req.user.id;
  const messages = await Message.findAll({
    where: { [Op.or]: [{ senderId: userId }, { receiverId: userId }] },
    order: [["createdAt", "DESC"]],
    limit: 100,
    include: [
      { association: "sender", include: ["profile"] },
      { association: "receiver", include: ["profile"] },
    ],
  });

  // Collapse to most-recent message per conversation partner.
  const byPartner = new Map();
  for (const m of messages) {
    const partner = m.senderId === userId ? m.receiver : m.sender;
    if (!byPartner.has(partner.id)) {
      byPartner.set(partner.id, {
        partnerId: partner.id,
        partnerName: partner.profile?.fullName,
        lastMessage: m.body,
        lastMessageAt: m.createdAt,
        unread: m.receiverId === userId && !m.readAt,
      });
    }
  }

  res.json({ conversations: Array.from(byPartner.values()) });
});

module.exports = router;
