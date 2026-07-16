const { Preference } = require("../models");

/**
 * MATCHING ENGINE
 * ----------------
 * Produces a 0-100 compatibility score between two users from five weighted
 * dimensions: interests overlap, location proximity, horoscope compatibility,
 * education/profession affinity, and lifestyle (religion/mother tongue) fit.
 *
 * "Learns preferences over time": every explicit like/pass is implicit
 * feedback. adjustWeightsFromFeedback() nudges a user's per-dimension weights
 * toward whichever dimensions were high-scoring on profiles they liked and
 * low-scoring on profiles they passed — a lightweight online learning rule
 * (not a neural net), which is honest about what's feasible without training
 * data volume, but genuinely adapts search ranking per-user over time.
 *
 * A/B TESTING: DEFAULT_VARIANTS defines named weight presets. assignVariant()
 * deterministically buckets a user into one (stable across sessions via hash
 * of userId), and every computed Match row stores which variant produced it,
 * so you can later compare mutual-like rate or message-reply rate by variant.
 */

const DEFAULT_VARIANTS = {
  v1_default_weights: {
    interests: 1.0,
    location: 1.0,
    horoscope: 1.0,
    education: 0.5,
    lifestyle: 0.5,
  },
  v2_location_heavy: {
    interests: 0.7,
    location: 1.6,
    horoscope: 0.8,
    education: 0.4,
    lifestyle: 0.5,
  },
  v3_horoscope_heavy: {
    interests: 0.6,
    location: 0.8,
    horoscope: 1.8,
    education: 0.3,
    lifestyle: 0.5,
  },
};

