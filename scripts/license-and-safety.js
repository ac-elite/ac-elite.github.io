/**
 * LFM-style: License (speed/skill) + Safety Rating (cleanliness). One script to test.
 * Usage: node scripts/license-and-safety.js [path-to-rank.json] [min-km] [car]
 *
 * UPDATED: Now uses FULL leaderboard data for accurate pace calculation:
 * - Pace score based on position percentage per track (not just top10/top3)
 * - More accurate Safety Rating with weighted factors
 *
 * All tunable values are in the CONFIG block below. Tell me what to change and I'll update them.
 */
const fs = require("fs");
const path = require("path");

// ============ CONFIG (tunable - give me values to adjust) ============
const CONFIG = {
  // Input
  defaultRankPath: path.join(__dirname, "..", "rank.json"),
  defaultMinKm: 100,
  defaultCar: "tatuusfa1",

  // ========== NEW PACE FORMULA (full leaderboard) ==========
  // Pace score per track = position-based points (higher = better position)
  // Points = (1 - (position-1)/total_drivers) * 100 * trackWeight
  // So P1 gets ~100 points, last place gets ~0 points, middle gets ~50
  
  // Track weight based on participation (more drivers = more competitive = more weight)
  TRACK_MIN_DRIVERS: 5,           // Minimum drivers needed on track to count
  TRACK_WEIGHT_BASE: 1.0,         // Base weight for tracks with min drivers
  TRACK_WEIGHT_SCALE: 0.02,       // Extra weight per driver above minimum (max capped)
  TRACK_WEIGHT_MAX: 2.0,          // Maximum track weight multiplier
  
  // Position score multipliers (bonus for top positions)
  POSITION_MULTIPLIERS: {
    1: 2.0,      // P1 gets 2x score
    2: 1.7,      // P2 gets 1.7x
    3: 1.5,      // P3 gets 1.5x
    4: 1.3,      // P4 gets 1.3x
    5: 1.2,      // P5 gets 1.2x
    6: 1.1,      // P6-10 get 1.1x
    7: 1.1,
    8: 1.1,
    9: 1.1,
    10: 1.1,
  },
  
  // Consistency bonus: bonus for having times on many tracks
  CONSISTENCY_BONUS_PER_TRACK: 2,   // Points per track with a valid time
  CONSISTENCY_BONUS_MAX: 50,        // Maximum consistency bonus
  
  // Legacy weights (still used for display/stats)
  TOP10_WEIGHT: 10,
  TOP3_WEIGHT: 15,

  // License: everyone gets a tier. Rookie = under ROOKIE_KM_MAX.
  // KM determines the MAXIMUM tier you can achieve (eligibility), not the score itself.
  // Score is pure pace - no km multiplier penalty anymore!
  ROOKIE_KM_MAX: 100, // under this km = Rookie

  // LICENSE TIERS: km = eligibility gate, score = minimum pace score required
  // If you have enough km AND enough score, you get that tier
  LICENSE_TIERS: {
    Master:   { minKm: 6000, minScore: 3700 },   // Top tier: need 6000km AND high pace
    Diamond:  { minKm: 5000, minScore: 2500 },   // Need 5000km AND good pace
    Platinum: { minKm: 3500, minScore: 1500 },   // Need 3500km AND decent pace
    Gold:     { minKm: 2000, minScore: 800 },    // Need 2000km
    Silver:   { minKm: 1000, minScore: 400 },    // Need 1000km
    Bronze:   { minKm: 100,  minScore: 0 },      // Just need 100km (qualified)
  },

  // ========== IMPROVED SAFETY RATING ==========
  // Base formula: SR = base + (scale / (1 + weighted_incident_rate))
  // Weighted incident rate = collisions/100km * collision_weight + infractions/100km * infr_weight
  
  SR_BASE: 1.0,
  SR_SCALE: 8.99,
  SR_MIN: 1.0,
  SR_MAX: 9.99,
  
  // Incident weights (tune these based on severity)
  COLLISION_WEIGHT: 1.0,          // Base weight for collisions
  INFRACTION_WEIGHT: 2.0,         // Infractions are more serious (intentional/reckless)
  
  // Note: We removed experience smoothing - SR is calculated purely on incident rate
  // The tier system handles experience requirements (min km for higher tiers)

  // SAFETY RATING TIERS: km = eligibility gate, minSR = minimum SR required
  // Same principle: km determines MAX tier you can achieve, SR determines if you qualify
  // Adjusted to have ~10-15 drivers in S tier with current data
  SR_TIERS: [
    { name: "S", minSR: 3.0, minKm: 6000 },  // Excellent: need 6000km AND clean (~3 crashes/100km) - ~10 drivers
    { name: "A", minSR: 2.7, minKm: 5000 },  // Very Good: need 5000km (~4 crashes/100km)
    { name: "B", minSR: 2.4, minKm: 3500 },  // Good: need 3500km (~5 crashes/100km)
    { name: "C", minSR: 2.1, minKm: 2000 },  // Average: need 2000km (~6 crashes/100km)
    { name: "D", minSR: 1.8, minKm: 1000 },  // Below Average: need 1000km (~8 crashes/100km)
    { name: "E", minSR: 1.5, minKm: 100 },   // Poor: just need 100km (~10+ crashes/100km)
  ],
  // F = default (SR < 1.5 OR under 100km = Rookie/dangerous)
};
// ============ end CONFIG ============

