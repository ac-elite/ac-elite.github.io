-- Session list: denormalized collision count (from detail.incidents at ingest).
alter table public.sessions
  add column if not exists num_incidents int not null default 0;

update public.sessions
   set num_incidents = coalesce(jsonb_array_length(detail->'incidents'), 0)
 where num_incidents = 0
   and detail ? 'incidents';