function assignVariant(userId) {
  const variants = Object.keys(DEFAULT_VARIANTS);
  let hash = 0;
  for (const ch of userId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return variants[hash % variants.length];
}

function haversineKm(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some((v) => v === null || v === undefined)) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function scoreInterests(interestsA, interestsB) {
  if (!interestsA.length || !interestsB.length) return 0;
  const setB = new Set(interestsB);
  const overlap = interestsA.filter((i) => setB.has(i)).length;
  const union = new Set([...interestsA, ...interestsB]).size;
  return union === 0 ? 0 : (overlap / union) * 100; // Jaccard similarity, 0-100
}

function scoreLocation(profileA, profileB, maxDistanceKm = 200) {
  const distance = haversineKm(
    profileA.latitude,
    profileA.longitude,
    profileB.latitude,
    profileB.longitude
  );
  if (distance === null) return 50; // unknown location -> neutral score
  if (distance <= 0) return 100;
  const score = 100 * (1 - Math.min(distance, maxDistanceKm) / maxDistanceKm);
  return Math.max(0, score);
}

// Simplified horoscope compatibility. Real Vedic matching (Ashtakoot/guna
// milan) needs a proper panchang engine; this heuristic uses declared moon
// sign relationship + manglik status as a stand-in and is clearly labeled
// as such in the UI, not presented as authoritative astrological analysis.
function scoreHoroscope(horoA, horoB) {
  if (!horoA || !horoB) return 50;
  let score = 50;
  if (horoA.moonSign && horoB.moonSign) {
    score += horoA.moonSign === horoB.moonSign ? 15 : 5;
  }
  if (horoA.manglikStatus && horoB.manglikStatus) {
    const bothManglik = horoA.manglikStatus === "yes" && horoB.manglikStatus === "yes";
    const bothNonManglik = horoA.manglikStatus === "no" && horoB.manglikStatus === "no";
    const mismatch = horoA.manglikStatus !== horoB.manglikStatus &&
      (horoA.manglikStatus === "yes" || horoB.manglikStatus === "yes");
    if (bothManglik || bothNonManglik) score += 25;
    else if (mismatch) score -= 20;
  }
  if (horoA.gunaScore && horoB.gunaScore) {
    const avgGuna = (horoA.gunaScore + horoB.gunaScore) / 2;
    score += (avgGuna / 36) * 10; // guna milan traditionally scored out of 36
  }
  return Math.max(0, Math.min(100, score));
}

function scoreEducation(profileA, profileB) {
  if (!profileA.education || !profileB.education) return 50;
  return profileA.education === profileB.education ? 90 : 55;
}

function scoreLifestyle(profileA, profileB) {
  let score = 50;
  let signals = 0;
  if (profileA.religion && profileB.religion) {
    signals++;
    score += profileA.religion === profileB.religion ? 25 : -10;
  }
  if (profileA.motherTongue && profileB.motherTongue) {
    signals++;
    score += profileA.motherTongue === profileB.motherTongue ? 15 : 0;
  }
  return Math.max(0, Math.min(100, signals ? score : 50));
}

/**
 * Computes a full weighted match score and per-dimension breakdown for two
 * users, using userA's preference weights (asymmetric by design — A's
 * search results should reflect A's stated priorities).
 */
async function computeMatch(userA, userB) {
  const weights = userA.preference
    ? {
        interests: userA.preference.weightInterests,
        location: userA.preference.weightLocation,
        horoscope: userA.preference.weightHoroscope,
        education: userA.preference.weightEducation,
        lifestyle: userA.preference.weightLifestyle,
      }
    : DEFAULT_VARIANTS[assignVariant(userA.id)];

  const interestsA = userA.interests.map((i) => i.name);
  const interestsB = userB.interests.map((i) => i.name);

  const dims = {
    interests: scoreInterests(interestsA, interestsB),
    location: scoreLocation(userA.profile, userB.profile, userA.preference?.maxDistanceKm || 200),
    horoscope: scoreHoroscope(userA.horoscope, userB.horoscope),
    education: scoreEducation(userA.profile, userB.profile),
    lifestyle: scoreLifestyle(userA.profile, userB.profile),
  };

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
  const weightedSum = Object.keys(dims).reduce(
    (sum, key) => sum + dims[key] * weights[key],
    0
  );
  const finalScore = Math.round((weightedSum / totalWeight) * 100) / 100;

  return {
    score: finalScore,
    breakdown: dims,
    variant: userA.preference ? "custom_weights" : assignVariant(userA.id),
  };
}

/**
 * Online learning step: nudge a user's dimension weights based on one
 * explicit action (like/pass) on a candidate whose breakdown we already
 * computed. Small, bounded step size so weights drift gradually rather than
 * overfitting to a single swipe.
 */
async function adjustWeightsFromFeedback(userId, breakdown, action) {
  const STEP = 0.03;
  const MIN_W = 0.1;
  const MAX_W = 2.5;
  const direction = action === "liked" ? 1 : action === "passed" ? -1 : 0;
  if (direction === 0) return;

  const pref = await Preference.findOne({ where: { userId } });
  if (!pref) return;

  // Dimensions that scored *above* the average for this candidate get
  // reinforced on a like (they likely explain why the user liked it), or
  // suppressed on a pass. This is a coarse but genuinely adaptive signal.
  const avg =
    Object.values(breakdown).reduce((a, b) => a + b, 0) / Object.values(breakdown).length;

  const clamp = (v) => Math.max(MIN_W, Math.min(MAX_W, v));
  await pref.update({
    weightInterests: clamp(
      pref.weightInterests + direction * STEP * Math.sign(breakdown.interests - avg)
    ),
    weightLocation: clamp(
      pref.weightLocation + direction * STEP * Math.sign(breakdown.location - avg)
    ),
    weightHoroscope: clamp(
      pref.weightHoroscope + direction * STEP * Math.sign(breakdown.horoscope - avg)
    ),
    weightEducation: clamp(
      pref.weightEducation + direction * STEP * Math.sign(breakdown.education - avg)
    ),
    weightLifestyle: clamp(
      pref.weightLifestyle + direction * STEP * Math.sign(breakdown.lifestyle - avg)
    ),
  });
}

module.exports = {
  DEFAULT_VARIANTS,
  assignVariant,
  haversineKm,
  computeMatch,
  adjustWeightsFromFeedback,
};
