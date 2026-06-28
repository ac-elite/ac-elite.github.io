-- AC Elite — remove Rating v2 objects if the system is rolled back.
-- This is intentionally limited to v2-only objects.

drop function if exists public.prune_rating_history_v2();
drop function if exists public.reset_rating_v2_current();
drop table if exists public.rating_sync_v2;
drop table if exists public.rating_history_v2;
drop table if exists public.driver_ratings_v2;
drop table if exists public.driver_session_stats_v2;

