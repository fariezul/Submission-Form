/* ============================================================
   alumni-config.js — WHERE THE ALUMNI ANSWERS ARE SENT
   ============================================================
   The alumni form writes into its own Google Sheet, through its
   own Apps Script deployment. Nothing here touches the quiz
   sheets or the Supabase registration data.

   ------------------------------------------------------------
   YOU MUST FILL IN SCRIPT_URL BEFORE ANSWERS WILL SAVE
   ------------------------------------------------------------
   Follow the setup steps at the top of
   google-apps-script/alumni-Code.gs, then paste the Web App URL
   below. It looks like:

     https://script.google.com/macros/s/AKfycb..../exec

   Until then the page loads and fills in perfectly, but says
   honestly on submit that it cannot reach the sheet yet. Nobody
   is left thinking their answers were saved when they were not.

   ------------------------------------------------------------
   IS IT SAFE TO PUBLISH THESE?
   ------------------------------------------------------------
   Both values sit in a file the browser downloads, so anyone who
   views source can read them — the same situation as the quiz
   config, and equally deliberate. What protects the data is what
   the Apps Script is willing to DO: append one row and save one
   picture. It cannot read the sheet back, it cannot reach your
   other sheets, and it deletes nothing.

   SHARED_TOKEN must match the value in alumni-Code.gs. It is a
   speed bump against drive-by junk, not a secret. If the sheet
   ever fills with nonsense, change it in both files at the same
   time and redeploy.
   ============================================================ */

"use strict";

window.ALUMNI_CONFIG = {

  /* The deployed Web App. Remember that editing alumni-Code.gs
     changes nothing until you redeploy it as a NEW VERSION —
     Deploy -> Manage deployments -> pencil -> Version: New version. */
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzfv3UpdE4x-1sjzXUC5wzOVekVzcVWrtbMMyQOkctzkE6z0evqCWQEf_lMiJ-k18L2/exec",

  /* Must match SHARED_TOKEN in alumni-Code.gs. */
  SHARED_TOKEN: "alumni-dtp-iac-2026",

  /* Photographs from a modern phone are 4000 pixels wide and
     several megabytes. Nobody needs that for an alumni record, and
     a big upload is exactly what fails on a weak signal. The page
     shrinks the longest side to this many pixels before sending. */
  PHOTO_MAX_SIDE: 1400,

  /* JPEG quality after shrinking: 0.85 is visually clean and
     roughly a tenth of the size of the original. */
  PHOTO_QUALITY: 0.85,

  /* Largest file the page will accept from the picker, in
     megabytes, BEFORE shrinking. */
  PHOTO_MAX_MB: 15,
};
