/* ============================================================
   quiz-supabase.js — TALKING TO THE DATABASE
   ============================================================
   Two jobs:

     saveAttempt()     write one finished attempt
     fetchLeaderboard() read the fastest perfect scores

   Both go through Supabase's REST API with plain fetch(), the
   same approach app.js already uses on this site. No client
   library, no bundler, nothing to install.

   RELIABILITY
   ------------------------------------------------------------
   The save retries a few times with a growing pause, because a
   phone on shaky classroom Wi-Fi is the normal case, not the
   exception. It never reports success unless the database
   actually accepted the row — a result that failed to save is
   reported as failed, with a Retry button.
   ============================================================ */

"use strict";

(function (root) {

  const config = root.QUIZ_CONFIG;

  /* Distinguishes "the server said no" from "the network died",
     so the caller can decide whether retrying is worthwhile. */
  function requestHeaders() {
    return {
      "Content-Type": "application/json",
      "apikey": config.SUPABASE_ANON_KEY,
      "Authorization": "Bearer " + config.SUPABASE_ANON_KEY,
    };
  }

  /* fetch() has no timeout of its own — without this a request
     on a dead connection can hang until the user gives up. */
  function fetchWithTimeout(url, options, timeoutMs) {
    const controller =
      typeof AbortController === "function" ? new AbortController() : null;

    const settings = Object.assign({}, options);
    if (controller) settings.signal = controller.signal;

    const timer = root.setTimeout(function () {
      if (controller) controller.abort();
    }, timeoutMs || 12000);

    return fetch(url, settings).finally(function () {
      root.clearTimeout(timer);
    });
  }

  function pause(ms) {
    return new Promise(function (resolve) { root.setTimeout(resolve, ms); });
  }


  /* ----------------------------------------------------------
     SAVING AN ATTEMPT
     ----------------------------------------------------------
     One row per attempt, written once when the quiz ends — not
     one row per question. The responses travel as JSONB inside
     that single row, which keeps the database traffic to a
     single request per attempt.

     Note "Prefer: return=minimal": it tells Supabase to save the
     row without sending it back. That matters here, because
     asking for the row back would also need a SELECT policy, and
     this table deliberately has none.
     ---------------------------------------------------------- */
  async function saveAttempt(attempt, maxTries) {
    const url = config.SUPABASE_URL + "/rest/v1/" + config.TABLE;
    const tries = maxTries || 3;
    let lastError = null;

    for (let attemptNo = 1; attemptNo <= tries; attemptNo++) {
      try {
        const response = await fetchWithTimeout(url, {
          method: "POST",
          headers: Object.assign(requestHeaders(), { "Prefer": "return=minimal" }),
          body: JSON.stringify(attempt),
        });

        if (response.ok) return { ok: true };

        const details = await response.text();

        /* 4xx means the request itself is wrong — a missing table,
           a constraint the row breaks, a bad key. Sending it again
           unchanged will fail again, so stop now. 5xx and network
           errors are worth another go. */
        if (response.status >= 400 && response.status < 500) {
          return {
            ok: false,
            retryable: false,
            status: response.status,
            error: "Supabase rejected the result (" + response.status + "): " + details,
          };
        }

        lastError = "Supabase returned " + response.status + ": " + details;
      } catch (err) {
        lastError =
          err && err.name === "AbortError"
            ? "The connection timed out."
            : (err && err.message) || String(err);
      }

      // Back off before trying again: 600 ms, then 1500 ms.
      if (attemptNo < tries) await pause(attemptNo === 1 ? 600 : 1500);
    }

    return { ok: false, retryable: true, error: lastError };
  }


  /* ----------------------------------------------------------
     READING THE LEADERBOARD
     ----------------------------------------------------------
     Calls the quiz_leaderboard() function rather than selecting
     from the table. The function returns only name, class, time
     and date, and only for perfect scores — so the public key
     can never pull back scores, session ids or failed attempts.
     ---------------------------------------------------------- */
  async function fetchLeaderboard(limit) {
    const url =
      config.SUPABASE_URL + "/rest/v1/rpc/" + config.LEADERBOARD_FUNCTION;

    try {
      const response = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: requestHeaders(),
          body: JSON.stringify({ row_limit: limit || config.LEADERBOARD_SIZE }),
        },
        10000
      );

      if (!response.ok) {
        const details = await response.text();
        return {
          ok: false,
          error: "Could not load the leaderboard (" + response.status + "): " + details,
        };
      }

      const rows = await response.json();
      return { ok: true, rows: Array.isArray(rows) ? rows : [] };
    } catch (err) {
      return {
        ok: false,
        error:
          err && err.name === "AbortError"
            ? "The leaderboard took too long to load."
            : (err && err.message) || String(err),
      };
    }
  }


  /* ----------------------------------------------------------
     READING THE LIVE CLASS SCOREBOARD
     ----------------------------------------------------------
     The most recent attempts by everyone, for the panel on the
     result screens. Like the leaderboard it goes through a
     function rather than selecting from the table, so the public
     key still cannot read session ids, question sets or
     responses — only the scores.
     ---------------------------------------------------------- */
  async function fetchRecentAttempts(limit) {
    const url = config.SUPABASE_URL + "/rest/v1/rpc/" + config.RECENT_FUNCTION;

    try {
      const response = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: requestHeaders(),
          body: JSON.stringify({ row_limit: limit || config.RECENT_SIZE }),
        },
        10000
      );

      if (!response.ok) {
        const details = await response.text();
        return {
          ok: false,
          error: "Could not load the scoreboard (" + response.status + "): " + details,
        };
      }

      const rows = await response.json();
      return { ok: true, rows: Array.isArray(rows) ? rows : [] };
    } catch (err) {
      return {
        ok: false,
        error:
          err && err.name === "AbortError"
            ? "The scoreboard took too long to load."
            : (err && err.message) || String(err),
      };
    }
  }


  root.QuizDatabase = {
    saveAttempt: saveAttempt,
    fetchLeaderboard: fetchLeaderboard,
    fetchRecentAttempts: fetchRecentAttempts,
  };

})(window);
