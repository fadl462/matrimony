// Minimal structured logger. Swap for pino/winston in production if you want
// log shipping to something like Datadog/CloudWatch — the call sites below
// (`logger.info/warn/error`) won't need to change.
function log(level, message, meta = {}) {
  const entry = {
    level,
    message,
    ...meta,
    timestamp: new Date().toISOString(),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

module.exports = {
  info: (message, meta) => log("info", message, meta),
  warn: (message, meta) => log("warn", message, meta),
  error: (message, meta) => log("error", message, meta),
};
