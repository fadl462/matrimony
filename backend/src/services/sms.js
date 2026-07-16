const logger = require("../utils/logger");

/**
 * Pluggable SMS sender. In "mock" mode (default, no Twilio credentials
 * required) the OTP is written to the server log instead of a real phone,
 * so the whole phone-verification flow is testable end-to-end locally.
 *
 * To go live: set SMS_PROVIDER=twilio and fill TWILIO_* in .env. Swap the
 * body of the "twilio" branch for the real `twilio` npm client — the call
 * site (routes/auth.js) never needs to change.
 */
async function sendOtp(phoneNumber, code) {
  const provider = process.env.SMS_PROVIDER || "mock";

  if (provider === "mock") {
    logger.info("mock_sms_sent", { phoneNumber, code });
    return { success: true, provider: "mock" };
  }

  if (provider === "twilio") {
    // Real implementation would be:
    //   const twilio = require("twilio")(accountSid, authToken);
    //   await twilio.messages.create({ body: `Your code is ${code}`, from: TWILIO_FROM_NUMBER, to: phoneNumber });
    // Left unimplemented here since it needs real Twilio credentials.
    throw new Error(
      "Twilio provider selected but not implemented in this prototype. Add credentials and the twilio SDK call above."
    );
  }

  throw new Error(`Unknown SMS_PROVIDER: ${provider}`);
}

module.exports = { sendOtp };