const rankPath = process.argv[2] || CONFIG.defaultRankPath;
const MIN_KM = Number(process.argv[3]) || CONFIG.defaultMinKm;
const CAR = process.argv[4] || CONFIG.defaultCar;
const ROOKIE_KM_MAX = CONFIG.ROOKIE_KM_MAX;
const LICENSE_TIERS = CONFIG.LICENSE_TIERS;
const SR_TIERS = CONFIG.SR_TIERS;

if (!fs.existsSync(rankPath)) {
  console.error("File not found:", rankPath);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(rankPath, "utf8"));
if (!Array.isArray(data)) {
  console.error("Expected JSON array of drivers");
  process.exit(1);
}

// ========== HELPER FUNCTIONS ==========

function crashesPer100km(d) {
  const km = d.kilometers || 0;
  if (km <= 0) return Infinity;
  return ((d.collisions || 0) / km) * 100;
}

function infractionsPer100km(d) {
  const km = d.kilometers || 0;
  if (km <= 0) return Infinity;
  return ((d.infr || 0) / km) * 100;
}

// No more km ladder penalty - pure pace score!
// km only determines tier eligibility, not the score itself

/**
 * IMPROVED Safety Rating calculation
 * - Takes into account both collisions AND infractions
 * - NO smoothing - we show the raw calculated SR
 * - Weighted incident rate for more accurate cleanliness assessment
 */
function safetyRating(d) {
  const km = d.kilometers || 0;
  if (km <= 0) return CONFIG.SR_MIN;
  
  // Calculate weighted incident rate per 100km
  const c100 = crashesPer100km(d);
  const i100 = infractionsPer100km(d);
  
  // Handle Infinity cases
  if (!isFinite(c100) || !isFinite(i100)) return CONFIG.SR_MIN;
  
  const weightedIncidents = (c100 * CONFIG.COLLISION_WEIGHT) + (i100 * CONFIG.INFRACTION_WEIGHT);
  
  // SR calculation: SR = base + scale / (1 + incidents)
  // This gives: 0 incidents -> SR 9.99, high incidents -> SR approaches 1.0
  const sr = CONFIG.SR_BASE + CONFIG.SR_SCALE / (1 + weightedIncidents);
  
  return Math.min(CONFIG.SR_MAX, Math.max(CONFIG.SR_MIN, sr));
}

/**
 * Get RAW Safety Rating - same as safetyRating now (no smoothing)
 */
function safetyRatingRaw(d) {
  return safetyRating(d);
}

/**
 * NEW: Assign license tier based on km eligibility + pace score threshold.
 * km determines the MAXIMUM tier you can achieve.
 * Score determines if you actually qualify for that tier.
 * No percentiles - pure skill-based!
 */
