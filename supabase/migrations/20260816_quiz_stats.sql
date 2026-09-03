-- ============================================================
-- ZERO DEFECT RUSH — the numbers behind the quiz
-- ============================================================
-- Four read-only functions that feed quiz-stats.html.
--
-- HOW TO RUN THIS
--   Supabase dashboard -> SQL Editor -> New query
--   -> paste this whole file -> Run.
--
-- Safe to run more than once.
--
-- ============================================================
-- HOW THESE ARE PROTECTED, AND WHY IT IS DONE THIS WAY
-- ============================================================
-- These functions read things students must never see, so only a
-- signed-in lecturer may call them.
--
-- The obvious way to do that is GRANT EXECUTE to "authenticated"
-- and revoke everyone else. That was tried and it did not hold:
--
--   attempt 1  revoke from public            -> anon still got 200
--   attempt 2  revoke from anon              -> anon still got 200
--   attempt 3  revoke from public, anon,
--              authenticated, then grant
--              back to authenticated only    -> anon still got 200
--
-- Each was verified from a browser using the real public key, and
-- each time the data came back. Something in this project keeps
-- execute reachable for anon, and rather than keep guessing at
-- it, the check now lives INSIDE each function.
--
-- require_lecturer() reads the caller's JWT role and raises
-- 42501 unless it is 'authenticated'. A grant cannot open that
-- door, because the door is in the function body. The grants
-- below are kept as a second layer, but nothing depends on them.
--
-- This is also just better practice: the rule is now visible in
-- the code that enforces it, instead of living in a privilege
-- table nobody looks at.
-- ============================================================


-- ------------------------------------------------------------
-- 1. The guard
-- ------------------------------------------------------------
-- PostgREST puts the caller's JWT claims into a setting on the
-- connection. Anonymous callers arrive with role 'anon'; a signed
-- in one arrives with 'authenticated'.
--
-- Two claim formats are read because PostgREST changed the shape
-- between versions, and the older single-claim form is still what
-- some projects emit. Missing or unreadable means anon.
create or replace function public.require_lecturer()
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  caller_role text;
begin
  caller_role := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
    'anon'
  );

  if caller_role is distinct from 'authenticated' then
    raise exception 'Sign in required to read quiz statistics.'
      using errcode = '42501';
  end if;
end;
$$;

comment on function public.require_lecturer() is
  'Raises 42501 unless the caller is signed in. Called at the top of every stats function so protection cannot be lost to a grant.';


