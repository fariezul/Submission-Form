/* ============================================================
   quiz-config.js — WHERE ACTIVITY 6 SENDS ITS RESULTS
   ============================================================
   Activity 7 uses its own Google Sheet and Apps Script deployment.

   ------------------------------------------------------------
   YOU MUST FILL IN SCRIPT_URL BEFORE RESULTS WILL SAVE
   ------------------------------------------------------------
   Follow the setup steps at the top of
   google-apps-script/composite-repair-activity-2-Code.gs, then paste the Web App
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

  /* ===== PASTE THIS ACTIVITY'S OWN WEB APP URL HERE =====
     It must be the deployment of
     google-apps-script/composite-repair-activity-2-Code.gs, attached
     to its own new Sheet.

     Do NOT paste Activity 7's URL, or any other activity's. They all
     look alike, and the wrong one fails silently in the worst way:
     every save succeeds, and Composite Repair results quietly pile up
     in a Production Coordination spreadsheet.

     Until this is filled in, the quiz plays perfectly and tells the
     student honestly that the result could not be saved.

     Remember that editing composite-repair-activity-2-Code.gs changes
     nothing until you redeploy it as a NEW VERSION —
     Deploy -> Manage deployments -> pencil -> Version: New version. */
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxhDpQVsyWB41tZIigSl-SUzNQt8JtADYi45gBNRHN0esDZr687g-PmzvHWcNSyl5lElA/exec",

  /* Must match SHARED_TOKEN in composite-repair-activity-2-Code.gs. */
  SHARED_TOKEN: "crr-2026-dqp50153",

  /* Used when recording that the page was opened. */
  PAGE: "cr-activity-2",

  /* The hall of fame: perfect scores only, ranked by speed. */
  LEADERBOARD_SIZE: 10,

  /* The live class scoreboard on the result screens. */
  RECENT_SIZE: 15,
};
