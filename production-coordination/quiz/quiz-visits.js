/* ============================================================
   quiz-visits.js — COUNTING WHO OPENS THE PAGE
   ============================================================
   Records one row in page_visits when someone opens the quiz, so
   the lecturer can see how many students got as far as looking at
   it — not just how many finished an attempt.

   THREE RULES THIS FILE FOLLOWS
   ------------------------------------------------------------
   1. It never collects anything identifying. A timestamp and a
      phone/desktop flag. No IP, no user agent, no location, no
      cookie, no fingerprint.

   2. It never breaks the quiz. Every failure is swallowed. If
      Supabase is down, or the table does not exist, or the
      student is offline, the quiz carries on exactly as if this
      file were not here.

   3. It counts a person, not a keystroke. One visit per tab
      session, so refreshing five times is still one visit.
   ============================================================ */

"use strict";

(function (root) {

  const config = root.QUIZ_CONFIG;

  /* sessionStorage, not localStorage, on purpose: it lasts as
     long as the tab and no longer. Coming back tomorrow is a new
     visit, which is what a lecturer would expect. */
  const STORAGE_KEY = "zdr-visit-logged";

  const PAGE = "activity-3";

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
    if (!config || !config.SUPABASE_URL) return;
    if (alreadyCounted()) return;

    /* Mark BEFORE sending, not after. If the request is slow and
       something triggers this twice, the flag is already set and
       the second call does nothing. A visit that goes uncounted
       because the network failed is fine; the same person counted
       twice is worse, because it quietly inflates the funnel. */
    markCounted();

    const row = {
      page: PAGE,
      is_mobile: root.innerWidth > 0 && root.innerWidth < MOBILE_MAX_WIDTH,
    };

    try {
      fetch(config.SUPABASE_URL + "/rest/v1/page_visits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": config.SUPABASE_ANON_KEY,
          "Authorization": "Bearer " + config.SUPABASE_ANON_KEY,
          // Save the row, do not send it back. The table has no
          // select policy, so asking for it back would fail.
          "Prefer": "return=minimal",
        },
        body: JSON.stringify(row),

        /* Lets the request finish even if the student navigates
           away immediately — which is exactly the visitor this is
           trying to count. */
        keepalive: true,
      }).catch(function () {
        /* Silence is correct here. A student must never see an
           error because a headcount failed. */
      });
    } catch (e) {
      /* Very old browsers without fetch. Nothing to do. */
    }
  }


  /* Fire once, as soon as the script runs. It is deliberately not
     waiting for anything: the whole point is to catch people who
     open the page and leave again. */
  recordVisit();

  // Exposed only so quiz-tests.js can check the constants.
  root.QuizVisits = {
    PAGE: PAGE,
    STORAGE_KEY: STORAGE_KEY,
    MOBILE_MAX_WIDTH: MOBILE_MAX_WIDTH,
    recordVisit: recordVisit,
  };

})(window);
