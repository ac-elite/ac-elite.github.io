#!/usr/bin/env node
/**
 * AC Elite — License & Safety Rating report
 *
 * Computes License (pace/skill) and Safety Rating (cleanliness) from rank.json,
 * then prints a short summary: tier distributions and top 10s.
 *
 * Usage:
 *   node scripts/license-and-safety.js [rank.json] [min-km] [car]
 *
 * Defaults: data/rank.json (same as website), 100 km, tatuusfa1
 *
 * Logic matches the website (index.html). All tunable values are in CONFIG below.
 */

const fs = require("fs");
const path = require("path");

// -----------------------------------------------------------------------------
// CONFIG — tune thresholds and formula here (keep in sync with index.html)
// -----------------------------------------------------------------------------

const CONFIG = {
  defaultRankPath: path.join(__dirname, "..", "data", "rank.json"),
  defaultMinKm: 100,
  defaultCar: "tatuusfa1",

  // Pace score: per-track leaderboard position + track weight + consistency bonus
  TRACK_MIN_DRIVERS: 5,
  TRACK_WEIGHT_BASE: 1.0,
  TRACK_WEIGHT_SCALE: 0.02,
  TRACK_WEIGHT_MAX: 2.0,
  POSITION_MULTIPLIERS: { 1: 2.0, 2: 1.7, 3: 1.5, 4: 1.3, 5: 1.2, 6: 1.1, 7: 1.1, 8: 1.1, 9: 1.1, 10: 1.1 },
  CONSISTENCY_BONUS_PER_TRACK: 2,
  CONSISTENCY_BONUS_MAX: 50,

  ROOKIE_KM_MAX: 100,

  LICENSE_TIERS: {
    Elite: { minKm: 6000, minScore: 3700, minTracks: 8 },
    "Diamond+": { minKm: 5000, minScore: 3100, minTracks: 6 },
    Diamond: { minKm: 5000, minScore: 2500, minTracks: 6 },
    "Platinum+": { minKm: 3500, minScore: 2000, minTracks: 5 },
    Platinum: { minKm: 3500, minScore: 1500, minTracks: 5 },
    "Gold+": { minKm: 2000, minScore: 1150, minTracks: 4 },
    Gold: { minKm: 2000, minScore: 800, minTracks: 4 },
    "Silver+": { minKm: 1000, minScore: 600, minTracks: 3 },
    Silver: { minKm: 1000, minScore: 400, minTracks: 3 },
    "Bronze+": { minKm: 100, minScore: 200 },
    Bronze: { minKm: 100, minScore: 0 },
  },

  SR_BASE: 1.0,
  SR_SCALE: 8.99,
  SR_MIN: 1.0,
  SR_MAX: 9.99,
  SR_START: 2.50,
  COLLISION_WEIGHT: 1.0,
  INFRACTION_WEIGHT: 2.0,

  SR_TIERS: [
    { name: "S", minSR: 3.0, minKm: 3000 },
    { name: "A1", minSR: 2.9, minKm: 2000 }, { name: "A2", minSR: 2.8, minKm: 2000 }, { name: "A3", minSR: 2.7, minKm: 2000 },
    { name: "B1", minSR: 2.6, minKm: 1500 }, { name: "B2", minSR: 2.5, minKm: 1500 }, { name: "B3", minSR: 2.4, minKm: 1500 },
    { name: "C1", minSR: 2.3, minKm: 1000 }, { name: "C2", minSR: 2.2, minKm: 1000 }, { name: "C3", minSR: 2.1, minKm: 1000 },
    { name: "D1", minSR: 2.0, minKm: 500 }, { name: "D2", minSR: 1.9, minKm: 500 }, { name: "D3", minSR: 1.8, minKm: 500 },
    { name: "E1", minSR: 1.7, minKm: 100 }, { name: "E2", minSR: 1.6, minKm: 100 }, { name: "E3", minSR: 1.5, minKm: 100 },
  ],
};

const LICENSE_TIER_ORDER = ["Elite", "Diamond+", "Diamond", "Platinum+", "Platinum", "Gold+", "Gold", "Silver+", "Silver", "Bronze+", "Bronze"];

// -----------------------------------------------------------------------------
// CLI & load data
// -----------------------------------------------------------------------------

const rankPath = process.argv[2] || CONFIG.defaultRankPath;
const MIN_KM = Number(process.argv[3]) || CONFIG.defaultMinKm;
const CAR = process.argv[4] || CONFIG.defaultCar;

if (!fs.existsSync(rankPath)) {
  console.error("File not found:", rankPath);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(fs.readFileSync(rankPath, "utf8"));
} catch (e) {
  console.error("Invalid JSON:", rankPath);
  process.exit(1);
}

