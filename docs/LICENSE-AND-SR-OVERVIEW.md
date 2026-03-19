# AC Elite — License & Safety Rating System

A short overview of how **License** (pace/skill) and **Safety Rating** (cleanliness) are calculated, with examples. Use this to evaluate and discuss with your team.

---

## 1. License (Pace / Skill)

**What it measures:** How fast you are relative to others on the **leaderboards** (best laptimes per track).  
**What we do not use:** Race results (wins, podiums). So sprint races and solo runs are treated fairly.

### How the pace score is calculated

1. **Per track** we build a leaderboard (all drivers who have set a laptime on that track, same car).
2. We only count tracks where **at least 5 drivers** have a time (to avoid empty leaderboards).
3. For each track you get **points** based on:
   - **Position:** P1 = 100% of base, P2 = slightly less, … last = 0%.  
     Formula: `baseScore = (totalDrivers - yourPosition) / totalDrivers × 100`
   - **Position multiplier:** P1 = 2.0×, P2 = 1.7×, P3 = 1.5×, P4 = 1.3×, P5 = 1.2×, P6–10 = 1.1×
   - **Track weight:** 1.0 to 2.0. More drivers on that track = higher weight (more competitive).
4. **Consistency bonus:** +2 points per track you have a time on (max +50). Rewards driving on many different circuits.
5. Your **total pace score** = sum over all counted tracks + consistency bonus.

**Example (simplified):**  
- Monza: 20 drivers, you are P3 → baseScore ≈ 85, multiplier 1.5, trackWeight 1.3 → ~166 points.  
- Silverstone: 15 drivers, you are P1 → baseScore 100, multiplier 2.0, trackWeight 1.2 → ~240 points.  
- You have 10 tracks → +20 consistency → total pace score in the hundreds/thousands depending on all tracks.

### License tiers

You need **all** of: minimum km, minimum pace score, and (where listed) minimum number of **different tracks** (circuits you’ve set a time on). The server runs one track per week (weekly rotation); “tracks” = number of different circuits over time.

| Tier     | Min km | Min pace score | Min tracks |
|----------|--------|----------------|------------|
| Elite    | 6,000  | 3,700          | 8          |
| Diamond+ | 5,000  | 3,100          | 6          |
| Diamond  | 5,000  | 2,500          | 6          |
| Platinum+| 3,500  | 2,000          | 5          |
| Platinum | 3,500  | 1,500          | 5          |
| Gold+    | 2,000  | 1,150          | 4          |
| Gold     | 2,000  | 800            | 4          |
| Silver+  | 1,000  | 600            | 3          |
| Silver   | 1,000  | 400            | 3          |
| Bronze+  | 100    | 200            | —          |
| Bronze   | 100    | 0              | —          |
| Rookie   | &lt; 100 km | —         | —          |

**Example:** 4,000 km, 2,100 pace score, 7 tracks → **Platinum+** (meets 3,500 km, 2,000 score, 5 tracks).

---

## 2. Safety Rating (SR)

**What it measures:** How clean you drive, based on **incidents per distance** (collisions and infractions per 100 km).

### How SR is calculated

1. **Incidents per 100 km:**
   - `collisionsPer100km = (collisions / km) × 100`
   - `infractionsPer100km = (infractions / km) × 100`
2. **Weighted incident rate:**  
   `weighted = collisionsPer100km × 1.0 + infractionsPer100km × 2.0`  
   (Infractions count twice as much as collisions.)
3. **Safety Rating:**  
   `SR = 1.0 + 8.99 / (1 + weighted)`  
   - Scale: **1.00** (very dirty) to **9.99** (near perfect).
   - 0 km driven: SR is shown as **2.50** until there is enough data.

**Examples:**

| Collisions/100 km | Infractions/100 km | Weighted | SR   |
|-------------------|--------------------|----------|------|
| 0                 | 0                  | 0        | 9.99 |
| 2                 | 0.5                | 3.0      | 3.25 |
| 4                 | 1                  | 6.0      | 2.28 |
| 6                 | 2                  | 10.0     | 1.82 |

So: **fewer incidents per 100 km → higher SR.**

### SR tiers (with subtiers)

You need **both** minimum SR and minimum km for a tier. Lower km requirements than before so clean drivers can reach higher tiers sooner.

| Tier | Min SR | Min km |
|------|--------|--------|
| S    | 3.00+  | 3,000  |
| A1   | 2.90   | 2,000  |
| A2   | 2.80   | 2,000  |
| A3   | 2.70   | 2,000  |
| B1–B3| 2.40–2.60 | 1,500 |
| C1–C3| 2.10–2.30 | 1,000 |
| D1–D3| 1.80–2.00 | 500  |
| E1–E3| 1.50–1.70 | 100  |
| F    | &lt; 1.50 or &lt; 100 km | — |

**Example:** SR 2.85, 2,500 km → **A2** (SR ≥ 2.80, km ≥ 2,000).  
**Example:** SR 4.50 but only 1,500 km → **C1** (highest tier you get with 1,000 km is C; your SR would qualify for S with more km).

---

## 3. Design choices (summary)

- **No wins/podiums** in License — fair for sprint races and when solo runs don’t count as wins.
- **One track per week** — “tracks” = number of different circuits you’ve set a time on over time.
- **Minimum tracks** for higher License tiers — avoids farming only one circuit; rewards variety.
- **SR uses incidents per 100 km** — same idea as “per corner”; more km doesn’t change the formula, only gives more stable stats.
- **Lower km for SR tiers** — clean drivers can reach S/A/B without needing 6,000 km.
- **License km kept higher** — pace tier reflects both speed and commitment (many tracks + distance).

---

## 4. Data used

- **rank.json:** per driver: km, collisions, infractions, leaderboard (best laptimes per track/car).
- **leaderboard.json:** used for building per-track leaderboards and weights.

No per-race data (e.g. incidents per race or grid size) is used. The system is built to be fair and consistent with this data only.

---

*Document version: Feb 2025 — matches current website and `license-and-safety.js`.*
