/* ============================================================
   line-sheets.js — TALKING TO THE GOOGLE SHEET
   ============================================================
   The same two CORS tricks as Activity 4, for the same reasons.
   If you have read quiz4/quiz-sheets.js, you already know this
   file; the differences are at the bottom.

   ------------------------------------------------------------
   THE TWO TRICKS, BRIEFLY
   ------------------------------------------------------------
   1. WRITES post with Content-Type "text/plain". That keeps the
      request "simple" in the browser's eyes, so no CORS preflight
      is sent — and Apps Script cannot answer a preflight. The
      body is still JSON; the script parses it itself. Changing
      this to "application/json" would break every save.

   2. READS go through JSONP — a <script> tag rather than fetch.
      Apps Script answers a GET happily, but the redirect it
      issues to googleusercontent.com does not reliably carry CORS
      headers back, so fetch can see the request succeed and still
      refuse to let us read it. A script tag has no such rule.

   ------------------------------------------------------------
   WHAT IS DIFFERENT HERE
   ------------------------------------------------------------
   Activity 4 saved one row at the end of a quiz. This saves a
   stream of taps during a live activity, from five devices at
   once, on classroom wifi. Three consequences:

   * EVERY reply carries the server's clock, and every reply is
     handed to line-clock.js. The clock therefore keeps correcting
     itself all round without ever making a request of its own.

   * Writes are sent in BATCHES. A station that has been offline
     for two minutes uploads all its waiting taps in one request
     rather than eight.

   * Nothing here ever blocks a student's tap. The tap is stamped
     and stored locally the instant a thumb lands on the button;
     this file is only ever the postman.
   ============================================================ */

"use strict";

(function (root) {

  const config = root.LINE_CONFIG || {};
  const clock = root.LineClock;

  function configured() {
    return !!(config.SCRIPT_URL &&
              config.SCRIPT_URL.indexOf("PASTE_YOUR") === -1);
  }

  function pause(ms) {
    return new Promise(function (resolve) { root.setTimeout(resolve, ms); });
  }

  /* Hand every reply's server clock to line-clock.js. This is the
     only place that happens, which is why it is a one-liner
     everywhere else. */
  function absorbClock(sentAt, data) {
    if (clock && data && typeof data.server_now === "number") {
      clock.addSample(sentAt, data.server_now, Date.now());
    }
  }


  /* ==========================================================
     WRITING
     ==========================================================
     Retries with a growing pause, because a phone on classroom
     wifi is the normal case rather than the exception. It never
     claims success unless the script actually said ok — the
     caller keeps unsent taps in its outbox and tries again.
     ========================================================== */
  async function post(payload, maxTries) {
    if (!configured()) {
      return {
        ok: false,
        retryable: false,
        offline: true,
        error: "No Google Sheet is connected — SCRIPT_URL is still the " +
               "placeholder in line5/line-config.js. Solo mode works fine " +
               "without it.",
      };
    }

    const tries = maxTries || 3;
    let lastError = null;

    for (let attempt = 1; attempt <= tries; attempt++) {
      const sentAt = Date.now();

      try {
        const controller =
          typeof AbortController === "function" ? new AbortController() : null;
        const timer = root.setTimeout(function () {
          if (controller) controller.abort();
        }, 15000);

        const response = await fetch(config.SCRIPT_URL, {
          method: "POST",
          // See trick 1 at the top. Do not "fix" this to
          // application/json — every save would fail.
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

          absorbClock(sentAt, data);

          if (data && data.ok) return { ok: true, data: data };

          if (data && data.error === "bad token") {
            // A wrong token is a configuration fault. Retrying it
            // forever would only hide the problem.
            return {
              ok: false,
              retryable: false,
              error: "The sheet rejected the token. SHARED_TOKEN in " +
                     "line-config.js must match the one in activity-5-Code.gs.",
            };
          }

          lastError = (data && data.error) ||
                      ("Unexpected reply: " + text.slice(0, 120));
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


  /* ==========================================================
     READING — JSONP
     ==========================================================
     See trick 2 at the top. The script tag calls back into a
     one-off global, which is removed the moment it fires.
     ========================================================== */
  let jsonpCounter = 0;

  function jsonp(params, timeoutMs) {
    return new Promise(function (resolve) {
      if (!configured()) {
        resolve({ ok: false, offline: true, error: "No Google Sheet is connected." });
        return;
      }

      const sentAt = Date.now();
      const name = "__flCb" + (++jsonpCounter) + "_" + Date.now();
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
        finish({ ok: false, retryable: true, error: "The sheet took too long to answer." });
      }, timeoutMs || 12000);

      root[name] = function (data) {
        absorbClock(sentAt, data);
        if (data && data.ok) finish({ ok: true, data: data });
        else finish({ ok: false, retryable: true, error: (data && data.error) || "Unexpected reply." });
      };

      const query = Object.keys(params)
        .map(function (k) {
          return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
        })
        .join("&");

      script.src = config.SCRIPT_URL + "?" + query + "&callback=" + name;
      script.onerror = function () {
        finish({ ok: false, retryable: true, error: "Could not reach the Google Sheet." });
      };

      document.head.appendChild(script);
    });
  }


  /* ==========================================================
     THE ACTUAL OPERATIONS
     ========================================================== */

  /* Start a round. The SERVER decides what time zero is and sends
     it back, so all five devices are counting from the same
     instant rather than from whenever each of them noticed. */
  function startRound(round) {
    return post({ kind: "round_start", round: round });
  }

  function endRound(code, roundNo, notes) {
    return post({ kind: "round_end", code: code, round_no: roundNo, notes: notes || "" });
  }

  function saveNotes(code, roundNo, notes) {
    return post({ kind: "notes", code: code, round_no: roundNo, notes: notes || "" });
  }

  /* Upload a batch of taps. Called by the outbox in line-store.js.
     Only two attempts: if it fails, the taps stay in the outbox
     and the next cycle will try again anyway, so a long retry here
     would just delay that. */
  function pushEvents(code, roundNo, events) {
    return post({
      kind: "events",
      code: code,
      round_no: roundNo,
      events: events,
    }, 2);
  }

  /* Everything the dashboard needs for one round, in one request:
     the header and every tap so far. */
  function fetchRound(code, roundNo) {
    const params = { action: "round", code: code };
    if (typeof roundNo === "number") params.round_no = roundNo;
    return jsonp(params);
  }

  /* Just the round headers, for the comparison tab. */
  function fetchRounds(code) {
    return jsonp({ action: "rounds", code: code });
  }

  /* Asks the sheet for nothing except the time, so a device can
     synchronise its clock before a round exists. */
  function ping() {
    return jsonp({ action: "ping" }, 8000);
  }

  function recordVisit(page, isMobile) {
    return post({ kind: "visit", page: page, is_mobile: !!isMobile }, 1)
      .catch(function () { return { ok: false }; });
  }


  root.LineSheets = {
    isConfigured: configured,
    startRound: startRound,
    endRound: endRound,
    saveNotes: saveNotes,
    pushEvents: pushEvents,
    fetchRound: fetchRound,
    fetchRounds: fetchRounds,
    ping: ping,
    recordVisit: recordVisit,
  };

})(typeof window !== "undefined" ? window : globalThis);
