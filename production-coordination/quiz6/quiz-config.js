/* ============================================================
   quiz-config.js — WHERE ACTIVITY 6 SENDS ITS RESULTS
   ============================================================
   Activity 6 uses its own Google Sheet and Apps Script deployment.

   ------------------------------------------------------------
   YOU MUST FILL IN SCRIPT_URL BEFORE RESULTS WILL SAVE
   ------------------------------------------------------------
   Follow the setup steps at the top of
   google-apps-script/activity-6-Code.gs, then paste the Web App
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

  /* The deployed Web App. Remember that editing activity-6-Code.gs
     changes nothing until you redeploy it as a NEW VERSION —
     Deploy -> Manage deployments -> pencil -> Version: New version. */
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzuDA9_WgF2CrUS7DJNDBaJwzFDwiTBl-VYb4rsLY_olaT33RV-kWmLz4RLIrtMxvc7Vg/exec",

  /* Must match SHARED_TOKEN in activity-6-Code.gs. */
  SHARED_TOKEN: "rev1-2026-iqa10063",

  /* Used when recording that the page was opened. */
  PAGE: "activity-6",

  /* The hall of fame: perfect scores only, ranked by speed. */
  LEADERBOARD_SIZE: 10,

  /* The live class scoreboard on the result screens. */
  RECENT_SIZE: 15,
};