function assignLicenseTiers(drivers) {
  const tierOrder = ["Master", "Diamond", "Platinum", "Gold", "Silver", "Bronze"];
  
  for (const d of drivers) {
    const km = d.kilometers || 0;
    const score = d._licenseScore || 0;
    
    // Find the highest tier this driver qualifies for
    let assignedTier = "Bronze"; // default
    for (const tierName of tierOrder) {
      const tier = LICENSE_TIERS[tierName];
      if (km >= tier.minKm && score >= tier.minScore) {
        assignedTier = tierName;
        break; // Found highest qualifying tier
      }
    }
    d._license = assignedTier;
    
    // Also store what tier they COULD reach with more km (potential)
    let potentialTier = "Bronze";
    for (const tierName of tierOrder) {
      const tier = LICENSE_TIERS[tierName];
      if (score >= tier.minScore) {
        potentialTier = tierName;
        break;
      }
    }
    d._potentialLicense = potentialTier;
    d._kmNeededForPotential = LICENSE_TIERS[potentialTier]?.minKm || 0;
  }
}

function getSRTier(sr, km) {
  for (const t of SR_TIERS) {
    if (sr >= t.minSR && km >= t.minKm) return t.name;
  }
  return "F";
}

// Get potential SR tier (what they could achieve with more km)
function getPotentialSRTier(sr) {
  for (const t of SR_TIERS) {
    if (sr >= t.minSR) return t.name;
  }
  return "F";
}

/**
 * NEW: Build FULL leaderboard data for ALL positions (not just top 10/3)
 * Returns pace score per driver based on their position percentage on each track
 */
function computeFullLeaderboardScores(drivers) {
  const paceScores = new Array(drivers.length).fill(0);
  const trackCounts = new Array(drivers.length).fill(0); // tracks with valid time
  const top10PerDriver = new Array(drivers.length).fill(0);
  const top3PerDriver = new Array(drivers.length).fill(0);
  const positionDetails = new Array(drivers.length).fill(null).map(() => []); // detailed per-track info
  
  // Collect all tracks
  const tracks = new Set();
  drivers.forEach((d) => {
    const lb = d.leaderboard || {};
    Object.keys(lb).forEach((track) => {
      if (lb[track] && lb[track][CAR] && lb[track][CAR].laptime != null) {
        tracks.add(track);
      }
    });
  });
  
  // Process each track
  tracks.forEach((track) => {
    const entries = [];
    drivers.forEach((d, i) => {
      const carData = d.leaderboard?.[track]?.[CAR];
      if (!carData || carData.laptime == null) return;
      entries.push({ 
        driverIndex: i, 
        laptime: carData.laptime,
        laps: carData.laps || 0
      });
    });
    
    // Sort by laptime (fastest first)
    entries.sort((a, b) => a.laptime - b.laptime);
    
    const totalDriversOnTrack = entries.length;
    
    // Skip tracks with too few drivers (not competitive enough)
    if (totalDriversOnTrack < CONFIG.TRACK_MIN_DRIVERS) return;
    
    // Calculate track weight (more drivers = more competitive)
    const extraDrivers = totalDriversOnTrack - CONFIG.TRACK_MIN_DRIVERS;
    const trackWeight = Math.min(
      CONFIG.TRACK_WEIGHT_MAX,
      CONFIG.TRACK_WEIGHT_BASE + (extraDrivers * CONFIG.TRACK_WEIGHT_SCALE)
    );
    
    // Assign scores based on position
    entries.forEach((entry, position) => {
      const pos1Based = position + 1; // 1-indexed position
      
      // Base score: percentage-based (P1 = 100%, last = ~0%)
      // Using inverse percentage: (total - position) / (total - 1) * 100
      // This gives P1 = 100, P2 = slightly less, last = 0
      const baseScore = totalDriversOnTrack > 1 
        ? ((totalDriversOnTrack - position) / totalDriversOnTrack) * 100
        : 100;
      
      // Position multiplier for top positions
      const multiplier = CONFIG.POSITION_MULTIPLIERS[pos1Based] || 1.0;
      
      // Final score for this track
      const trackScore = baseScore * multiplier * trackWeight;
      
      paceScores[entry.driverIndex] += trackScore;
      trackCounts[entry.driverIndex]++;
      
      // Legacy top10/top3 counts
      if (pos1Based <= 3) top3PerDriver[entry.driverIndex]++;
      if (pos1Based <= 10) top10PerDriver[entry.driverIndex]++;
      
      // Store detailed position info
      positionDetails[entry.driverIndex].push({
        track,
        position: pos1Based,
        total: totalDriversOnTrack,
        score: trackScore,
        laptime: entry.laptime
      });
    });
  });
  
  // Add consistency bonus
  drivers.forEach((d, i) => {
    const bonus = Math.min(
      CONFIG.CONSISTENCY_BONUS_MAX,
      trackCounts[i] * CONFIG.CONSISTENCY_BONUS_PER_TRACK
    );
    paceScores[i] += bonus;
  });
  
  return { 
    paceScores, 
    trackCounts, 
    top10PerDriver, 
    top3PerDriver, 
    positionDetails,
    trackCount: tracks.size 
  };
}