-- ------------------------------------------------------------
-- 2. The headline numbers
-- ------------------------------------------------------------
create or replace function public.quiz_stats()
returns table (
  opened_page          bigint,
  started_quiz         bigint,
  total_attempts       bigint,
  perfect_scores       bigint,
  students_passed      bigint,
  avg_score            numeric,
  visits_today         bigint,
  attempts_today       bigint,
  timed_out_attempts   bigint,
  first_activity       timestamptz,
  last_activity        timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
declare
  day_start timestamptz := (date_trunc('day', now() at time zone 'Asia/Kuala_Lumpur')
                            at time zone 'Asia/Kuala_Lumpur');
begin
  perform public.require_lecturer();

  return query
  select
    (select count(*) from public.page_visits),
    (select count(distinct a.session_id) from public.quiz_attempts a),
    (select count(*) from public.quiz_attempts),
    (select count(*) from public.quiz_attempts a where a.completed),
    (select count(distinct lower(btrim(a.student_name)) || '|' || lower(btrim(a.class_name)))
       from public.quiz_attempts a where a.completed),
    (select round(avg(a.score), 1) from public.quiz_attempts a),
    (select count(*) from public.page_visits v where v.visited_at >= day_start),
    (select count(*) from public.quiz_attempts a where a.created_at >= day_start),
    (select count(*) from public.quiz_attempts a where a.timed_out),
    (select min(a.created_at) from public.quiz_attempts a),
    (select max(a.created_at) from public.quiz_attempts a);
end;
$$;


-- ------------------------------------------------------------
-- 3. Per class
-- ------------------------------------------------------------
create or replace function public.quiz_stats_by_class()
returns table (
  class_name text,
  students   bigint,
  attempts   bigint,
  passes     bigint,
  avg_score  numeric,
  best_score integer
)
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
begin
  perform public.require_lecturer();

  return query
  select btrim(a.class_name),
         count(distinct lower(btrim(a.student_name))),
         count(*),
         count(*) filter (where a.completed),
         round(avg(a.score), 1),
         max(a.score)
  from public.quiz_attempts a
  group by btrim(a.class_name)
  order by count(*) desc;
end;
$$;


-- ------------------------------------------------------------
-- 4. Which questions are being missed
-- ------------------------------------------------------------
-- The most useful one for teaching. Feed the ids back into
-- quiz-questions.js to see the wording and the slide number.
create or replace function public.quiz_hardest_questions(row_limit integer default 10)
returns table (
  question_id text,
  times_seen  bigint,
  times_wrong bigint,
  pct_wrong   numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
begin
  perform public.require_lecturer();

  return query
  select r ->> 'questionId',
         count(*),
         count(*) filter (where (r ->> 'correct')::boolean is false),
         round(100.0 * count(*) filter (where (r ->> 'correct')::boolean is false)
               / nullif(count(*), 0), 1)
  from public.quiz_attempts a,
       lateral jsonb_array_elements(a.responses) as r
  group by r ->> 'questionId'
  order by count(*) filter (where (r ->> 'correct')::boolean is false) desc,
           count(*) desc
  limit least(greatest(coalesce(row_limit, 10), 1), 50);
end;
$$;


-- ------------------------------------------------------------
-- 5. Day by day
-- ------------------------------------------------------------
create or replace function public.quiz_daily_activity(days integer default 14)
returns table (
  day            date,
  visits         bigint,
  attempts       bigint,
  perfect_scores bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
declare
  span integer := least(greatest(coalesce(days, 14), 1), 90);
begin
  perform public.require_lecturer();

  return query
  with series as (
    select generate_series(current_date - (span - 1), current_date, interval '1 day')::date as d
  )
  select s.d,
         (select count(*) from public.page_visits v
           where (v.visited_at at time zone 'Asia/Kuala_Lumpur')::date = s.d),
         (select count(*) from public.quiz_attempts a
           where (a.created_at at time zone 'Asia/Kuala_Lumpur')::date = s.d),
         (select count(*) from public.quiz_attempts a
           where a.completed
             and (a.created_at at time zone 'Asia/Kuala_Lumpur')::date = s.d)
  from series s
  order by s.d desc;
end;
$$;


-- ------------------------------------------------------------
-- 6. Grants — a second layer, not the only one
-- ------------------------------------------------------------
-- Kept because it is the right thing to declare, but the guard
-- inside each function is what actually enforces the rule.
revoke all on function public.quiz_stats()                    from public, anon;
revoke all on function public.quiz_stats_by_class()           from public, anon;
revoke all on function public.quiz_hardest_questions(integer) from public, anon;
revoke all on function public.quiz_daily_activity(integer)    from public, anon;

grant execute on function public.quiz_stats()                    to authenticated;
grant execute on function public.quiz_stats_by_class()           to authenticated;
grant execute on function public.quiz_hardest_questions(integer) to authenticated;
grant execute on function public.quiz_daily_activity(integer)    to authenticated;

-- require_lecturer must stay callable by everyone, because the
-- protected functions call it as the caller. It leaks nothing —
-- it either returns void or raises.
grant execute on function public.require_lecturer() to anon, authenticated;


-- ============================================================
-- CHECKING IT
-- ============================================================
-- In the SQL Editor these will now RAISE, because the editor is
-- not a signed-in PostgREST caller:
--
--   select * from public.quiz_stats();
--   -> ERROR: Sign in required to read quiz statistics.
--
-- That error is the protection working. To read the numbers
-- yourself here, query the tables directly instead:
--
--   select count(*) from public.quiz_attempts;
--   select count(*) from public.page_visits;
--
-- The real test is from a browser: quiz-stats.html signed in
-- should work, and the same call with only the anon key should
-- come back 401 with code 42501.
-- ============================================================
