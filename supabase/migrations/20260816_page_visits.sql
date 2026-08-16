-- ============================================================
-- ZERO DEFECT RUSH — counting who opens the page
-- ============================================================
-- One row per person who opens the quiz, so you can see how many
-- students got as far as looking at it — not just how many
-- finished an attempt.
--
-- HOW TO RUN THIS
--   Supabase dashboard -> SQL Editor -> New query
--   -> paste this whole file -> Run.
--
-- Safe to run more than once.
--
-- ------------------------------------------------------------
-- WHAT THIS DOES AND DOES NOT COLLECT
-- ------------------------------------------------------------
-- Collected: the fact that a page was opened, when, and whether
-- the screen was phone-sized.
--
-- NOT collected: no IP address, no user agent, no location, no
-- cookie, no fingerprint, nothing that could identify a person or
-- follow them anywhere. A row here says "someone opened this page
-- at 10:42 on a phone" and nothing more. That is deliberate —
-- this is a headcount for a lecturer, not analytics.
--
-- The browser also records only ONE visit per tab session, so a
-- student who refreshes five times is still one visit.
-- ============================================================


-- ------------------------------------------------------------
-- 1. The table
-- ------------------------------------------------------------
create table if not exists public.page_visits (
  id         uuid        primary key default gen_random_uuid(),

  -- Which page. There is one quiz today, but the other activity
  -- pages will fill up eventually and this keeps them apart.
  page       text        not null default 'activity-3',

  -- Coarse screen-size flag, useful for "are they on phones?".
  -- A single boolean, not a device fingerprint.
  is_mobile  boolean,

  visited_at timestamptz not null default now(),

  constraint page_visits_page_length
    check (char_length(btrim(page)) between 1 and 40)
);

comment on table public.page_visits is
  'One row per person opening a quiz page. No IP, user agent, location or cookie - just a timestamp and a phone/desktop flag.';


-- ------------------------------------------------------------
-- 2. Index
-- ------------------------------------------------------------
-- Every question you will ask of this table is "how many, over
-- what period", so order by time.
create index if not exists page_visits_visited_at_idx
  on public.page_visits (visited_at desc);


-- ------------------------------------------------------------
-- 3. Row Level Security
-- ------------------------------------------------------------
-- Same shape as quiz_attempts: the public key may INSERT and
-- nothing else. There is deliberately no select policy, so a
-- visitor cannot read the visit log — not even their own row.
alter table public.page_visits enable row level security;

drop policy if exists "Anyone may record a visit" on public.page_visits;

create policy "Anyone may record a visit"
  on public.page_visits
  for insert
  to anon, authenticated
  with check (true);

grant usage on schema public to anon, authenticated;
grant insert on public.page_visits to anon, authenticated;

revoke select, update, delete on public.page_visits from anon;
revoke select, update, delete on public.page_visits from authenticated;

-- NOTE: no RPC is created for reading this back. Unlike the
-- leaderboard and the class scoreboard, these numbers are for the
-- lecturer, not for students — so nothing is exposed to the
-- browser at all. Read them in the SQL Editor with the queries
-- below, which run as the owner and bypass RLS.


-- ============================================================
-- THE QUERIES YOU ACTUALLY WANT
-- ============================================================
--
-- ------------------------------------------------------------
-- THE FUNNEL — the useful one
-- ------------------------------------------------------------
-- How many opened it, how many started, how many finished, how
-- many aced it. Where the numbers fall off tells you where to
-- look.
--
--   with v as (select count(*) n from public.page_visits),
--        s as (select count(distinct session_id) n from public.quiz_attempts),
--        f as (select count(*) n from public.quiz_attempts),
--        p as (select count(*) n from public.quiz_attempts where completed)
--   select v.n as opened_the_page,
--          s.n as started_a_quiz,
--          f.n as attempts_finished,
--          p.n as perfect_scores,
--          round(100.0 * s.n / nullif(v.n, 0), 1) as pct_who_started,
--          round(100.0 * p.n / nullif(s.n, 0), 1) as pct_of_starters_who_aced_it
--   from v, s, f, p;
--
-- Reading it: if lots open but few start, the briefing screen is
-- putting people off. If lots start but few finish, the quiz is
-- too long or too hard. If lots finish but none ace it, the
-- 30/30 rule is biting - which is the point, but worth knowing.
--
-- ------------------------------------------------------------
-- VISITS PER DAY
-- ------------------------------------------------------------
--   select date(visited_at at time zone 'Asia/Kuala_Lumpur') as day,
--          count(*) as visits,
--          count(*) filter (where is_mobile) as on_phones
--   from public.page_visits
--   group by 1
--   order by 1 desc
--   limit 30;
--
-- ------------------------------------------------------------
-- WAS TODAY'S CLASS BUSY?
-- ------------------------------------------------------------
--   select count(*) as visits_today
--   from public.page_visits
--   where visited_at >= date_trunc('day', now() at time zone 'Asia/Kuala_Lumpur');
--
-- ------------------------------------------------------------
-- PHONE VS DESKTOP
-- ------------------------------------------------------------
--   select case when is_mobile then 'phone' else 'desktop' end as device,
--          count(*) as visits,
--          round(100.0 * count(*) / sum(count(*)) over (), 1) as pct
--   from public.page_visits
--   group by 1;
--
-- ------------------------------------------------------------
-- CLEARING TEST DATA
-- ------------------------------------------------------------
--   delete from public.page_visits
--   where visited_at < '2026-08-17';
--
-- ============================================================
-- A CAVEAT WORTH KNOWING
-- ============================================================
-- "Visits" and "students" are not the same number.
--
--   - One student who opens the page on Monday and again on
--     Friday is two visits.
--   - One student who plays three attempts in one sitting is one
--     visit and one session, but three rows in quiz_attempts.
--   - A student who closes the tab and reopens it is two visits.
--
-- So treat the funnel as a shape, not as a register. It answers
-- "roughly what proportion of people who look at this actually
-- play it", which is the question worth asking. It does not
-- answer "did Ahmad open it", and it deliberately cannot.
-- ============================================================
