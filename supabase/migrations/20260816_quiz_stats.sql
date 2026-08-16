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
-- ------------------------------------------------------------
-- WHO CAN CALL THESE — READ THIS BIT
-- ------------------------------------------------------------
-- Everything here is granted to "authenticated" and NOT to
-- "anon". That single word is the whole security model:
--
--   anon           = anybody on the internet with the public key,
--                    which is every student playing the quiz
--   authenticated  = somebody who signed in with a real Supabase
--                    user account
--
-- The quiz page uses the anon key, so a student cannot call any
-- of these no matter what they try. The stats page signs in
-- first, exactly like admin.html already does for the
-- registration form.
--
-- If you have not made yourself a user yet:
--   Dashboard -> Authentication -> Users -> Add user
--   -> Create new user -> tick "Auto Confirm User"
--
-- ------------------------------------------------------------
-- WHY FUNCTIONS AND NOT JUST A SELECT POLICY
-- ------------------------------------------------------------
-- A select policy on quiz_attempts would hand a signed-in page
-- every column of every row, responses included. These functions
-- return only the aggregates the page actually draws, so even a
-- signed-in session never pulls down the raw answer data.
-- ============================================================


-- ------------------------------------------------------------
-- 1. The headline numbers
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
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  with today_start as (
    select (date_trunc('day', now() at time zone 'Asia/Kuala_Lumpur')
            at time zone 'Asia/Kuala_Lumpur') as t
  )
  select
    (select count(*) from public.page_visits),
    (select count(distinct session_id) from public.quiz_attempts),
    (select count(*) from public.quiz_attempts),
    (select count(*) from public.quiz_attempts where completed),
    (select count(distinct lower(btrim(student_name)) || '|' || lower(btrim(class_name)))
       from public.quiz_attempts where completed),
    (select round(avg(score), 1) from public.quiz_attempts),
    (select count(*) from public.page_visits, today_start where visited_at >= t),
    (select count(*) from public.quiz_attempts, today_start where created_at >= t),
    (select count(*) from public.quiz_attempts where timed_out),
    (select min(created_at) from public.quiz_attempts),
    (select max(created_at) from public.quiz_attempts);
$$;


-- ------------------------------------------------------------
-- 2. Per class
-- ------------------------------------------------------------
create or replace function public.quiz_stats_by_class()
returns table (
  class_name    text,
  students      bigint,
  attempts      bigint,
  passes        bigint,
  avg_score     numeric,
  best_score    integer
)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select btrim(a.class_name),
         count(distinct lower(btrim(a.student_name))),
         count(*),
         count(*) filter (where a.completed),
         round(avg(a.score), 1),
         max(a.score)
  from public.quiz_attempts a
  group by btrim(a.class_name)
  order by count(*) desc;
$$;


-- ------------------------------------------------------------
-- 3. Which questions are being missed
-- ------------------------------------------------------------
-- The most useful one for teaching. Feed the question ids back
-- into quiz-questions.js to see the wording, then re-teach that
-- point.
create or replace function public.quiz_hardest_questions(row_limit integer default 10)
returns table (
  question_id text,
  times_seen  bigint,
  times_wrong bigint,
  pct_wrong   numeric
)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
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
$$;


-- ------------------------------------------------------------
-- 4. Day by day
-- ------------------------------------------------------------
create or replace function public.quiz_daily_activity(days integer default 14)
returns table (
  day            date,
  visits         bigint,
  attempts       bigint,
  perfect_scores bigint
)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  with span as (
    select least(greatest(coalesce(days, 14), 1), 90) as n
  ),
  series as (
    select generate_series(
             (current_date - ((select n from span) - 1)),
             current_date,
             interval '1 day'
           )::date as day
  )
  select s.day,
         (select count(*) from public.page_visits v
           where (v.visited_at at time zone 'Asia/Kuala_Lumpur')::date = s.day),
         (select count(*) from public.quiz_attempts a
           where (a.created_at at time zone 'Asia/Kuala_Lumpur')::date = s.day),
         (select count(*) from public.quiz_attempts a
           where a.completed
             and (a.created_at at time zone 'Asia/Kuala_Lumpur')::date = s.day)
  from series s
  order by s.day desc;
$$;


-- ------------------------------------------------------------
-- 5. Permissions — the important part
-- ------------------------------------------------------------
-- Signed-in users only. anon is deliberately absent from every
-- one of these grants.
revoke all on function public.quiz_stats()                        from public;
revoke all on function public.quiz_stats_by_class()               from public;
revoke all on function public.quiz_hardest_questions(integer)     from public;
revoke all on function public.quiz_daily_activity(integer)        from public;

grant execute on function public.quiz_stats()                     to authenticated;
grant execute on function public.quiz_stats_by_class()            to authenticated;
grant execute on function public.quiz_hardest_questions(integer)  to authenticated;
grant execute on function public.quiz_daily_activity(integer)     to authenticated;

comment on function public.quiz_stats() is
  'Headline quiz numbers. Signed-in users only - never granted to anon.';


-- ============================================================
-- CHECKING IT
-- ============================================================
--   select * from public.quiz_stats();
--   select * from public.quiz_stats_by_class();
--   select * from public.quiz_hardest_questions(10);
--   select * from public.quiz_daily_activity(14);
--
-- These work in the SQL Editor because it runs as the owner. From
-- a browser they need a signed-in session, which is what
-- quiz-stats.html provides.
-- ============================================================
