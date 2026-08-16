-- ============================================================
-- ZERO DEFECT RUSH — email the lecturer when a student finishes
-- ============================================================
-- OPTIONAL. The quiz works perfectly without this. It exists so
-- you find out that someone has aced the challenge without having
-- to go and look.
--
-- ------------------------------------------------------------
-- ⚠️  DO NOT COMMIT A REAL API KEY IN THIS FILE
-- ------------------------------------------------------------
-- The two placeholders below are deliberately fake. Fill them in
-- when you PASTE this into the Supabase SQL Editor — not here in
-- the file. This repository is pushed to GitHub, and an API key
-- committed to a repository has to be treated as burned even if
-- you delete it in the next commit.
--
-- The key is safe once it is inside the database: this runs on
-- the server, and nothing in the browser can read a function
-- body. It is only the git history that would leak it.
--
-- ------------------------------------------------------------
-- HOW IT WORKS
-- ------------------------------------------------------------
--   student finishes  ->  row inserted into quiz_attempts
--                     ->  this trigger fires
--                     ->  pg_net sends an HTTP request (async)
--                     ->  Resend delivers the email
--
-- pg_net is asynchronous, so the student's save never waits for
-- the email, and a slow mail provider cannot slow down the quiz.
--
-- ------------------------------------------------------------
-- BEFORE YOU RUN THIS
-- ------------------------------------------------------------
-- 1. Sign up at resend.com (free tier: 100 emails/day).
-- 2. Create an API key. It looks like re_xxxxxxxxxxxx.
-- 3. Leave the "from" address as onboarding@resend.dev. That
--    sender works with no DNS setup at all, but it can ONLY send
--    to the email address you registered with Resend. Since you
--    are the only recipient, that is exactly what you want.
--
--    (If you ever want it to send elsewhere, you would verify
--    farizuljaafar.com in Resend and change the from address to
--    something like quiz@farizuljaafar.com.)
-- ============================================================


-- ------------------------------------------------------------
-- 1. The extension that lets Postgres make HTTP calls
-- ------------------------------------------------------------
-- If this line errors, your project does not have pg_net and the
-- rest of this file will not work. Check
-- Database -> Extensions in the dashboard.
create extension if not exists pg_net;


-- ------------------------------------------------------------
-- 2. The notifier
-- ------------------------------------------------------------
create or replace function public.notify_quiz_attempt()
returns trigger
language plpgsql
security definer
set search_path = public, net, pg_temp
as $$
declare
  -- ======= FILL THESE TWO IN =======
  api_key   text := 'RESEND_API_KEY_HERE';   -- re_xxxxxxxxxxxx
  send_to   text := 'fariezul@gmail.com';    -- where to send it
  -- =================================

  subject_line text;
  body_html    text;
