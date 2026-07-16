const logger = require("../utils/logger");

// Must be registered LAST (after all routes). Catches anything thrown or
// passed to next(err), including multer file-size/type errors.
function errorHandler(err, req, res, next) {
  logger.error("unhandled_error", {
    message: err.message,
    path: req.path,
    method: req.method,
  });

  if (err.message && err.message.includes("Unsupported video format")) {
    return res.status(400).json({ error: err.message });
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "Video file too large" });
  }

  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === "production" && status === 500
      ? "Internal server error"
      : err.message;

  res.status(status).json({ error: message });
}

module.exports = { errorHandler };