// Legacy function for backward compatibility (still used for display)
function computeLeaderboardCounts(drivers) {
  const top10PerDriver = new Array(drivers.length).fill(0);
  const top3PerDriver = new Array(drivers.length).fill(0);
  const tracks = new Set();
  drivers.forEach((d) => {
    const lb = d.leaderboard || {};
    Object.keys(lb).forEach((track) => {
      if (lb[track] && lb[track][CAR] && lb[track][CAR].laptime != null) tracks.add(track);
    });
  });
  tracks.forEach((track) => {
    const entries = [];
    drivers.forEach((d, i) => {
      const carData = d.leaderboard?.[track]?.[CAR];
      if (!carData || carData.laptime == null) return;
      entries.push({ i, laptime: carData.laptime });
    });
    entries.sort((a, b) => a.laptime - b.laptime);
    entries.slice(0, 3).forEach((e) => top3PerDriver[e.i]++);
    entries.slice(0, 10).forEach((e) => top10PerDriver[e.i]++);
  });
  return { top10PerDriver, top3PerDriver, trackCount: tracks.size };
}

// Compute FULL leaderboard scores (new accurate method)
const fullLeaderboard = computeFullLeaderboardScores(data);
const { paceScores, trackCounts, top10PerDriver, top3PerDriver, positionDetails, trackCount } = fullLeaderboard;

/**
 * NEW: License score based on FULL leaderboard position data
 * Pure pace score - NO km penalty! km only determines tier eligibility.
 */
function licenseScore(d, driverIndex) {
  const km = d.kilometers || 0;
  if (km < MIN_KM) return -1;
  
  // Use the full pace score calculated from all leaderboard positions
  // NO km multiplier - pure pace!
  return paceScores[driverIndex] || 0;
}

// Qualified = 100+ km; Rookie = under 100 km (everyone has a license)
const filtered = data
  .map((d, i) => ({ 
    ...d, 
    _i: i, 
    _top10: top10PerDriver[i], 
    _top3: top3PerDriver[i],
    _trackCount: trackCounts[i],
    _paceScore: paceScores[i]
  }))
  .filter((d) => (d.kilometers || 0) >= MIN_KM);

const qualified = filtered.map((d) => {
  const km = d.kilometers || 0;
  const licScore = licenseScore(d, d._i);
  const sr = safetyRating(d);
  const i100 = infractionsPer100km(d);
  return {
    ...d,
    _licenseScore: licScore,
    _sr: sr,
    _srTier: getSRTier(sr, km),
    _potentialSRTier: getPotentialSRTier(sr),  // What they could achieve with more km
    _c100: crashesPer100km(d),
    _i100: isFinite(i100) ? i100 : 0,
  };
});

// Assign license tiers based on km eligibility + score threshold
const qualifiedSorted = [...qualified].sort((a, b) => b._licenseScore - a._licenseScore);
assignLicenseTiers(qualifiedSorted);

