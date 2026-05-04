-- AC Elite: reset alle site-bezoektellers naar 0 (totaal + per route).
--
-- Wanneer: je wilt opnieuw vanaf nul tellen, bijv. na introductie van per-route stats zodat
--          het totaal weer overeenkomt met de som van de routes.
--
-- Waar: Supabase → SQL Editor → plak dit bestand → Run.
--       Alleen draaien als je de oude cijfers echt kwijt wilt.
--
-- Let op: dit wist geen browser-data; bezoekers met een recente "10 min"-timestamps in
--         localStorage tellen pas weer mee na die gap (clientgedrag ongewijzigd).

update public.site_stats
set visit_count = 0
where id = 1;

-- Per-route tabel leegmaken (alleen als die bestaat — na scripts/supabase-site-stats.sql).
do $block$
begin
  if to_regclass('public.site_page_stats') is not null then
    execute 'truncate table public.site_page_stats';
  end if;
end
$block$;
