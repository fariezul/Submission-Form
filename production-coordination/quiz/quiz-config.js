/* ============================================================
   quiz-config.js — WHERE THE QUIZ SENDS ITS RESULTS
   ============================================================
   This site is static: plain HTML, CSS and JavaScript with no
   build step. Nothing compiles the code before the browser gets
   it, so there is no point at which a NEXT_PUBLIC_* environment
   variable could be substituted in. The settings therefore live
   here, in a file of their own, which is the normal and intended
   way to build a static Supabase site.

   IS IT SAFE TO PUBLISH THE ANON KEY?
   ------------------------------------------------------------
   Yes — that is exactly what it is for. Any key the browser uses
   can be read by anyone who presses F12, so Supabase designed
   the "anon" key to be public. What protects the data is the Row
   Level Security policy, not secrecy about the key. For this
   quiz the policy allows INSERT and nothing else: a visitor can
   record an attempt but cannot read anybody's results, including
   their own. The leaderboard comes from a separate function that
   returns only a name, a class and a time.

   The key that must NEVER appear here is the "service_role" key.
   That one ignores every security rule and belongs only on a
   server.

   See supabase/migrations/20260815_quiz_attempts.sql.
   ============================================================ */

"use strict";

window.QUIZ_CONFIG = {
  /* Same Supabase project as the rest of the site (app.js,
     admin.js) — one project, several tables. */
  SUPABASE_URL: "https://xwjwujyfybjjbatwxoxl.supabase.co",

  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3and1anlmeWJqamJhdHd4b3hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3ODkyNjAsImV4cCI6MjEwMTM2NTI2MH0.SXauGMuzPe-nD-Ba0ZIaf-d0V2XEFD_ISkcQOBTC_OY",

  /* Created by the SQL migration. */
  TABLE: "quiz_attempts",

  /* The hall of fame: perfect scores only, ranked by speed. */
  LEADERBOARD_FUNCTION: "quiz_leaderboard",
  LEADERBOARD_SIZE: 10,

  /* The live class scoreboard on the result screens: everyone's
     most recent attempts, pass or fail. 15 rather than 10 so the
     panel still looks busy once a few students have retried. */
  RECENT_FUNCTION: "quiz_recent_attempts",
  RECENT_SIZE: 15,
};
