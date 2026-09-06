/* ============================================================
   quiz-config.js — WHERE ACTIVITY 4 SENDS ITS RESULTS
   ============================================================
   Activity 4 stores results in a GOOGLE SHEET, not Supabase.

   Why the difference: a free Supabase project pauses after about
   a week without traffic. Activity 3 hit exactly that — the
   project went to sleep and every save failed until it was
   restored by hand. A Google Sheet never sleeps, needs no
   keep-warm job, and the lecturer can open the data directly
   instead of writing SQL.

   ------------------------------------------------------------
   YOU MUST FILL IN SCRIPT_URL BEFORE RESULTS WILL SAVE
   ------------------------------------------------------------
   Follow the setup steps at the top of
   google-apps-script/activity-4-Code.gs, then paste the Web App
   URL below. It looks like:

     https://script.google.com/macros/s/AKfycb..../exec

   Until then the quiz plays perfectly and tells the student
   honestly that the result could not be saved.

   ------------------------------------------------------------
   IS IT SAFE TO PUBLISH THESE?
   ------------------------------------------------------------
   Both values sit in a file the browser downloads, so anyone can
   read them — the same situation as the Supabase anon key on
   Activity 3, and equally deliberate. What protects the data is
   what the Apps Script is willing to DO: append a row, or return
   a leaderboard and a scoreboard. It cannot reach your other
   sheets and it deletes nothing.

   SHARED_TOKEN must match the value in the Apps Script. It is a
   speed bump against drive-by junk, not a secret.
   ============================================================ */

"use strict";

window.QUIZ_CONFIG = {

  /* The deployed Web App. Remember that editing activity-4-Code.gs
     changes nothing until you redeploy it as a NEW VERSION —
     Deploy -> Manage deployments -> pencil -> Version: New version. */
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzOQKDzdmFkWxxEGqmWH7Sqe17cDo_YGHOMXcYtYTqSvvvFLVlUx03WusHs66ZSmTLK/exec",

  /* Must match SHARED_TOKEN in activity-4-Code.gs. */
  SHARED_TOKEN: "zws-2026-iqa10063",

  /* Used when recording that the page was opened. */
  PAGE: "activity-4",

  /* The hall of fame: perfect scores only, ranked by speed. */
  LEADERBOARD_SIZE: 10,

  /* The live class scoreboard on the result screens. */
  RECENT_SIZE: 15,
};