if (!Array.isArray(data)) {
  console.error("Expected JSON array of drivers");
  process.exit(1);
}

// -----------------------------------------------------------------------------
// Safety Rating — incidents per 100 km → SR 1.00–9.99
// -----------------------------------------------------------------------------

function collisionsPer100km(d) {
  const km = d.kilometers || 0;
  return km <= 0 ? Infinity : ((d.collisions || d.crashes || 0) / km) * 100;
}

function infractionsPer100km(d) {
  const km = d.kilometers || 0;
  return km <= 0 ? Infinity : ((d.infr || 0) / km) * 100;
}

/** SR = 1 + 8.99 / (1 + weighted_incidents). Scale 1.00–9.99; 0 km → 2.50. */
function safetyRating(d) {
  const km = d.kilometers || 0;
  if (km <= 0) return CONFIG.SR_START;

  const c100 = collisionsPer100km(d);
  const i100 = infractionsPer100km(d);
  if (!isFinite(c100) || !isFinite(i100)) return CONFIG.SR_START;

  const weighted = c100 * CONFIG.COLLISION_WEIGHT + i100 * CONFIG.INFRACTION_WEIGHT;
  const sr = CONFIG.SR_BASE + CONFIG.SR_SCALE / (1 + weighted);
  return Math.min(CONFIG.SR_MAX, Math.max(CONFIG.SR_MIN, sr));
}

/** Current SR tier (requires min km). */
function getSRTier(sr, km) {
  for (const t of CONFIG.SR_TIERS) {
    if (sr >= t.minSR && km >= t.minKm) return t.name;
  }
  return "F";
}

/** Best SR tier this driver could get with more km (SR only). */
function getPotentialSRTier(sr) {
  for (const t of CONFIG.SR_TIERS) {
    if (sr >= t.minSR) return t.name;
  }
  return "F";
}

// -----------------------------------------------------------------------------
// License (pace) — leaderboard positions per track → pace score
// -----------------------------------------------------------------------------

/**
 * Build per-track leaderboards and compute pace score + track count per driver.
 * Only tracks with at least TRACK_MIN_DRIVERS count. Returns { paceScores, trackCounts, trackCount }.
 */
function computePaceScores(drivers) {
  const paceScores = new Array(drivers.length).fill(0);
  const trackCounts = new Array(drivers.length).fill(0);
  const tracks = new Set();

  drivers.forEach((d) => {
    const lb = d.leaderboard || {};
    Object.keys(lb).forEach((track) => {
      if (lb[track]?.[CAR]?.laptime != null) tracks.add(track);
    });
  });

  tracks.forEach((track) => {
    const entries = [];
    drivers.forEach((d, i) => {
      const lt = d.leaderboard?.[track]?.[CAR]?.laptime;
      if (lt == null) return;
      entries.push({ driverIndex: i, laptime: lt });
    });
    entries.sort((a, b) => a.laptime - b.laptime);

    const total = entries.length;
    if (total < CONFIG.TRACK_MIN_DRIVERS) return;

    const trackWeight = Math.min(
      CONFIG.TRACK_WEIGHT_MAX,
      CONFIG.TRACK_WEIGHT_BASE + (total - CONFIG.TRACK_MIN_DRIVERS) * CONFIG.TRACK_WEIGHT_SCALE
    );

    entries.forEach((entry, position) => {
      const pos1 = position + 1;
      const baseScore = total > 1 ? ((total - position) / total) * 100 : 100;
      const mult = CONFIG.POSITION_MULTIPLIERS[pos1] ?? 1.0;
      paceScores[entry.driverIndex] += baseScore * mult * trackWeight;
      trackCounts[entry.driverIndex]++;
    });
  });

  drivers.forEach((_, i) => {
    paceScores[i] += Math.min(CONFIG.CONSISTENCY_BONUS_MAX, trackCounts[i] * CONFIG.CONSISTENCY_BONUS_PER_TRACK);
  });

  return { paceScores, trackCounts, trackCount: tracks.size };
}

/** Assign highest qualifying license tier (km + score + minTracks). */
function assignLicenseTiers(drivers) {
  for (const d of drivers) {
    const km = d.kilometers || 0;
    const score = d._licenseScore ?? 0;
    const tracks = d._trackCount ?? 0;
    let license = "Bronze";

    for (const name of LICENSE_TIER_ORDER) {
      const tier = CONFIG.LICENSE_TIERS[name];
      const okTracks = tier.minTracks == null || tracks >= tier.minTracks;
      if (km >= tier.minKm && score >= tier.minScore && okTracks) {
        license = name;
        break;
      }
    }
    d._license = license;

    let potential = "Bronze";
    for (const name of LICENSE_TIER_ORDER) {
      if (score >= CONFIG.LICENSE_TIERS[name].minScore) {
        potential = name;
        break;
      }
    }
    d._potentialLicense = potential;
  }
}

