/* ============================================================
   quiz-engine.js — THE RULES OF THE GAME
   ============================================================
   Everything in this file is pure logic: picking questions,
   shuffling, marking answers, tracking the clock. It never
   touches the page. That separation is deliberate — it means
   the rules can be tested by running them in Node, without a
   browser (see quiz-tests.js).
   ============================================================ */

"use strict";

(function (root) {

  /* ----------------------------------------------------------
     SETTINGS
     ---------------------------------------------------------- */
  const QUESTIONS_PER_ATTEMPT = 30;
  const TIME_LIMIT_MS = 5 * 60 * 1000;   // 300 000 ms = 5:00

  /* How many of each type we try to include in every attempt.
     ----------------------------------------------------------
     Without this, drawing 30 at random from a bank that is
     mostly single-choice would give an attempt that is almost
     entirely single-choice. The quotas guarantee a real mixture
     while everything else stays random. Any shortfall (a type
     with a small pool) is simply topped up from the rest of the
     bank, so the attempt is always exactly 30 questions.
     ---------------------------------------------------------- */
  const TYPE_QUOTAS = {
    "image-choice": 3,
    "true-false": 4,
    "sequence-choice": 2,
    "multiple-select": 2,
  };


  /* ----------------------------------------------------------
     RANDOMNESS
     ----------------------------------------------------------
     Fisher-Yates: walk the array from the end, swapping each
     item with a random earlier one. Every ordering is equally
     likely, which the "sort(() => Math.random() - 0.5)" trick
     people often reach for is NOT.
     ---------------------------------------------------------- */

  /* A random whole number from 0 to max-1. Uses the browser's
     crypto source when it exists so the sequence is not
     predictable; falls back to Math.random elsewhere (Node,
     very old browsers). */
  function randomInt(max) {
    const cryptoObj =
      typeof globalThis !== "undefined" ? globalThis.crypto : undefined;

    if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
      // Reject the tail of the range so every value stays equally
      // likely (modulo on its own would favour the low numbers).
      const limit = Math.floor(0xffffffff / max) * max;
      const buf = new Uint32Array(1);
      let n;
      do {
        cryptoObj.getRandomValues(buf);
        n = buf[0];
      } while (n >= limit);
      return n % max;
    }
    return Math.floor(Math.random() * max);
  }

  function shuffle(list) {
    const out = list.slice();          // copy — never reorder the caller's array
    for (let i = out.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      const temp = out[i];
      out[i] = out[j];
      out[j] = temp;
    }
    return out;
  }


  /* ----------------------------------------------------------
     PICKING THE 30 QUESTIONS
     ---------------------------------------------------------- */

  /* Group the bank by question type. */
  function groupByType(bank) {
    const groups = {};
    for (const q of bank) {
      if (!groups[q.type]) groups[q.type] = [];
      groups[q.type].push(q);
    }
    return groups;
  }

  /* Choose the question set for one attempt.

     Returns an array of exactly QUESTIONS_PER_ATTEMPT questions,
     with no repeats, in random order, each with its options
     already shuffled. */
  function selectQuestions(bank, count) {
    const wanted = count || QUESTIONS_PER_ATTEMPT;

    if (!Array.isArray(bank) || bank.length < wanted) {
      throw new Error(
        "Question bank has " + (bank ? bank.length : 0) +
        " questions but " + wanted + " are needed."
      );
    }

    const groups = groupByType(bank);
    const chosen = [];
    const taken = new Set();

    // Step 1 — fill the per-type quotas.
    for (const type of Object.keys(TYPE_QUOTAS)) {
      const pool = groups[type] || [];
      const quota = Math.min(TYPE_QUOTAS[type], pool.length);
      for (const q of shuffle(pool).slice(0, quota)) {
        chosen.push(q);
        taken.add(q.id);
      }
    }

    // Step 2 — top up from everything not already used.
    const remaining = shuffle(bank.filter((q) => !taken.has(q.id)));
    for (const q of remaining) {
      if (chosen.length >= wanted) break;
      chosen.push(q);
      taken.add(q.id);
    }

    // Step 3 — a quota could in theory overshoot if someone sets
    // the numbers badly, so trim before the final shuffle.
    const finalSet = shuffle(chosen).slice(0, wanted);

    // Step 4 — shuffle each question's options.
    return finalSet.map(shuffleOptions);
  }

  /* Return a COPY of the question with its options in a new
     random order.

     The correct answer is stored as an option *id*, and ids are
     never rewritten here — only the order of the array changes.
     That is what makes it impossible for shuffling to change
     which answer is correct. True/False is left alone so the
     buttons always read True then False. */
  function shuffleOptions(question) {
    const copy = Object.assign({}, question);
    copy.options =
      question.type === "true-false"
        ? question.options.slice()
        : shuffle(question.options);
    return copy;
  }


  /* ----------------------------------------------------------
     MARKING
     ---------------------------------------------------------- */

  /* Is this answer right?

       selected — an option id, or an array of ids for
                  multiple-select
       question — the question object (its correctAnswer is the
                  source of truth)

     For multiple-select the student must have EVERY required
     option and NO extra ones. */
  function isCorrect(question, selected) {
    const key = question.correctAnswer;

    if (Array.isArray(key)) {
      if (!Array.isArray(selected)) return false;
      if (selected.length !== key.length) return false;
      const picked = new Set(selected);
      if (picked.size !== selected.length) return false;   // duplicates
      return key.every((id) => picked.has(id));
    }

    if (Array.isArray(selected)) return false;
    return selected === key;
  }

  /* Turn the list of responses into the numbers the result
     screen and the database both need. */
  function scoreAttempt(responses, totalQuestions) {
    const total = totalQuestions || QUESTIONS_PER_ATTEMPT;
    let score = 0;
    for (const r of responses) if (r.correct) score++;

    return {
      score: score,
      totalQuestions: total,
      // Rounded to 2 dp to match the numeric(5,2) column.
      percentage: Math.round((score / total) * 10000) / 100,
      // The ONLY pass in this activity is a perfect score.
      completed: score === total,
    };
  }


  /* ----------------------------------------------------------
     THE CLOCK
     ----------------------------------------------------------
     A countdown that decrements a number every second drifts —
     background tabs throttle timers, and a slow frame loses
     time. So the clock stores the moment it started and always
     works out the remaining time by SUBTRACTION from the real
     wall clock. The on-screen ticker is only a display.
     ---------------------------------------------------------- */
  function createTimer(limitMs) {
    const limit = limitMs || TIME_LIMIT_MS;
    let startedAt = null;
    let stoppedAt = null;

    return {
      start: function () {
        startedAt = Date.now();
        stoppedAt = null;
      },
      stop: function () {
        if (startedAt !== null && stoppedAt === null) stoppedAt = Date.now();
      },
      isRunning: function () {
        return startedAt !== null && stoppedAt === null;
      },
      /* Milliseconds since START CHALLENGE was tapped. */
      elapsedMs: function () {
        if (startedAt === null) return 0;
        return (stoppedAt === null ? Date.now() : stoppedAt) - startedAt;
      },
      /* Never returns a negative number. */
      remainingMs: function () {
        return Math.max(0, limit - this.elapsedMs());
      },
      hasExpired: function () {
        return this.remainingMs() === 0;
      },
      limitMs: limit,
    };
  }

  /* 137 seconds -> "02:17" */
  function formatTime(totalSeconds) {
    const safe = Math.max(0, Math.floor(totalSeconds));
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
  }


  /* ----------------------------------------------------------
     SESSION ID
     ----------------------------------------------------------
     A UUID identifying one sitting. Retries after a failure keep
     the same id; going back to the welcome screen makes a new
     one. It identifies a SESSION, never a person.
     ---------------------------------------------------------- */
  function createSessionId() {
    const cryptoObj =
      typeof globalThis !== "undefined" ? globalThis.crypto : undefined;

    if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
      return cryptoObj.randomUUID();
    }

    // Manual RFC 4122 version 4 UUID for browsers without randomUUID.
    const bytes = new Uint8Array(16);
    if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
      cryptoObj.getRandomValues(bytes);
    } else {
      for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;   // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80;   // variant 10xx

    const hex = [];
    for (let i = 0; i < 16; i++) hex.push(bytes[i].toString(16).padStart(2, "0"));
    return (
      hex.slice(0, 4).join("") + "-" +
      hex.slice(4, 6).join("") + "-" +
      hex.slice(6, 8).join("") + "-" +
      hex.slice(8, 10).join("") + "-" +
      hex.slice(10, 16).join("")
    );
  }


  /* ----------------------------------------------------------
     TIDYING THE TYPED FIELDS
     ---------------------------------------------------------- */

  /* Collapse runs of whitespace and trim the ends, so
     "  Ahmad   Firdaus  " becomes "Ahmad Firdaus". */
  function cleanText(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  /* Returns "" when the field is fine, or the message to show. */
  function validateStudentField(label, value, maxLength) {
    const clean = cleanText(value);
    if (clean.length === 0) return "Please enter your " + label.toLowerCase() + ".";
    if (clean.length > maxLength) {
      return label + " must be " + maxLength + " characters or fewer.";
    }
    return "";
  }


  /* ----------------------------------------------------------
     EXPORTS
     ----------------------------------------------------------
     Attaches to window in the browser, and to module.exports
     under Node so the test file can import it.
     ---------------------------------------------------------- */
  const QuizEngine = {
    QUESTIONS_PER_ATTEMPT: QUESTIONS_PER_ATTEMPT,
    TIME_LIMIT_MS: TIME_LIMIT_MS,
    TYPE_QUOTAS: TYPE_QUOTAS,
    randomInt: randomInt,
    shuffle: shuffle,
    selectQuestions: selectQuestions,
    shuffleOptions: shuffleOptions,
    isCorrect: isCorrect,
    scoreAttempt: scoreAttempt,
    createTimer: createTimer,
    formatTime: formatTime,
    createSessionId: createSessionId,
    cleanText: cleanText,
    validateStudentField: validateStudentField,
  };

  root.QuizEngine = QuizEngine;
  if (typeof module !== "undefined" && module.exports) module.exports = QuizEngine;

})(typeof window !== "undefined" ? window : globalThis);
