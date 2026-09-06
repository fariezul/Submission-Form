/* ============================================================
   quiz-sheets.js — TALKING TO THE GOOGLE SHEET
   ============================================================
   Activity 4 stores results in a Google Sheet rather than
   Supabase, because a free Supabase project pauses after about a
   week of quiet and the first class back finds every save
   failing. A Sheet never sleeps.

   This file deliberately exposes THE SAME THREE FUNCTIONS as
   Activity 3's quiz-supabase.js:

       saveAttempt()          write one finished attempt
       fetchLeaderboard()     fastest perfect scores
       fetchRecentAttempts()  the live class scoreboard

   Because the shape matches, quiz-app.js is a byte-for-byte copy
   of Activity 3's and needs no knowledge of where the data goes.
   Swapping the backend meant replacing exactly one file.

   ------------------------------------------------------------
   THE TWO CORS TRICKS THAT MAKE THIS WORK
   ------------------------------------------------------------
   Apps Script cannot answer a CORS preflight, so anything that
   triggers one fails outright. Two consequences shape the code
   below and neither is optional:

   1. WRITES post with Content-Type "text/plain". That keeps the
      request "simple" in the browser's eyes, so no preflight is
      sent. The body is still JSON — the script parses it itself.
      Setting "application/json" here would break every save.

   2. READS go through JSONP — a <script> tag rather than fetch.
      Apps Script answers a GET happily, but the redirect it
      issues to googleusercontent.com does not reliably carry CORS
      headers back, so fetch can see the request succeed and still
      refuse to let us read it. A script tag has no such rule.
      It is an old technique, and it is the one that works here.
   ============================================================ */

"use strict";

(function (root) {

  const config = root.QUIZ_CONFIG;

  function configured() {
    return !!(config && config.SCRIPT_URL &&
              config.SCRIPT_URL.indexOf("PASTE_YOUR") === -1);
  }

  function pause(ms) {
    return new Promise(function (resolve) { root.setTimeout(resolve, ms); });
  }


  /* ----------------------------------------------------------
     WRITING
     ----------------------------------------------------------
     Retries a few times with a growing pause, because a phone on
     classroom wifi is the normal case. It never reports success
     unless the script actually said ok — a result that failed to
     save is reported as failed, with a Retry button.
     ---------------------------------------------------------- */
  async function post(payload, maxTries) {
    if (!configured()) {
      return {
        ok: false,
        retryable: false,
        error: "The Google Sheet is not connected yet — SCRIPT_URL " +
               "is still the placeholder in quiz4/quiz-config.js.",
      };
    }

    const tries = maxTries || 3;
    let lastError = null;

    for (let attempt = 1; attempt <= tries; attempt++) {
      try {
        const controller =
          typeof AbortController === "function" ? new AbortController() : null;
        const timer = root.setTimeout(function () {
          if (controller) controller.abort();
        }, 15000);

        const response = await fetch(config.SCRIPT_URL, {
          method: "POST",
          // See note 1 at the top. Do not "fix" this to
          // application/json — it would trigger a preflight and
          // every save would fail.
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(
            Object.assign({ token: config.SHARED_TOKEN }, payload)
          ),
          redirect: "follow",
          signal: controller ? controller.signal : undefined,
        }).finally(function () { root.clearTimeout(timer); });

        if (!response.ok) {
          lastError = "Google Sheets returned " + response.status;
        } else {
          const text = await response.text();
          let data = null;
          try { data = JSON.parse(text); } catch (e) { /* not JSON */ }

          if (data && data.ok) return { ok: true };

          if (data && data.error === "bad token") {
            // Wrong token is a configuration fault; retrying it
            // forever would only hide the problem.
            return {
              ok: false,
              retryable: false,
              error: "The sheet rejected the token. SHARED_TOKEN in " +
                     "quiz-config.js must match the one in the Apps Script.",
            };
          }

          lastError = (data && data.error) || ("Unexpected reply: " + text.slice(0, 120));
        }
      } catch (err) {
        lastError =
          err && err.name === "AbortError"
            ? "The connection timed out."
            : (err && err.message) || String(err);
      }

      if (attempt < tries) await pause(attempt === 1 ? 700 : 1800);
    }

    return { ok: false, retryable: true, error: lastError };
  }

  async function saveAttempt(attempt, maxTries) {
    return post({ kind: "attempt", attempt: attempt }, maxTries);
  }

  async function recordVisit(page, isMobile) {
    // Fire and forget — a headcount must never surface to a student.
    return post({ kind: "visit", page: page, is_mobile: !!isMobile }, 1)
      .catch(function () { return { ok: false }; });
  }


  /* ----------------------------------------------------------
     READING — JSONP
     ----------------------------------------------------------
     See note 2 at the top. The script tag calls back into a
     one-off global, which is removed as soon as it fires.
     ---------------------------------------------------------- */
  let jsonpCounter = 0;

  function jsonp(params, timeoutMs) {
    return new Promise(function (resolve) {
      if (!configured()) {
        resolve({ ok: false, error: "The Google Sheet is not connected yet." });
        return;
      }

      const name = "__zwsCb" + (++jsonpCounter) + "_" + Date.now();
      const script = document.createElement("script");
      let done = false;

      function finish(result) {
        if (done) return;
        done = true;
        try { delete root[name]; } catch (e) { root[name] = undefined; }
        if (script.parentNode) script.parentNode.removeChild(script);
        root.clearTimeout(timer);
        resolve(result);
      }

      const timer = root.setTimeout(function () {
        finish({ ok: false, error: "The sheet took too long to answer." });
      }, timeoutMs || 12000);

      root[name] = function (data) {
        if (data && data.ok) finish({ ok: true, rows: data.rows || [] });
        else finish({ ok: false, error: (data && data.error) || "Unexpected reply." });
      };

      const query = Object.keys(params)
        .map(function (k) {
          return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
        })
        .join("&");

      script.src = config.SCRIPT_URL + "?" + query + "&callback=" + name;
      script.onerror = function () {
        finish({ ok: false, error: "Could not reach the Google Sheet." });
      };

      document.head.appendChild(script);
    });
  }

  async function fetchLeaderboard(limit) {
    return jsonp({ action: "leaderboard", limit: limit || config.LEADERBOARD_SIZE });
  }

  async function fetchRecentAttempts(limit) {
    return jsonp({ action: "recent", limit: limit || config.RECENT_SIZE });
  }


  /* Same name and shape as Activity 3, so quiz-app.js does not
     care which backend it is talking to. */
  root.QuizDatabase = {
    saveAttempt: saveAttempt,
    fetchLeaderboard: fetchLeaderboard,
    fetchRecentAttempts: fetchRecentAttempts,
    recordVisit: recordVisit,
    isConfigured: configured,
  };

})(window);