// -----------------------------------------------------------------------------
// Pipeline: score → enrich → assign tiers
// -----------------------------------------------------------------------------

const { paceScores, trackCounts, trackCount } = computePaceScores(data);

const qualified = data
  .map((d, i) => ({
    ...d,
    _i: i,
    _licenseScore: (d.kilometers || 0) >= MIN_KM ? (paceScores[i] ?? 0) : -1,
    _trackCount: trackCounts[i] ?? 0,
    _sr: safetyRating(d),
    _c100: collisionsPer100km(d),
  }))
  .filter((d) => (d.kilometers || 0) >= MIN_KM);

qualified.forEach((d) => {
  const km = d.kilometers || 0;
  d._srTier = getSRTier(d._sr, km);
  d._potentialSRTier = getPotentialSRTier(d._sr);
  d._i100 = isFinite(infractionsPer100km(d)) ? infractionsPer100km(d) : 0;
});

const enriched = [...qualified].sort((a, b) => b._licenseScore - a._licenseScore);
assignLicenseTiers(enriched);

const rookies = data.filter((d) => (d.kilometers || 0) < CONFIG.ROOKIE_KM_MAX);
const byLicense = [...enriched].sort((a, b) => b._licenseScore - a._licenseScore);
const bySR = [...enriched].sort((a, b) => b._sr - a._sr);

// -----------------------------------------------------------------------------
// Output
// -----------------------------------------------------------------------------

const SEP = "-".repeat(40);

console.log("");
console.log("Data: " + data.length + " drivers, " + trackCount + " tracks, " + enriched.length + " qualified (>= " + MIN_KM + " km)");
console.log("");

// License distribution
const licCounts = { Elite: 0, "Diamond+": 0, Diamond: 0, "Platinum+": 0, Platinum: 0, "Gold+": 0, Gold: 0, "Silver+": 0, Silver: 0, "Bronze+": 0, Bronze: 0, Rookie: 0 };
enriched.forEach((d) => { licCounts[d._license] = (licCounts[d._license] || 0) + 1; });
licCounts.Rookie = rookies.length;

console.log("LICENSE DISTRIBUTION");
console.log(SEP);
["Elite", "Diamond+", "Diamond", "Platinum+", "Platinum", "Gold+", "Gold", "Silver+", "Silver", "Bronze+", "Bronze", "Rookie"].forEach((t) =>
  console.log("  " + t.padEnd(12) + String(licCounts[t] ?? 0).padStart(5))
);

// SR distribution
const srCounts = {};
CONFIG.SR_TIERS.forEach((t) => (srCounts[t.name] = 0));
srCounts.F = 0;
data.forEach((d) => {
  const t = getSRTier(safetyRating(d), d.kilometers || 0);
  srCounts[t] = (srCounts[t] || 0) + 1;
});

console.log("");
console.log("SAFETY RATING DISTRIBUTION");
console.log(SEP);
CONFIG.SR_TIERS.forEach((t) => console.log("  " + t.name.padEnd(4) + String(srCounts[t.name] ?? 0).padStart(5)));
console.log("  F   " + String(srCounts.F ?? 0).padStart(5));

// Top 10 by License
console.log("");
console.log("TOP 10 BY LICENSE");
console.log(SEP);
byLicense.slice(0, 10).forEach((d, i) => {
  const lic = (d._license || "-").padEnd(10);
  const scr = (d._licenseScore ?? 0).toFixed(0).padStart(5);
  const srT = d._srTier || "F";
  console.log((i + 1).toString().padStart(2) + ". " + (d.name || "?").slice(0, 18).padEnd(18) + " " + lic + " " + scr + " pts  SR " + d._sr.toFixed(2) + " (" + srT + ")");
});

// Top 10 by SR (min 1000 km), show current tier and potential (e.g. C1>S)
console.log("");
console.log("TOP 10 BY SAFETY RATING (min 1000 km)");
console.log(SEP);
const bySRFiltered = bySR.filter((d) => (d.kilometers || 0) >= 1000);
bySRFiltered.slice(0, 10).forEach((d, i) => {
  const srT = d._srTier || "F";
  const pot = d._potentialSRTier || srT;
  const tierStr = srT === pot ? srT.padEnd(5) : (srT + ">" + pot).padEnd(5);
  const kmStr = ((d.kilometers || 0) / 1000).toFixed(1) + "k";
  console.log((i + 1).toString().padStart(2) + ". " + (d.name || "?").slice(0, 18).padEnd(18) + " SR " + d._sr.toFixed(2) + " (" + tierStr + ")  " + (d._c100 ?? 0).toFixed(1).padStart(4) + " c/100km  " + kmStr.padStart(6));
});

console.log("");