const enriched = qualifiedSorted; // all have _license set
const rookies = data.filter((d) => (d.kilometers || 0) < ROOKIE_KM_MAX); // Rookie = under 100 km

const byLicense = [...enriched].sort((a, b) => b._licenseScore - a._licenseScore);
const bySR = [...enriched].sort((a, b) => b._sr - a._sr);

// ---- Output (English) ----
console.log("Reading", rankPath);
console.log("Tracks (car " + CAR + "):", trackCount);
console.log("Qualified drivers (>=" + MIN_KM + " km):", enriched.length);
console.log("");
console.log("=".repeat(80));
console.log("--- LICENSE (speed/skill: PURE PACE - no km penalty!) ---");
console.log("=".repeat(80));
console.log("");
console.log("  PACE FORMULA (full leaderboard):");
console.log("    - Score per track = position % * multiplier * track weight");
console.log("    - Position %: P1 = 100%, last = ~0%");
console.log("    - Multipliers: P1=2x, P2=1.7x, P3=1.5x, P4=1.3x, P5=1.2x, P6-10=1.1x");
console.log("    - Track weight: " + CONFIG.TRACK_WEIGHT_BASE + "-" + CONFIG.TRACK_WEIGHT_MAX + " (more drivers = higher weight)");
console.log("    - Consistency bonus: +" + CONFIG.CONSISTENCY_BONUS_PER_TRACK + "/track (max " + CONFIG.CONSISTENCY_BONUS_MAX + ")");
console.log("");
console.log("  TIER SYSTEM (km = eligibility gate, score = qualification):");
console.log("    Tier       Min KM    Min Score");
console.log("    -----------------------------------");
Object.entries(LICENSE_TIERS).forEach(([name, tier]) => {
  console.log("    " + name.padEnd(10) + " " + String(tier.minKm).padStart(6) + " km   " + String(tier.minScore).padStart(6) + " pts");
});
console.log("    Rookie     < " + ROOKIE_KM_MAX + " km");
console.log("");
console.log("=".repeat(80));
console.log("--- SAFETY RATING (cleanliness: 1.00-9.99) ---");
console.log("=".repeat(80));
console.log("");
console.log("  SR FORMULA:");
console.log("    - Weighted incidents = crashes/100km * " + CONFIG.COLLISION_WEIGHT + " + infractions/100km * " + CONFIG.INFRACTION_WEIGHT);
console.log("    - SR = " + CONFIG.SR_BASE + " + " + CONFIG.SR_SCALE + " / (1 + weighted_incidents)");
console.log("    - Range: " + CONFIG.SR_MIN + " (dirty) to " + CONFIG.SR_MAX + " (clean)");
console.log("");
console.log("  SR TIERS (km = eligibility gate, SR = qualification):");
console.log("    Tier    Min KM    Min SR    ~Crashes/100km");
console.log("    ---------------------------------------------");
SR_TIERS.forEach(t => {
  const crashExample = t.minSR > 1 ? ((CONFIG.SR_SCALE / (t.minSR - CONFIG.SR_BASE)) - 1).toFixed(1) : "10+";
  console.log("    " + t.name.padEnd(7) + " " + String(t.minKm).padStart(6) + " km   " + String(t.minSR).padStart(5) + "      ~" + crashExample);
});
console.log("    F       < " + SR_TIERS[SR_TIERS.length-1].minKm + " km OR SR < " + SR_TIERS[SR_TIERS.length-1].minSR);
console.log("");

console.log("--- Top 20 by LICENSE (pure pace) ---");
byLicense.slice(0, 20).forEach((d, i) => {
  const km = (d.kilometers || 0).toFixed(0);
  const scr = d._licenseScore >= 0 ? d._licenseScore.toFixed(0) : "-";
  const tracks = d._trackCount || 0;
  const lic = (d._license || "-").padEnd(8);
  const potential = d._potentialLicense || d._license;
  const potentialStr = potential !== d._license ? " -> " + potential : "";
  const sr = d._sr.toFixed(2);
  const srT = d._srTier || "-";
  console.log(
    (i + 1).toString().padStart(2) + ". " + (d.name || "?").padEnd(20) + " " + lic + potentialStr.padEnd(12) + " | pace " + scr.padStart(5) + " | " + tracks + " tr | SR " + sr + " (" + srT + ") | " + km.padStart(5) + " km"
  );
});

