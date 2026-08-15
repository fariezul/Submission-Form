-- ============================================================
-- ZERO DEFECT RUSH — database setup
-- ============================================================
-- Table + security for the Chapter 3 revision quiz that lives at
--   /production-coordination/activity-3.html
--
-- HOW TO RUN THIS
--   Supabase dashboard -> SQL Editor -> New query
--   -> paste this whole file -> Run.
--
-- It is safe to run more than once: every statement either uses
-- "if not exists" or "create or replace".
--
-- ------------------------------------------------------------
-- THE SECURITY IDEA IN ONE PARAGRAPH
-- ------------------------------------------------------------
-- The quiz page is public and students never log in, so the
-- browser holds the anon key. That key is allowed to do exactly
-- one thing on this table: INSERT. There is deliberately NO
-- select policy, so nobody can read the table with the public
-- key — not their own row, not anyone else's. The leaderboard is
-- served instead by the quiz_leaderboard() function below, which
-- returns only four harmless columns and only for perfect
-- scores. Failed attempts are never readable from the browser.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Extension (needed for gen_random_uuid)
-- ------------------------------------------------------------
create extension if not exists pgcrypto;


-- ------------------------------------------------------------
-- 2. The table
-- ------------------------------------------------------------
create table if not exists public.quiz_attempts (
  id                uuid         primary key default gen_random_uuid(),

  -- One session = one student sitting down at the start screen.
  -- Retries after a failure keep the same session_id and bump
  -- attempt_number, so a whole revision session can be read back
  -- as a group.
  session_id        uuid         not null,
  attempt_number    integer      not null,

  student_name      text         not null,
  class_name        text         not null,

  score             integer      not null,
  total_questions   integer      not null default 30,
  percentage        numeric(5,2) not null,
  duration_seconds  integer      not null,

  -- completed = "achieved the perfect score". Anything below 30
  -- is NOT COMPLETED, which is the rule for this activity.
  completed         boolean      not null,
  timed_out         boolean      not null default false,

  -- The 30 question ids used, in the order they were shown.
  -- Lets the lecturer see exactly which paper a student sat.
  question_set      jsonb        not null,

  -- What the student picked, per question. The answer KEY is not
  -- stored here — it stays in quiz-questions.js. See the note in
  -- section 6 below.
  responses         jsonb        not null,

  created_at        timestamptz  not null default now(),

  -- --------------------------------------------------------
  -- Validation. The browser is public, so the database is the
  -- last line of defence against junk rows.
  -- --------------------------------------------------------
  constraint quiz_attempts_attempt_number_positive
    check (attempt_number >= 1),

  constraint quiz_attempts_score_range
    check (score >= 0 and score <= total_questions),

  constraint quiz_attempts_total_is_30
    check (total_questions = 30),

  constraint quiz_attempts_percentage_range
    check (percentage >= 0 and percentage <= 100),

  -- 300 s is the real limit; the extra headroom absorbs a slow
  -- final submit or a slightly odd device clock. Anything past
  -- that is not a real attempt.
  constraint quiz_attempts_duration_range
    check (duration_seconds >= 0 and duration_seconds <= 600),

  -- "completed" is not free-form: it must agree with the score.
  -- This is what stops a crafted request claiming a perfect
  -- result with 12 marks and landing on the leaderboard.
  constraint quiz_attempts_completed_matches_score
    check (completed = (score = total_questions)),

  constraint quiz_attempts_name_length
    check (char_length(btrim(student_name)) between 1 and 80),

  constraint quiz_attempts_class_length
    check (char_length(btrim(class_name)) between 1 and 40),

  constraint quiz_attempts_question_set_is_array
    check (jsonb_typeof(question_set) = 'array'),

  constraint quiz_attempts_responses_is_array
    check (jsonb_typeof(responses) = 'array'),

  -- Bound the JSON so the table cannot be used as free storage.
  constraint quiz_attempts_question_set_size
    check (jsonb_array_length(question_set) = 30),

  constraint quiz_attempts_responses_size
    check (jsonb_array_length(responses) <= 30)
);

comment on table public.quiz_attempts is
  'Every Zero Defect Rush attempt, pass or fail. Written by the public anon key; readable only by the service role and the quiz_leaderboard() function.';


-- ------------------------------------------------------------
-- 3. Indexes
-- ------------------------------------------------------------

-- The leaderboard only ever looks at perfect scores, so a
-- PARTIAL index over just those rows keeps it small and fast no
-- matter how many failed attempts pile up.
create index if not exists quiz_attempts_leaderboard_idx
  on public.quiz_attempts (duration_seconds asc, created_at asc)
  where completed = true and score = 30;

