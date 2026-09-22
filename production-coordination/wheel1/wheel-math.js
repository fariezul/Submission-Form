/* ============================================================
   wheel-math.js — WHO WINS, AND WHERE THE WHEEL STOPS
   ============================================================
   Pure functions only: no page, no canvas, no sound. That is
   what lets wheel-tests.js check them from Node.

   THE ONE IDEA THAT MATTERS
   The winner is chosen FIRST, with the browser's cryptographic
   random number generator, and only then is the wheel told where
   to stop. The animation is theatre. It never decides anything,
   so a slow laptop, a dropped frame or a spin that is cut short
   can never change who was picked — and every name has exactly
   the same chance.

   ANGLES
   Everything here is in degrees, measured clockwise from the
   pointer at the top of the wheel. "rotation" is how far the
   wheel has turned in total since the page loaded; it keeps
   growing and is never wrapped back to 0-360, because a wheel
   that suddenly jumped back a turn would visibly twitch.

   With the wheel at rotation 0, segment 0 starts right under
   the pointer and the segments follow clockwise. Turning the
   wheel clockwise carries them past the pointer, so the name
   under the pointer is the one that has come round from the
   left.
   ============================================================ */

"use strict";

(function (root) {

  /* A modulo that is never negative: mod(-10, 360) is 350,
     where JavaScript's own -10 % 360 is -10. */
  function mod(a, n) {
    return ((a % n) + n) % n;
  }

  /* Which segment is under the pointer at this rotation. */
  function segmentAt(rotation, count) {
    if (count <= 0) return -1;
    const size = 360 / count;
    const i = Math.floor(mod(-rotation, 360) / size);
    // Floating point can land exactly on 360 / size; that is the
    // last segment, not one past it.
    return Math.min(i, count - 1);
  }

  /* A random whole number from 0 to count - 1, every value equally
     likely.

     nextUint32 returns a random number from 0 to 4 294 967 295.
     Taking "% count" of that directly would be very slightly
     unfair, because 2^32 does not divide evenly by most class
     sizes. So any draw from the uneven tail at the top of the
     range is thrown away and drawn again. With 30 names the
     chance of a redraw is about one in 143 million. */
  function pickIndex(count, nextUint32) {
    if (count <= 0) return -1;
    const RANGE = 4294967296;               // 2^32
    const limit = RANGE - (RANGE % count);  // largest fair multiple
    for (let tries = 0; tries < 1000; tries++) {
      const r = nextUint32();
      if (r < limit) return r % count;
    }
    // Only a broken random source could get here.
    throw new Error("The random number source kept returning the same value.");
  }

  /* The browser's secure random numbers — the same generator used
     for encryption keys, so nobody can predict the next pick. */
  function cryptoUint32() {
    const c = root.crypto;
    if (c && typeof c.getRandomValues === "function") {
      const buf = new Uint32Array(1);
      c.getRandomValues(buf);
      return buf[0];
    }
    // Very old browsers only. Still fair enough for a classroom.
    return Math.floor(Math.random() * 4294967296);
  }

  /* A random number from 0 up to (not including) 1, built from the
     same secure source. Used for the length and landing point of
     a spin, which do not affect who wins. */
  function cryptoUnit(nextUint32) {
    return (nextUint32 || cryptoUint32)() / 4294967296;
  }

  /* Where the wheel must stop so that segment "index" sits under
     the pointer.

       current   the rotation now
       index     the winner, from pickIndex
       count     how many segments there are
       turns     whole turns to make first (at least 1)
       landing   0-1: how far into the segment the pointer ends
                 up. It is clamped away from the edges so the
                 pointer never stops on a dividing line, where
                 the class would argue about which name it meant.

     The answer is always MORE than "turns" full circles ahead of
     "current", so the wheel only ever turns one way. */
  function targetRotation(current, index, count, turns, landing) {
    const size = 360 / count;
    const inside = 0.15 + 0.7 * clamp(landing, 0, 1);
    // The pointer is over segment "index" when -rotation (mod 360)
    // falls inside it.
    const wanted = -(index + inside) * size;
    const ahead = mod(wanted - current, 360);
    return current + ahead + 360 * Math.max(1, Math.floor(turns));
  }

  /* The shape of the spin: fast at first, then a long, slow
     coast to a stop. That last second of creeping past one name
     after another is the whole fun of a wheel. */
  function easeOut(t) {
    const u = 1 - clamp(t, 0, 1);
    return 1 - u * u * u * u;
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  /* Which palette colour segment i gets, out of count segments.
     Going round in order works until the last segment, which
     would be the same colour as segment 0 beside it whenever
     count is one more than a multiple of the palette. Then the
     last segment borrows a colour neither neighbour has. */
  function colourIndex(i, count, paletteSize) {
    const plain = i % paletteSize;
    if (count > 1 && i === count - 1 && plain === 0) {
      return 2 % paletteSize;
    }
    return plain;
  }

  /* Turn whatever was pasted into the box into a clean list.
     One name per line. A single line with commas in it is taken
     as a comma-separated list, since that is what a register
     copied out of an email usually looks like. Spare spaces go;
     blank lines are ignored. Two people with the same name both
     stay on the wheel. */
  function parseNames(text) {
    const raw = String(text || "").replace(/\r\n?/g, "\n");
    let parts = raw.split("\n");
    const filled = parts.filter(function (s) { return s.trim() !== ""; });
    if (filled.length === 1 && filled[0].indexOf(",") !== -1) {
      parts = filled[0].split(",");
    }
    return parts
      .map(function (s) { return s.replace(/\s+/g, " ").trim(); })
      .filter(function (s) { return s !== ""; });
  }

  /* A fair shuffle (Fisher-Yates), using the secure source. */
  function shuffle(list, nextUint32) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = pickIndex(i + 1, nextUint32 || cryptoUint32);
      const t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }

  root.WheelMath = {
    mod: mod,
    segmentAt: segmentAt,
    pickIndex: pickIndex,
    cryptoUint32: cryptoUint32,
    cryptoUnit: cryptoUnit,
    targetRotation: targetRotation,
    easeOut: easeOut,
    clamp: clamp,
    colourIndex: colourIndex,
    parseNames: parseNames,
    shuffle: shuffle,
  };

})(typeof window !== "undefined" ? window : globalThis);