console.log("");
console.log("--- Top 20 by SAFETY RATING (cleanest, min 500km for reliable SR) ---");
console.log("  (tier) = current tier. (X -> Y) = current X, potential Y if you had enough km for that tier.");
const bySRFiltered = bySR.filter(d => (d.kilometers || 0) >= 500);
bySRFiltered.slice(0, 20).forEach((d, i) => {
  const km = (d.kilometers || 0).toFixed(0);
  const lic = (d._license || "-").padEnd(8);
  const sr = d._sr.toFixed(2);
  const srT = d._srTier || "-";
  const potSR = d._potentialSRTier || srT;
  const srPotentialStr = potSR !== srT ? " -> " + potSR : "";
  const c100 = d._c100.toFixed(2);
  const i100 = (d._i100 || 0).toFixed(2);
  console.log(
    (i + 1).toString().padStart(2) + ". " + (d.name || "?").padEnd(20) + " SR " + sr + " (" + srT + srPotentialStr.padEnd(6) + ") | " + c100.padStart(5) + " c/100km | " + i100.padStart(4) + " i/100km | " + km.padStart(5) + " km"
  );
});

// Counts per license tier (everyone has a tier: Master...Bronze or Rookie)
const licCounts = { Master: 0, Diamond: 0, Platinum: 0, Gold: 0, Silver: 0, Bronze: 0, Rookie: 0 };
enriched.forEach((d) => { licCounts[d._license] = (licCounts[d._license] || 0) + 1; });
licCounts["Rookie"] = rookies.length;

console.log("");
console.log("--- Drivers per LICENSE tier ---");
["Master", "Diamond", "Platinum", "Gold", "Silver", "Bronze", "Rookie"].forEach((t) =>
  console.log("  " + t.padEnd(10) + " " + (licCounts[t] || 0) + "  (" + (data.length ? ((licCounts[t] || 0) / data.length * 100).toFixed(1) : "0") + "%)")
);
console.log("  " + "Total".padEnd(10) + " " + data.length);

console.log("");
console.log("--- Top 20 per LICENSE ---");
const licenseTierNames = ["Master", "Diamond", "Platinum", "Gold", "Silver", "Bronze"];
licenseTierNames.forEach((tier) => {
  const inTier = enriched.filter((d) => d._license === tier);
  const top = [...inTier].sort((a, b) => b._licenseScore - a._licenseScore).slice(0, 20);
  console.log("  " + tier.toUpperCase() + " (" + inTier.length + " drivers, top 20):");
  if (top.length === 0) {
    console.log("    (none)");
  } else {
    top.forEach((d, i) => {
      const km = (d.kilometers || 0).toFixed(0);
      const scr = d._licenseScore >= 0 ? d._licenseScore.toFixed(1) : "-";
      const tracks = d._trackCount || 0;
      const sr = d._sr.toFixed(2);
      const srT = (d._srTier || "-").padEnd(1);
      const c100 = d._c100.toFixed(2);
      console.log("    " + (i + 1) + ". " + (d.name || "?").padEnd(22) + " pace " + scr.padStart(7) + " | " + tracks + " tr | SR " + sr + " (" + srT + ") | " + c100 + " c/100km | " + km.padStart(6) + " km");
    });
  }
  console.log("");
});
const rookiesByKm = [...rookies].sort((a, b) => (b.kilometers || 0) - (a.kilometers || 0));
const topRookies = rookiesByKm.slice(0, 20);
console.log("  ROOKIE (" + rookies.length + " drivers, top 20 by km):");
if (topRookies.length === 0) {
  console.log("    (none)");
} else {
  topRookies.forEach((d, i) => {
    const km = (d.kilometers || 0).toFixed(0);
    const sr = safetyRating(d);
    const srT = getSRTier(sr, km);
    const c100 = crashesPer100km(d);
    const c100Str = c100 === Infinity ? "-" : c100.toFixed(2);
    console.log("    " + (i + 1) + ". " + (d.name || "?").padEnd(22) + " " + km.padStart(5) + " km | SR " + sr.toFixed(2) + " (" + srT + ") | " + c100Str + " c/100km");
  });
}
// Counts per SR tier (everyone: 100+ km and Rookies, so everyone has an SR tier; F = beginner)
const srCounts = {};
SR_TIERS.forEach((t) => (srCounts[t.name] = 0));
srCounts["F"] = 0;
data.forEach((d) => {
  const km = d.kilometers || 0;
  const sr = safetyRating(d);
  const t = getSRTier(sr, km);
  srCounts[t] = (srCounts[t] || 0) + 1;
});

