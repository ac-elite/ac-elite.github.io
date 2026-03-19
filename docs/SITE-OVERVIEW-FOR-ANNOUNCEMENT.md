# AC Elite Website Overview (for Discord Announcement)

Use this as source context to generate an announcement post for the AC Elite Discord.

## Project Identity

- **Name:** AC Elite
- **Type:** Simracing community platform (Assetto Corsa / KMR data driven)
- **Brand tone:** Modern, futuristic, premium
- **Main value:** Live driver stats, rankings, and leaderboard performance in one place

## Live Website

- **URL:** https://ac-elite.github.io/
- **Primary CTA:** Join the community via Discord

## What The Site Offers

### 1) Home

- Hero with key community stats:
  - Total drivers
  - Logged laps
  - Active tracks
  - Data sync status
- Data freshness indicator:
  - Live / Delayed / Stale / Unknown
  - Human-readable "last update" time (e.g. "30 minutes ago")
- Driver search:
  - Search by driver name or Steam64 ID
  - Deep linking support from leaderboard/rankings to a driver profile
- Driver profile panel includes:
  - License tier + pace score
  - Safety Rating tier + value
  - KM, collisions, laps, tracks, favorite track

### 2) Stats

- Community-wide overview with richer aggregate metrics, including:
  - Total drivers, tracks, laps, KM
  - Average KM per driver
  - Incidents per 100 KM
  - Session totals (wins, podiums, poles, fastest laps)
- Extra highlight blocks:
  - Top distance drivers
  - Most active tracks

### 3) Leaderboard

- Track-based leaderboard view
- Driver rows include:
  - Position
  - Driver name
  - License + pace score
  - Safety Rating + value
  - Lap time, gap, laps, KM
- Top 3 positions and rows have special podium styling (gold/silver/bronze glass look)
- Track selector is a dropdown for cleaner UX

### 4) Rankings

- Multiple ranking modes:
  - Overall (70% pace + 30% Safety Rating)
  - By License tier
  - By Safety tier
- Tier filters are dropdown-based for better readability and less clutter
- Top 3 rows also use podium styling

## License / Safety Guide

- A dedicated **License / SR (BETA)** button is available in navigation
- Opens a modal with:
  - License explanation and requirements per tier
  - Safety Rating explanation and tier thresholds
- Purpose: make progression transparent for community members

## Data Pipeline (Important)

- Data is synced automatically from KMR source
- Sync schedule: **every hour**
- GitHub Actions handles:
  - Data sync workflow
  - Automatic pages deploy after successful sync
- Result: live site data should refresh hourly (plus deploy/cache delay)

## Current WIP / Transparency Note

- License and Safety Rating calculations are still being tuned
- Thresholds/values may change while balancing continues
- This is intentionally shown in the UI so users know the system is evolving

## Upcoming / Coming Soon

- Hall of Fame
- Setup Store
- Livery Showcase

## Suggested Announcement Angles

- "New AC Elite site is live"
- "Live KMR-powered data now visible on web"
- "Search any driver instantly"
- "Transparent License + Safety system with guide included"
- "More features and pages coming soon"

## Short Post Draft Input (optional for your GPT)

If useful, tell the announcement GPT:

"Write a Discord announcement in English for AC Elite members. Keep it energetic but clean, include what is live now (Home, Stats, Leaderboard, Rankings, driver search, sync status), mention License/SR is still work in progress, and end with a call to action to check the site and share feedback. Include the site URL: https://ac-elite.github.io/."
