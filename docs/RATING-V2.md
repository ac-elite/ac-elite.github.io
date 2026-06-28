# AC Elite Rating v2

## Mode

- Production/default build uses rating v2.
- Rating v1 remains an explicit fallback for emergencies.
- Override explicitly with `VITE_RATING_SYSTEM=v1` or `VITE_RATING_SYSTEM=v2`.

## Rating Philosophy

Rating v2 is not a reset. AC Elite already has a large historical KMR data set,
while detailed result files only exist from the newer results ingest period.

For rating v2:

- visible License tier and score stay anchored to v1 pace/license, with a small capped recent-results adjustment;
- visible Safety Rating stays anchored to v1 all-time KMR SR, with a small capped recent-results adjustment;
- results-derived racecraft/safety are stored in the breakdown;
- recent signals can tune the rating, but cannot erase old history.

## Supabase Setup

Run `scripts/supabase-rating-v2.sql` once in Supabase SQL Editor. This only creates rating v2 objects:

- `driver_session_stats_v2`
- `driver_ratings_v2`
- `rating_history_v2`
- `rating_sync_v2`
- `reset_rating_v2_current()`
- `prune_rating_history_v2()`

Deploy the rating v2 function:

```bash
npm run supabase:deploy:ratings-v2
```

Then call/schedule `sync-ratings-v2` with the same `CRON_SECRET` pattern used by the existing sync functions.

Free-tier safe defaults:

- `RATING_V2_MIN_INTERVAL_MINUTES` defaults to `360`, so repeated cron calls skip until the cooldown passes.
- `RATING_V2_HISTORY_MODE` defaults to `off`; do not store per-driver history snapshots in `rating_history_v2`.
- If history is needed later, set `RATING_V2_HISTORY_MODE=summary`; this stores only compact aggregates/top lists.
- Recommended cron: every 6 hours (`17 */6 * * *`) or daily while on Supabase Free/Nano.
- Manual force run: call the function with `?force=1`.

## Rollback

If rating v2 must be rolled back completely, optional Supabase cleanup:

```sql
drop function if exists public.prune_rating_history_v2();
drop function if exists public.reset_rating_v2_current();
drop table if exists public.rating_sync_v2;
drop table if exists public.rating_history_v2;
drop table if exists public.driver_ratings_v2;
drop table if exists public.driver_session_stats_v2;
```

The same SQL is available in `scripts/supabase-rating-v2-cleanup.sql`.

## Safety Note

Rating v2 ignores a driver in a session unless that driver completed at least one lap, so AFK presence does not affect the rating.
