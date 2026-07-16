const logger = require("../utils/logger");

/**
 * Verifies a provider token and returns a normalized profile.
 *
 * PRODUCTION NOTE: this prototype does NOT verify token signatures against
 * the provider's public keys, because that requires live GOOGLE_CLIENT_ID /
 * FACEBOOK_APP_ID credentials this environment doesn't have. Before going
 * live you must:
 *   - Google: use `google-auth-library`'s `OAuth2Client.verifyIdToken()`
 *     with GOOGLE_CLIENT_ID as the audience.
 *   - Facebook: call `GET https://graph.facebook.com/debug_token` with the
 *     app token to confirm the user token is valid and unexpired.
 * Skipping that step means anyone can forge a "verified" login — do not
 * ship the mock path below to production.
 */
async function verifyProviderToken(provider, token, mockProfile) {
  const hasRealCreds =
    (provider === "google" && process.env.GOOGLE_CLIENT_ID) ||
    (provider === "facebook" && process.env.FACEBOOK_APP_ID);

  if (!hasRealCreds) {
    logger.warn("oauth_mock_verification_used", { provider });
    // In the demo, the frontend sends the profile fields directly instead of
    // an opaque provider token, and we trust them ONLY because no real
    // credentials are configured. This branch must not exist in production.
    if (!mockProfile || !mockProfile.providerId || !mockProfile.email) {
      throw new Error("Mock OAuth profile missing providerId/email");
    }
    return {
      providerId: mockProfile.providerId,
      email: mockProfile.email,
      name: mockProfile.name || "New User",
    };
  }

  throw new Error(
    `Real ${provider} OAuth verification not implemented — add google-auth-library or the Graph API debug_token call here.`
  );
}

module.exports = { verifyProviderToken };
