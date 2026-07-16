const { AuditLog } = require("../models");
const logger = require("./logger");

/**
 * Records an auditable event. Used for security-sensitive actions
 * (login, password change, admin actions, report filing) so there's
 * a trail independent of application logs — this table is what an
 * auditor or incident responder would query first.
 */
async function record({ userId = null, action, metadata = {}, ipAddress = null }) {
  try {
    await AuditLog.create({
      userId,
      action,
      metadata: JSON.stringify(metadata),
      ipAddress,
    });
  } catch (err) {
    // Auditing must never crash the request path; log and move on.
    logger.error("audit_log_write_failed", { action, error: err.message });
  }
}

module.exports = { record };
