require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const logger = require("./utils/logger");
const { errorHandler } = require("./middleware/errorHandler");
const { sequelize } = require("./models");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const searchRoutes = require("./routes/search");
const matchRoutes = require("./routes/match");
const messageRoutes = require("./routes/messages");
const videoRoutes = require("./routes/video");
const adminRoutes = require("./routes/admin");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(
  morgan(process.env.NODE_ENV === "production" ? "combined" : "dev", {
    stream: { write: (msg) => logger.info(msg.trim()) },
  })
);

// App-wide rate limit; auth.js layers a stricter one on top for login/signup.
const globalLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/match", matchRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/video", videoRoutes);
app.use("/api/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use(errorHandler);

const PORT = process.env.PORT || 4000;

// DEV/DEMO: sync() creates/updates tables from the models automatically so
// the prototype runs with zero manual migration steps. For production,
// replace this with versioned migrations (Sequelize CLI `sequelize-cli db:migrate`
// or an equivalent tool) — auto-sync against a live Postgres database with
// real user data is not safe practice.
async function start() {
  await sequelize.authenticate();
  await sequelize.sync();
  logger.info("database_synced", { dialect: sequelize.getDialect() });

  app.listen(PORT, () => {
    logger.info("server_started", { port: PORT, env: process.env.NODE_ENV });
  });
}

start().catch((err) => {
  logger.error("server_start_failed", { error: err.message });
  process.exit(1);
});

module.exports = app;
