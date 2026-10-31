-- =====================================================================
-- Cloud Region Advisor — anonymous visit statistics (Supabase / Postgres)
--
-- Run once: Supabase dashboard → SQL Editor → New query → paste → Run.
--
-- Stored per visit: a random browser ID (UUID, no personal data) and a
-- timestamp. Nothing else. The website (anon key) can only call the two
-- functions below; it cannot read or change the table directly.
-- =====================================================================

create table if not exists public.visits (
  id          bigint generated always as identity primary key,
  visitor_id  uuid        not null,
  visited_at  timestamptz not null default now()
);

create index if not exists visits_visited_at_idx on public.visits (visited_at);
create index if not exists visits_visitor_idx    on public.visits (visitor_id, visited_at desc);

-- Row-level security on, no policies: direct table access is denied to the
-- public (anon) key. Only the security-definer functions below touch it.
alter table public.visits enable row level security;
revoke all on public.visits from anon, authenticated;


-- Record a visit. Repeat visits by the same browser within 30 minutes count
-- once; a daily cap stops anyone flooding the table.
create or replace function public.log_visit(p_visitor uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_visitor is null then
    return;
  end if;
  if exists (
    select 1 from visits
    where visitor_id = p_visitor and visited_at > now() - interval '30 minutes'
  ) then
    return;
  end if;
  if (select count(*) from visits where visited_at > now() - interval '1 day') >= 20000 then
    return;
  end if;
  insert into visits (visitor_id) values (p_visitor);
end;
$$;


-- Aggregate counts only (no IDs leave the database). "today" is the
-- current UTC day; 7 and 30 days are rolling windows.
create or replace function public.visit_stats()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'today', json_build_object(
      'visits',   count(*)                   filter (where visited_at >= date_trunc('day', now())),
      'visitors', count(distinct visitor_id) filter (where visited_at >= date_trunc('day', now()))
    ),
    'week', json_build_object(
      'visits',   count(*)                   filter (where visited_at >= now() - interval '7 days'),
      'visitors', count(distinct visitor_id) filter (where visited_at >= now() - interval '7 days')
    ),
    'month', json_build_object(
      'visits',   count(*)                   filter (where visited_at >= now() - interval '30 days'),
      'visitors', count(distinct visitor_id) filter (where visited_at >= now() - interval '30 days')
    ),
    'all', json_build_object(
      'visits',   count(*),
      'visitors', count(distinct visitor_id)
    ),
    'since', min(visited_at)
  )
  from visits;
$$;

revoke all on function public.log_visit(uuid) from public;
revoke all on function public.visit_stats()   from public;
grant execute on function public.log_visit(uuid) to anon;
grant execute on function public.visit_stats()   to anon;


-- ---------------------------------------------------------------------
-- Handy queries for the SQL Editor (not needed by the website)
-- ---------------------------------------------------------------------
-- Daily, last 30 days:
--   select date_trunc('day', visited_at)::date as day,
--          count(*) as visits, count(distinct visitor_id) as unique_visitors
--   from visits where visited_at >= now() - interval '30 days'
--   group by 1 order by 1 desc;
--
-- Weekly (ISO weeks):
--   select date_trunc('week', visited_at)::date as week_starting,
--          count(*) as visits, count(distinct visitor_id) as unique_visitors
--   from visits group by 1 order by 1 desc;
--
-- Monthly:
--   select to_char(date_trunc('month', visited_at), 'YYYY-MM') as month,
--          count(*) as visits, count(distinct visitor_id) as unique_visitors
--   from visits group by 1 order by 1 desc;