-- For reading one student's session back in order.
create index if not exists quiz_attempts_session_idx
  on public.quiz_attempts (session_id, attempt_number);

-- For "what happened today" queries in the dashboard.
create index if not exists quiz_attempts_created_at_idx
  on public.quiz_attempts (created_at desc);


-- ------------------------------------------------------------
-- 4. Row Level Security
-- ------------------------------------------------------------
alter table public.quiz_attempts enable row level security;

-- Drop-then-create so re-running the file cannot fail on a
-- duplicate policy name.
drop policy if exists "Anyone may submit a quiz attempt" on public.quiz_attempts;

create policy "Anyone may submit a quiz attempt"
  on public.quiz_attempts
  for insert
  to anon, authenticated
  with check (true);

-- NOTE: there is intentionally NO select / update / delete
-- policy. With RLS on and no policy, those actions are denied
-- for anon and authenticated. Only the service_role key (server
-- side, never in the browser) and the SQL editor can read the
-- raw table.


-- ------------------------------------------------------------
-- 5. Table privileges
-- ------------------------------------------------------------
-- RLS decides which ROWS; grants decide which VERBS. Both have
-- to allow the insert, so be explicit rather than relying on
-- whatever defaults the project was created with.
grant usage on schema public to anon, authenticated;
grant insert on public.quiz_attempts to anon, authenticated;

-- Belt and braces: make sure the public key cannot read rows
-- even if a default grant handed out select at some point.
revoke select, update, delete on public.quiz_attempts from anon;
revoke select, update, delete on public.quiz_attempts from authenticated;


-- ------------------------------------------------------------
-- 6. The leaderboard function
-- ------------------------------------------------------------
-- Called from the browser as an RPC. It is SECURITY DEFINER, so
-- it runs with the owner's rights and can read the table even
-- though the caller cannot. That is the whole point: the caller
-- gets the four columns below and nothing else — no score, no
-- session id, no failed attempts, no responses.
--
-- "distinct on" keeps each student's BEST time, so one fast
-- student cannot fill all ten places.
create or replace function public.quiz_leaderboard(row_limit integer default 10)
returns table (
  rank             bigint,
  student_name     text,
  class_name       text,
  duration_seconds integer,
  achieved_at      timestamptz
)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  with best_per_student as (
    select distinct on (lower(btrim(a.student_name)), lower(btrim(a.class_name)))
           a.student_name,
           a.class_name,
           a.duration_seconds,
           a.created_at
    from public.quiz_attempts a
    where a.completed = true
      and a.score = 30
    order by lower(btrim(a.student_name)),
             lower(btrim(a.class_name)),
             a.duration_seconds asc,
             a.created_at asc
  )
  select row_number() over (
           order by b.duration_seconds asc, b.created_at asc
         ) as rank,
         b.student_name,
         b.class_name,
         b.duration_seconds,
         b.created_at as achieved_at
  from best_per_student b
  order by b.duration_seconds asc, b.created_at asc
  limit least(greatest(coalesce(row_limit, 10), 1), 50);
$$;

comment on function public.quiz_leaderboard(integer) is
  'Fastest perfect scores only (score = 30). Returns one row per student (their best time). Safe to expose to anon.';

-- Lock the function down to exactly the roles that need it.
revoke all on function public.quiz_leaderboard(integer) from public;
grant execute on function public.quiz_leaderboard(integer) to anon, authenticated;


-- ============================================================
-- USEFUL QUERIES FOR THE LECTURER (run in the SQL editor)
-- ============================================================
--
-- Everyone who has passed, fastest first:
--   select * from public.quiz_leaderboard(50);
--
-- Every attempt by one student:
--   select attempt_number, score, percentage, duration_seconds,
--          timed_out, created_at
--   from public.quiz_attempts
--   where student_name ilike '%ahmad%'
--   order by created_at;
--
-- Which questions are being answered wrongly most often
-- (feed the ids back into quiz-questions.js to see the text):
--   select r ->> 'questionId' as question_id,
--          count(*) filter (where (r ->> 'correct')::boolean is false) as wrong,
--          count(*) as seen
--   from public.quiz_attempts,
--        lateral jsonb_array_elements(responses) as r
--   group by 1
--   order by wrong desc
--   limit 20;
--
-- Pass rate by class:
--   select class_name,
--          count(*) as attempts,
--          count(*) filter (where completed) as passes
--   from public.quiz_attempts
--   group by 1
--   order by 1;
-- ============================================================
