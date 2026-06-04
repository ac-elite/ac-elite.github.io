-- Session weather: ambient/road temp + wind, read from each lap's `Conditions`
-- at ingest. AC Elite runs no rain, so conditions are effectively constant per
-- session; the sync stores one representative value (from the fastest/first lap).
-- Only new sessions are populated — existing rows stay null (no backfill).
alter table public.sessions
  add column if not exists ambient_temp real,   -- °C, AC Conditions.Ambient
  add column if not exists road_temp    real,   -- °C, AC Conditions.Road
  add column if not exists wind_speed   real,   -- km/h, AC Conditions.WindSpeed
  add column if not exists wind_dir      int;   -- degrees, AC Conditions.WindDirection
