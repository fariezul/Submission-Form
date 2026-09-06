/* ============================================================
   quiz-visits.js — COUNTING WHO OPENS THE PAGE
   ============================================================
   One row in the Visits tab when someone opens Activity 4, so the
   lecturer can see how many students got as far as looking at it
   — not just how many finished an attempt.

   Same three rules as Activity 3's counter:

   1. It never collects anything identifying. A timestamp and a
      phone/desktop flag. No IP, no user agent, no location, no
      cookie, no fingerprint.

   2. It never breaks the quiz. Every failure is swallowed. If the
      Sheet is unreachable, or SCRIPT_URL is still the
      placeholder, the quiz carries on exactly as if this file
      were not here.

   3. It counts a person, not a keystroke. One visit per tab
      session, so refreshing five times is still one visit.

   The only difference from Activity 3 is where the row goes: it
   hands off to QuizDatabase.recordVisit(), which posts to the
   Apps Script instead of Supabase.
   ============================================================ */

"use strict";

(function (root) {

  const config = root.QUIZ_CONFIG;

  /* sessionStorage, not localStorage, on purpose: it lasts as
     long as the tab and no longer. Coming back tomorrow is a new
     visit, which is what a lecturer would expect. */
  const STORAGE_KEY = "zws-visit-logged";

  /* Below this width we call it a phone. Same 768px the
     stylesheet uses for its tablet breakpoint, so the number
     means the same thing in both places. */
  const MOBILE_MAX_WIDTH = 768;


  function alreadyCounted() {
    try {
      return root.sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch (e) {
      /* Private browsing can block storage entirely. Treat that
         as "not counted" — an over-count is a far smaller problem
         than silently recording nothing. */
      return false;
    }
  }

  function markCounted() {
    try {
      root.sessionStorage.setItem(STORAGE_KEY, "1");
    } catch (e) { /* ignore */ }
  }


  function recordVisit() {
    if (alreadyCounted()) return;

    /* Mark BEFORE sending, not after. If the request is slow and
       something triggers this twice, the flag is already set and
       the second call does nothing. A visit lost to a failed
       network is fine; the same person counted twice quietly
       inflates the funnel, which is worse. */
    markCounted();

    try {
      const isMobile = root.innerWidth > 0 && root.innerWidth < MOBILE_MAX_WIDTH;
      const page = (config && config.PAGE) || "activity-4";

      if (root.QuizDatabase && root.QuizDatabase.recordVisit) {
        // Deliberately not awaited, and its own failures are
        // already swallowed inside recordVisit().
        root.QuizDatabase.recordVisit(page, isMobile);
      }
    } catch (e) {
      /* Silence is correct here. A student must never see an
         error because a headcount failed. */
    }
  }


  /* Fire once, as soon as the script runs. It is deliberately not
     waiting for anything: the whole point is to catch people who
     open the page and leave again.

     This file loads AFTER quiz-sheets.js so QuizDatabase already
     exists by the time this runs. */
  recordVisit();

  // Exposed only so quiz-tests.js can check the constants.
  root.QuizVisits = {
    STORAGE_KEY: STORAGE_KEY,
    MOBILE_MAX_WIDTH: MOBILE_MAX_WIDTH,
    recordVisit: recordVisit,
  };

})(window);