begin
  /* ----------------------------------------------------------
     FULL MARKS ONLY
     ----------------------------------------------------------
     Nothing is sent unless the student scored 30/30.

     Two reasons. A class of 40 with retries easily produces 100+
     attempts in one lesson, and an inbox with 100 messages in it
     is an inbox you stop reading. And a perfect score is the only
     outcome this activity treats as a pass, so it is the only one
     that is actually news.

     Everything else is still recorded in quiz_attempts and still
     appears on the class scoreboard — it just does not email you.

     (To be told about every attempt instead, delete the three
     lines below. The digest at the bottom of this file is the
     saner way to get that.)
     ---------------------------------------------------------- */
  if not new.completed then
    return new;
  end if;

  subject_line := '🏆 ' || new.student_name || ' scored ' ||
                  new.score || '/' || new.total_questions ||
                  ' — ' || new.class_name;

  body_html :=
    '<h2 style="margin:0 0 4px">🏆 Full marks</h2>' ||
    '<p style="margin:0 0 16px;color:#666">Zero Defect Rush · Chapter 3</p>' ||
    '<table cellpadding="7" style="border-collapse:collapse;font-family:Arial,sans-serif">' ||
      '<tr><td style="color:#666">Student</td><td><strong>' ||
        new.student_name || '</strong></td></tr>' ||
      '<tr><td style="color:#666">Class</td><td>' || new.class_name || '</td></tr>' ||
      '<tr><td style="color:#666">Score</td><td><strong>' ||
        new.score || ' / ' || new.total_questions ||
        '</strong> (' || round(new.percentage) || '%)</td></tr>' ||
      '<tr><td style="color:#666">Time taken</td><td>' ||
        to_char((new.duration_seconds || ' seconds')::interval, 'MI:SS') || '</td></tr>' ||
      '<tr><td style="color:#666">Attempt</td><td>#' || new.attempt_number ||
        case when new.attempt_number = 1 then ' (first try)' else '' end ||
        '</td></tr>' ||
      '<tr><td style="color:#666">Finished</td><td>' ||
        to_char(new.created_at at time zone 'Asia/Kuala_Lumpur',
                'DD Mon YYYY, HH24:MI') || '</td></tr>' ||
    '</table>' ||
    '<p style="color:#666;font-size:12px;margin-top:18px">' ||
    'Corrective Action and Process Improvement · IQA 10063 · ' ||
    'TVETMARA Masjid Tanah</p>';

  /* ----------------------------------------------------------
     Send it.

     The exception block matters more than it looks. Without it,
     a bad API key or a network blip would abort the whole
     transaction — and the student's RESULT WOULD FAIL TO SAVE.
     A notification is never worth losing a mark over, so every
     failure here is swallowed silently.
     ---------------------------------------------------------- */
  begin
    perform net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || api_key
      ),
      body := jsonb_build_object(
        'from',    'Zero Defect Rush <onboarding@resend.dev>',
        'to',      jsonb_build_array(send_to),
        'subject', subject_line,
        'html',    body_html
      )
    );
  exception when others then
    null;   -- never let a failed email break a student's save
  end;

  return new;
end;
$$;

comment on function public.notify_quiz_attempt() is
  'Emails the lecturer via Resend when a student records a perfect score. Failures are swallowed so a notification can never block an insert.';


-- ------------------------------------------------------------
-- 3. The trigger
-- ------------------------------------------------------------
drop trigger if exists quiz_attempt_notify on public.quiz_attempts;

create trigger quiz_attempt_notify
after insert on public.quiz_attempts
for each row
execute function public.notify_quiz_attempt();


-- ============================================================
-- TURNING IT OFF
-- ============================================================
--   drop trigger if exists quiz_attempt_notify on public.quiz_attempts;
--
-- The function can stay; without the trigger it never runs.
--
-- ============================================================
-- CHECKING IT WORKS
-- ============================================================
-- Play one round and score 30/30. The email should arrive within
-- a few seconds.
--
-- If nothing arrives, pg_net records every call it made:
--
--   select id, created, url, status_code, content
--   from net._http_response
--   order by created desc
--   limit 5;
--
-- A 200 means Resend accepted it (check your spam folder).
-- A 401 means the API key is wrong.
-- A 403 usually means you are sending to an address other than
-- the one you registered with Resend, while still using the
-- onboarding@resend.dev sender.
-- No rows at all means the trigger never fired — check that the
-- attempt really was 30/30, since that is the default filter.
--
-- ============================================================
-- A CALMER ALTERNATIVE: ONE DIGEST A DAY
-- ============================================================
-- If you would rather have a single summary than a message per
-- student, drop the trigger above and schedule this instead
-- (needs the pg_cron extension):
--
--   select cron.schedule(
--     'quiz-daily-digest',
--     '0 18 * * *',                     -- 18:00 every day
--     $$ ... a function that selects the day's rows and sends
--          one email ... $$
--   );
--
-- Ask and I will write that version out properly.
-- ============================================================
