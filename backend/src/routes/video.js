const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const { VideoProfile } = require("../models");
const { requireAuth } = require("../middleware/auth");
const logger = require("../utils/logger");

const router = express.Router();
router.use(requireAuth);

const uploadDir = process.env.VIDEO_UPLOAD_DIR || "./uploads/videos";
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".mp4";
    cb(null, `${req.user.id}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: (Number(process.env.MAX_VIDEO_MB) || 100) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["video/mp4", "video/quicktime", "video/webm"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Unsupported video format — use MP4, MOV, or WebM"));
    }
    cb(null, true);
  },
});

/**
 * PRODUCTION NOTE: this stores the raw upload to local disk and marks it
 * "ready" immediately, which is fine for a prototype but wrong for a real
 * deployment where you'd want to:
 *   1. Upload to S3 / Cloud Storage (VIDEO_STORAGE=s3), not local disk that
 *      won't survive redeploys and won't scale across instances.
 *   2. Push to a transcoding queue (e.g. AWS MediaConvert, ffmpeg worker) to
 *      produce a compressed, multi-bitrate (HLS/DASH) version — "compressed
 *      and optimized for bandwidth" isn't achievable by just storing the
 *      original file.
 *   3. Run content moderation (AWS Rekognition or similar) before setting
 *      status to "ready", given this is public-facing user-generated video.
 * The status field and moderationFlag exist specifically so that pipeline
 * can slot in without changing the API contract below.
 */
router.post("/upload", upload.single("video"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No video file provided" });

  const existing = await VideoProfile.findOne({ where: { userId: req.user.id } });
  if (existing) {
    // Replace: remove old file from disk before overwriting the DB row.
    try {
      if (fs.existsSync(existing.originalPath)) fs.unlinkSync(existing.originalPath);
    } catch (err) {
      logger.warn("old_video_cleanup_failed", { error: err.message });
    }
    await existing.update({
      originalPath: req.file.path,
      sizeBytes: req.file.size,
      status: "processing",
      moderationFlag: false,
    });
  }

  const videoProfile =
    existing || (await VideoProfile.create({
      userId: req.user.id,
      originalPath: req.file.path,
      sizeBytes: req.file.size,
      status: "processing",
    }));

  // Simulated async processing step. In production this would be a queue
  // job (see note above); here it just flips status after a short delay so
  // the frontend polling flow has something real to poll against.
  setTimeout(async () => {
    try {
      const row = await VideoProfile.findOne({ where: { userId: req.user.id } });
      if (row) await row.update({ status: "ready", compressedPath: req.file.path });
    } catch (err) {
      logger.error("video_processing_failed", { error: err.message });
    }
  }, 4000);

  res.status(202).json({ message: "Video uploaded, processing started", videoProfile });
});

router.get("/status", async (req, res) => {
  const videoProfile = await VideoProfile.findOne({ where: { userId: req.user.id } });
  if (!videoProfile) return res.status(404).json({ error: "No video profile uploaded" });
  res.json(videoProfile);
});

router.delete("/", async (req, res) => {
  const videoProfile = await VideoProfile.findOne({ where: { userId: req.user.id } });
  if (!videoProfile) return res.status(404).json({ error: "No video profile to delete" });

  try {
    if (fs.existsSync(videoProfile.originalPath)) fs.unlinkSync(videoProfile.originalPath);
  } catch (err) {
    logger.warn("video_delete_cleanup_failed", { error: err.message });
  }
  await videoProfile.destroy();
  res.status(204).send();
});

// Streams a member's video with HTTP range support so the frontend <video>
// element can seek without downloading the whole file first.
router.get("/stream/:userId", async (req, res) => {
  const videoProfile = await VideoProfile.findOne({ where: { userId: req.params.userId } });
  if (!videoProfile || videoProfile.status !== "ready" || videoProfile.moderationFlag) {
    return res.status(404).json({ error: "Video not available" });
  }

  const filePath = videoProfile.compressedPath || videoProfile.originalPath;
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Video file missing" });

  const stat = fs.statSync(filePath);
  const range = req.headers.range;

  if (!range) {
    res.writeHead(200, { "Content-Length": stat.size, "Content-Type": "video/mp4" });
    return fs.createReadStream(filePath).pipe(res);
  }

  const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
  const start = parseInt(startStr, 10);
  const end = endStr ? parseInt(endStr, 10) : stat.size - 1;
  const chunkSize = end - start + 1;

  res.writeHead(206, {
    "Content-Range": `bytes ${start}-${end}/${stat.size}`,
    "Accept-Ranges": "bytes",
    "Content-Length": chunkSize,
    "Content-Type": "video/mp4",
  });
  fs.createReadStream(filePath, { start, end }).pipe(res);
});

module.exports = router;
