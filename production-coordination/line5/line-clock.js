/* ============================================================
   line-clock.js — MAKING FIVE DEVICES AGREE WHAT TIME IT IS
   ============================================================
   The single hardest problem in this activity, and the one that
   would quietly ruin the data if it were ignored.

   Four students tap "done" on four different phones. Those phones
   do not agree on the time. They are usually within a second or
   two of each other, but "usually" is not good enough here: if
   Folding's phone runs three seconds behind Marking's, then a
   plane can appear to leave Folding BEFORE Marking finished it,
   and the analysis reports a negative process time.

   ------------------------------------------------------------
   HOW IT IS FIXED
   ------------------------------------------------------------
   Nobody's phone is trusted. Instead there is exactly one clock
   that matters — the Google Apps Script's — and every device
   measures how far its own clock is from that one, then adds the
   difference to every reading it takes.

   The measurement is the same trick an internet time client uses:

       t0 = my clock, just before I ask
       ts = the server's clock, in its reply
       t1 = my clock, the moment the reply lands

   The round trip took (t1 - t0), so the reply was written roughly
   half of that ago. Which means, at the instant the reply landed,
   the server's clock read about ts + (t1 - t0) / 2. The gap
   between that and t1 is my offset:

       offset = ts + (t1 - t0) / 2 - t1

   ------------------------------------------------------------
   WHY THE FASTEST SAMPLE WINS
   ------------------------------------------------------------
   That "half the round trip" is a guess, and it is only a good
   guess when the journey out and the journey back took about the
   same time. On classroom wifi one leg is often much slower than
   the other, which throws the estimate off.

   A fast round trip has less room to be lopsided, so it gives a
   better answer. We therefore keep several samples and use the
   one with the shortest round trip, rather than averaging them —
   an average would let the worst measurements drag the good one
   off. This is what NTP does, and for the same reason.

   ------------------------------------------------------------
   WHAT HAPPENS WITH NO NETWORK
   ------------------------------------------------------------
   The offset stays at zero and the device uses its own clock.
   In solo mode that is exactly right, because there is only one
   clock in the room. In team mode it means a phone that has never
   reached the sheet is trusted on its own — which is the best
   anyone can do, and the station page says so on screen.
   ============================================================ */

"use strict";

(function (root) {

  const config = root.LINE_CONFIG || {};
  const KEEP = config.CLOCK_SAMPLES || 5;
  const WARN_MS = config.CLOCK_WARN_MS || 30000;

  /* Every sample ever taken this session, newest last. */
  const samples = [];

  /* The offset currently applied to every reading. */
  let offset = 0;
  let bestRoundTrip = null;

  /* ----------------------------------------------------------
     Record one measurement.
     ----------------------------------------------------------
     Called by line-sheets.js after every single request, so the
     clock keeps re-checking itself all round for free, without
     ever making a request of its own.
     ---------------------------------------------------------- */
  function addSample(sentAt, serverNow, receivedAt) {
    if (typeof serverNow !== "number" || !isFinite(serverNow)) return;
    if (typeof sentAt !== "number" || typeof receivedAt !== "number") return;

    const roundTrip = receivedAt - sentAt;

    // A negative or absurd round trip means the device's own clock
    // moved during the request (a manual change, or waking from
    // sleep). Nothing useful can be measured from it.
    if (roundTrip < 0 || roundTrip > 30000) return;

    samples.push({
      offset: serverNow + roundTrip / 2 - receivedAt,
      roundTrip: roundTrip,
      at: receivedAt,
    });

    while (samples.length > KEEP) samples.shift();

    // Shortest round trip wins. See the note above.
    let best = samples[0];
    for (let i = 1; i < samples.length; i++) {
      if (samples[i].roundTrip < best.roundTrip) best = samples[i];
    }

    offset = best.offset;
    bestRoundTrip = best.roundTrip;
  }

  /* The corrected clock. Everything that stamps a time uses this
     and never Date.now() directly. */
  function now() {
    return Date.now() + offset;
  }

  /* How far into the round are we? Returns null before the round
     has a start, so callers show a dash rather than 1970. */
  function elapsedSince(startedAtMs) {
    if (typeof startedAtMs !== "number" || !isFinite(startedAtMs)) return null;
    return now() - startedAtMs;
  }

  function status() {
    return {
      offsetMs: offset,
      synced: samples.length > 0,
      samples: samples.length,
      bestRoundTripMs: bestRoundTrip,
      /* True when this device's own clock is far enough out that
         somebody should look at its date and time settings. The
         readings are still corrected, but a phone this far off is
         usually a sign of something else being wrong too. */
      deviceClockSuspect: Math.abs(offset) > WARN_MS,
    };
  }

  /* Used only by the tests, to run the maths on known numbers. */
  function reset() {
    samples.length = 0;
    offset = 0;
    bestRoundTrip = null;
  }

  root.LineClock = {
    addSample: addSample,
    now: now,
    elapsedSince: elapsedSince,
    status: status,
    reset: reset,
  };

})(typeof window !== "undefined" ? window : globalThis);