console.log("");
console.log("--- Drivers per SAFETY RATING tier (everyone; F = Rookie/beginner) ---");
SR_TIERS.forEach((t) => {
  const cnt = srCounts[t.name] || 0;
  const pct = data.length ? ((cnt / data.length) * 100).toFixed(1) : "0";
  console.log("  " + t.name.padEnd(4) + " " + String(cnt).padStart(5) + "  (" + pct + "%)");
});
const fCnt = srCounts["F"] || 0;
const fPct = data.length ? ((fCnt / data.length) * 100).toFixed(1) : "0";
console.log("  F    " + String(fCnt).padStart(5) + "  (" + fPct + "%)");
console.log("  " + "Total".padEnd(5) + " " + data.length);
console.log("");

// ========== NEW: Statistics and analysis ==========
console.log("=".repeat(80));
console.log("--- STATISTICS & ANALYSIS ---");
console.log("=".repeat(80));
console.log("");

// Calculate statistics for qualified drivers
const qualifiedStats = {
  avgPaceScore: enriched.reduce((a, d) => a + (d._licenseScore || 0), 0) / enriched.length,
  avgSR: enriched.reduce((a, d) => a + d._sr, 0) / enriched.length,
  avgKm: enriched.reduce((a, d) => a + (d.kilometers || 0), 0) / enriched.length,
  avgTracks: enriched.reduce((a, d) => a + (d._trackCount || 0), 0) / enriched.length,
  avgC100: enriched.reduce((a, d) => a + (isFinite(d._c100) ? d._c100 : 0), 0) / enriched.length,
  avgI100: enriched.reduce((a, d) => a + (d._i100 || 0), 0) / enriched.length,
};

console.log("  Qualified drivers (" + enriched.length + " with >=" + MIN_KM + " km):");
console.log("    Avg pace score: " + qualifiedStats.avgPaceScore.toFixed(1));
console.log("    Avg Safety Rating: " + qualifiedStats.avgSR.toFixed(2));
console.log("    Avg km: " + qualifiedStats.avgKm.toFixed(0));
console.log("    Avg tracks: " + qualifiedStats.avgTracks.toFixed(1));
console.log("    Avg crashes/100km: " + qualifiedStats.avgC100.toFixed(2));
console.log("    Avg infractions/100km: " + qualifiedStats.avgI100.toFixed(3));
console.log("");

// Score distribution
const scoreRanges = [
  { min: 0, max: 50, label: "0-50" },
  { min: 50, max: 100, label: "50-100" },
  { min: 100, max: 200, label: "100-200" },
  { min: 200, max: 500, label: "200-500" },
  { min: 500, max: 1000, label: "500-1000" },
  { min: 1000, max: Infinity, label: "1000+" },
];
console.log("  License score distribution:");
scoreRanges.forEach(range => {
  const count = enriched.filter(d => d._licenseScore >= range.min && d._licenseScore < range.max).length;
  const pct = (count / enriched.length * 100).toFixed(1);
  const bar = "#".repeat(Math.round(count / enriched.length * 50));
  console.log("    " + range.label.padEnd(10) + ": " + String(count).padStart(4) + " (" + pct.padStart(5) + "%) " + bar);
});
console.log("");
