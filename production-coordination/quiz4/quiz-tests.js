/* ============================================================
   quiz-tests.js — CHECKS ON THE RULES OF THE GAME
   ============================================================
   Run from the project folder:

       node production-coordination/quiz4/quiz-tests.js

   No test framework and nothing to install — it uses only what
   Node already has. It exercises the pure logic in
   quiz-engine.js plus the shape of the question bank, which is
   where a silent mistake would do real damage (a shuffle that
   moves the correct answer, a score above the paper size, a clock
   that starts too early).

   What it deliberately does NOT do is call the Google Sheet.
   That needs the deployed Web App, so the round trip is
   verified by hand once, following QUIZ-README.md. What it CAN
   check is the contract on both sides of that call — the Apps
   Script source and the client that talks to it are both plain
   text on disk, and most of the ways this backend breaks are
   visible there.
   ============================================================ */

"use strict";

const fs = require("fs");
const path = require("path");

const HERE = __dirname;

/* The browser files attach themselves to "window". Node has no
   window, so make one and let them populate it. */
global.window = global;
require(path.join(HERE, "quiz-engine.js"));

// quiz-questions.js ends with "window.QUIZ_QUESTIONS = ...".
const bankSource = fs.readFileSync(path.join(HERE, "quiz-questions.js"), "utf8");
eval(bankSource);

const Engine = global.QuizEngine;
const BANK = global.QUIZ_QUESTIONS;

/* The paper size and the clock, taken from the engine rather
   than written out again.
   ------------------------------------------------------------
   These were literal 30s and 1500s until the paper went from 30
   questions to 20, at which point eight tests failed for saying
   the old number rather than for finding anything wrong. A test
   that has to be edited every time a setting changes is a test
   that will one day be edited to match a mistake.

   The tests that must still pin an exact number — that the page
   and the engine agree on the clock, that the sheet's clamp has
   headroom — do so by comparing two sources against each other,
   which is the thing actually worth checking. */
const N = Engine.QUESTIONS_PER_ATTEMPT;
const LIMIT_MS = Engine.TIME_LIMIT_MS;
const LIMIT_S = LIMIT_MS / 1000;

// Read out of the Apps Script rather than repeated here, for the
// same reason. Defined properly once APPS_SCRIPT is loaded below.
let SHEET_DURATION_CAP;

/* The backend, as source text.
   ------------------------------------------------------------
   Activity 3's tests read SQL migration files here. Activity 4
   has no database to migrate: the Apps Script IS the deployed
   backend, and the client that calls it is quiz-sheets.js. Both
   are read once and asserted against below.

   One caveat worth stating plainly, because it bit Activity 3
   hard: reading the file tells you what the file says, not what
   is running. Apps Script serves the last DEPLOYED version, so
   an edit here with no redeploy changes nothing live. These
   checks catch a wrong file; only a real attempt catches a
   stale deployment. */
const APPS_SCRIPT = fs.readFileSync(
  path.join(HERE, "..", "..", "google-apps-script", "activity-4-Code.gs"), "utf8"
);
const SHEETS_JS = fs.readFileSync(path.join(HERE, "quiz-sheets.js"), "utf8");
const CONFIG_JS = fs.readFileSync(path.join(HERE, "quiz-config.js"), "utf8");
const PAGE_HTML = fs.readFileSync(path.join(HERE, "..", "activity-4.html"), "utf8");

SHEET_DURATION_CAP = Number(
  (APPS_SCRIPT.match(/Math\.min\(Number\(a\.duration_seconds\)[^,]*,\s*(\d+)\s*\)/) || [])[1]
);


/* ----------------------------------------------------------
   A very small test harness
   ---------------------------------------------------------- */
let passed = 0;
let failed = 0;
const failures = [];

function check(name, fn) {
  try {
    fn();
    passed++;
    console.log("  PASS  " + name);
  } catch (err) {
    failed++;
    failures.push(name + " — " + err.message);
    console.log("  FAIL  " + name);
    console.log("        " + err.message);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || "assertion failed");
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      (message || "values differ") +
      " — expected " + JSON.stringify(expected) +
      ", got " + JSON.stringify(actual)
    );
  }
}

function section(title) {
  console.log("\n" + title);
  console.log("-".repeat(title.length));
}


/* ==========================================================
   THE QUESTION BANK
   ========================================================== */
section("Question bank");

/* The bank is 47 concept questions from slides 36-56, and 20 are
   drawn per attempt, so about 8 of your 20 repeat on the next
   try. These two guard the floor rather than the ideal: below a
   full paper an attempt cannot be built at all, and headroom
   above it is what stops every attempt being the same paper. */
check("the bank can build a full attempt", function () {
  assert(BANK.length >= N,
    "bank has only " + BANK.length + " questions; " + N + " are needed for one attempt");
});

check("the bank has headroom above a single attempt", function () {
  // Half again as many as a paper needs, at minimum.
  assert(BANK.length >= Math.ceil(N * 1.5),
    "bank has only " + BANK.length + " questions for a " + N +
    "-question paper — attempts would be nearly identical");
});

check("every question has a unique id", function () {
  const ids = new Set(BANK.map((q) => q.id));
  assertEqual(ids.size, BANK.length, "duplicate ids present");
});

check("every question records its source slide", function () {
  const missing = BANK.filter((q) => !q.sourceSlide);
  assertEqual(missing.length, 0, "questions without sourceSlide: " +
    missing.map((q) => q.id).join(", "));
});

/* The scope rule, enforced rather than trusted.
   ------------------------------------------------------------
   Activity 3 examines slides 1-36 and this one examines 36-56.
   A question that drifts below 36 is not merely off-topic — it
   asks a student to revise material this activity never told
   them to open, and it duplicates Activity 3. The slide numbers
   are already in the bank, so the rule can simply be checked. */
check("every question comes from slides 36-56", function () {
  const strays = BANK.filter((q) => q.sourceSlide < 36 || q.sourceSlide > 56);
  assertEqual(strays.length, 0,
    "out of scope: " + strays.map((q) => q.id + " (slide " + q.sourceSlide + ")").join(", "));
});

check("the bank actually covers the range, not just one corner of it", function () {
  // A bank drawn entirely from the 5S slide would pass every
  // other check here and still be a bad paper.
  const slides = new Set(BANK.map((q) => q.sourceSlide));
  assert(slides.size >= 8,
    "only " + slides.size + " distinct slides are represented; the Lean section has more than that");
});

check("every correctAnswer points at a real option id", function () {
  for (const q of BANK) {
    const ids = q.options.map((o) => o.id);
    const key = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
    for (const k of key) {
      assert(ids.includes(k), q.id + ": correctAnswer '" + k + "' is not one of its options");
    }
  }
});

check("single-answer questions have exactly one correct answer", function () {
  for (const q of BANK) {
    if (q.type === "multiple-select") continue;
    assert(typeof q.correctAnswer === "string",
      q.id + ": " + q.type + " should have a single string correctAnswer");
  }
});

check("multiple-select questions need 2+ answers but not all of them", function () {
  for (const q of BANK) {
    if (q.type !== "multiple-select") continue;
    assert(Array.isArray(q.correctAnswer), q.id + ": correctAnswer must be an array");
    assert(q.correctAnswer.length >= 2, q.id + ": needs at least 2 correct options");
    assert(q.correctAnswer.length < q.options.length,
      q.id + ": every option is correct, which makes it meaningless");
  }
});

check("no two questions share the same wording", function () {
  const seen = new Map();
  for (const q of BANK) {
    const key = q.question.trim().toLowerCase();
    assert(!seen.has(key), q.id + " repeats the wording of " + seen.get(key));
    seen.set(key, q.id);
  }
});

check("image questions point at a file that exists, with alt text", function () {
  for (const q of BANK) {
    if (q.type !== "image-choice") continue;
    assert(q.image, q.id + ": image-choice with no image");
    assert(q.imageAlt && q.imageAlt.trim().length > 0, q.id + ": no alt text");
    const file = path.join(HERE, "..", "quiz4-images", q.image);
    assert(fs.existsSync(file), q.id + ": missing file " + q.image);
  }
});

check("each type has a deep enough pool for its per-attempt quota", function () {
  const counts = {};
  for (const q of BANK) counts[q.type] = (counts[q.type] || 0) + 1;
  for (const [type, quota] of Object.entries(Engine.TYPE_QUOTAS)) {
    assert((counts[type] || 0) >= quota,
      type + " needs " + quota + " per attempt but the bank has " + (counts[type] || 0));
  }
});


/* ==========================================================
   PICKING AND SHUFFLING
   ========================================================== */
section("Selecting the questions");

check("every attempt is exactly a full paper", function () {
  for (let i = 0; i < 60; i++) {
    assertEqual(Engine.selectQuestions(BANK).length, N, "run " + i);
  }
});

check("no question appears twice in one attempt", function () {
  for (let i = 0; i < 60; i++) {
    const set = Engine.selectQuestions(BANK);
    const ids = new Set(set.map((q) => q.id));
    assertEqual(ids.size, N, "run " + i + " had a repeat");
  }
});

check("consecutive attempts differ", function () {
  const a = Engine.selectQuestions(BANK).map((q) => q.id).join(",");
  const b = Engine.selectQuestions(BANK).map((q) => q.id).join(",");
  assert(a !== b, "two attempts produced an identical paper");
});

check("every question in the bank is reachable", function () {
  // Over enough attempts, nothing should be permanently excluded.
  // A question that never appears is dead weight — usually a sign
  // its type pool is being crowded out by the quotas.
  const seen = new Set();
  for (let i = 0; i < 80; i++) {
    Engine.selectQuestions(BANK).forEach((q) => seen.add(q.id));
  }
  assertEqual(seen.size, BANK.length,
    "some questions never appeared in 80 attempts");
});

check("every attempt contains a mixture of question types", function () {
  for (let i = 0; i < 30; i++) {
    const set = Engine.selectQuestions(BANK);
    const types = new Set(set.map((q) => q.type));
    assert(types.size >= 4, "run " + i + " used only " + types.size + " type(s)");
  }
});

check("the per-type quotas are met", function () {
  for (let i = 0; i < 30; i++) {
    const set = Engine.selectQuestions(BANK);
    const counts = {};
    set.forEach((q) => { counts[q.type] = (counts[q.type] || 0) + 1; });
    for (const [type, quota] of Object.entries(Engine.TYPE_QUOTAS)) {
      assert((counts[type] || 0) >= quota,
        "run " + i + ": got " + (counts[type] || 0) + " " + type + ", wanted " + quota);
    }
  }
});

check("option order actually changes between attempts", function () {
  // A question with 4 options should not come back in the same
  // order 30 times running.
  const sample = BANK.find((q) => q.type === "single-choice");
  const orders = new Set();
  for (let i = 0; i < 30; i++) {
    orders.add(Engine.shuffleOptions(sample).options.map((o) => o.id).join(""));
  }
  assert(orders.size > 1, "options never moved");
});

check("shuffling options never changes which answer is correct", function () {
  // The heart of it: shuffle every question in the bank many
  // times and confirm the correct option's TEXT is unchanged.
  for (const original of BANK) {
    const correctIds = Array.isArray(original.correctAnswer)
      ? original.correctAnswer
      : [original.correctAnswer];

    const expectedTexts = correctIds
      .map((id) => original.options.find((o) => o.id === id).text)
      .sort()
      .join(" | ");

    for (let i = 0; i < 12; i++) {
      const shuffled = Engine.shuffleOptions(original);

      assertEqual(shuffled.options.length, original.options.length,
        original.id + ": an option went missing");

      const actualTexts = correctIds
        .map((id) => {
          const found = shuffled.options.find((o) => o.id === id);
          assert(found, original.id + ": correct option " + id + " vanished");
          return found.text;
        })
        .sort()
        .join(" | ");

      assertEqual(actualTexts, expectedTexts,
        original.id + ": the correct answer's text changed under shuffling");
    }
  }
});

check("shuffling does not mutate the original question", function () {
  const original = BANK.find((q) => q.type === "single-choice");
  const before = original.options.map((o) => o.id).join(",");
  for (let i = 0; i < 40; i++) Engine.shuffleOptions(original);
  assertEqual(original.options.map((o) => o.id).join(","), before,
    "the bank itself was reordered");
});

check("True/False keeps True first and False second", function () {
  const tf = BANK.find((q) => q.type === "true-false");
  for (let i = 0; i < 20; i++) {
    const s = Engine.shuffleOptions(tf);
    assertEqual(s.options[0].id, "t");
    assertEqual(s.options[1].id, "f");
  }
});

check("shuffle produces a genuine spread, not a rotation", function () {
  // Fisher-Yates should put each of 5 items in each position
  // sometimes. A biased shuffle would leave gaps.
  const items = [1, 2, 3, 4, 5];
  const positionsSeen = items.map(() => new Set());
  for (let i = 0; i < 600; i++) {
    Engine.shuffle(items).forEach((value, index) => positionsSeen[value - 1].add(index));
  }
  positionsSeen.forEach((set, i) => {
    assertEqual(set.size, 5, "item " + (i + 1) + " never reached every position");
  });
});


/* ==========================================================
   MARKING
   ========================================================== */
section("Marking answers");

const singleQ = { type: "single-choice", correctAnswer: "b",
  options: [{ id: "a", text: "A" }, { id: "b", text: "B" }, { id: "c", text: "C" }] };

const multiQ = { type: "multiple-select", correctAnswer: ["a", "c"],
  options: [{ id: "a", text: "A" }, { id: "b", text: "B" },
            { id: "c", text: "C" }, { id: "d", text: "D" }] };

check("single choice: right answer scores", function () {
  assertEqual(Engine.isCorrect(singleQ, "b"), true);
});

check("single choice: wrong answer does not", function () {
  assertEqual(Engine.isCorrect(singleQ, "a"), false);
  assertEqual(Engine.isCorrect(singleQ, "c"), false);
});

check("single choice: an array is never accepted", function () {
  assertEqual(Engine.isCorrect(singleQ, ["b"]), false);
});

check("multiple select: the exact set scores, in any order", function () {
  assertEqual(Engine.isCorrect(multiQ, ["a", "c"]), true);
  assertEqual(Engine.isCorrect(multiQ, ["c", "a"]), true);
});

check("multiple select: a missing answer fails", function () {
  assertEqual(Engine.isCorrect(multiQ, ["a"]), false);
});

check("multiple select: an extra answer fails", function () {
  assertEqual(Engine.isCorrect(multiQ, ["a", "b", "c"]), false);
});

check("multiple select: the wrong pair fails", function () {
  assertEqual(Engine.isCorrect(multiQ, ["b", "d"]), false);
});

check("multiple select: duplicates cannot fake a complete set", function () {
  assertEqual(Engine.isCorrect(multiQ, ["a", "a"]), false);
});

check("multiple select: nothing selected fails", function () {
  assertEqual(Engine.isCorrect(multiQ, []), false);
});


/* ==========================================================
   SCORING
   ========================================================== */
section("Scoring");

function responses(correctCount, total) {
  const out = [];
  for (let i = 0; i < total; i++) out.push({ questionId: "q" + i, correct: i < correctCount });
  return out;
}

check("a full paper is 100% and completed", function () {
  const r = Engine.scoreAttempt(responses(N, N), N);
  assertEqual(r.score, N);
  assertEqual(r.percentage, 100);
  assertEqual(r.completed, true);
});

check("one short of full marks is NOT completed", function () {
  const r = Engine.scoreAttempt(responses(N - 1, N), N);
  assertEqual(r.score, N - 1);
  assertEqual(r.completed, false);
});

check("a good-but-not-perfect score is NOT completed", function () {
  assertEqual(Engine.scoreAttempt(responses(N - 5, N), N).completed, false);
});

check("0 correct is 0%, not completed", function () {
  const r = Engine.scoreAttempt(responses(0, N), N);
  assertEqual(r.score, 0);
  assertEqual(r.percentage, 0);
  assertEqual(r.completed, false);
});

check("unanswered questions simply do not score", function () {
  // Ran out of time part-way, with everything answered so far right.
  const answered = Math.floor(N / 2);
  const r = Engine.scoreAttempt(responses(answered, answered), N);
  assertEqual(r.score, answered);
  assertEqual(r.completed, false, "a short attempt must never count as complete");
});

check("the score cannot exceed the paper size", function () {
  // Even if more responses arrived than there were questions.
  const r = Engine.scoreAttempt(responses(N + 5, N + 5), N);
  assert(r.score <= N, "score was " + r.score);
  assert(r.percentage <= 100, "percentage was " + r.percentage);
});

check("percentage matches score over the paper size", function () {
  for (let n = 0; n <= N; n++) {
    const r = Engine.scoreAttempt(responses(n, N), N);
    const expected = Math.round((n / N) * 10000) / 100;
    assertEqual(r.percentage, expected, "at " + n + " correct");
  }
});

check("percentage always fits two decimal places", function () {
  for (let n = 0; n <= N; n++) {
    const p = Engine.scoreAttempt(responses(n, N), N).percentage;
    assert(p >= 0 && p <= 100, "out of range: " + p);
    const decimals = (String(p).split(".")[1] || "").length;
    assert(decimals <= 2, p + " has more than 2 decimal places");
  }
});


/* ==========================================================
   THE CLOCK
   ========================================================== */
section("The clock");

check("the limit is a sane whole number of minutes", function () {
  /* Deliberately not pinned to a value. Pinning it would only
     mean editing this line every time the lecturer changes the
     limit — and a test you edit to match the code is not a test.
     What is worth asserting is that the setting is usable. */
  assert(LIMIT_MS > 0, "the clock has no time on it");
  assertEqual(LIMIT_MS % 60000, 0, "the limit is not a whole number of minutes");
  assert(LIMIT_S >= N * 20,
    "only " + Math.round(LIMIT_S / N) + "s per question — too tight to read them");
});

check("before START, no time has passed", function () {
  const t = Engine.createTimer();
  assertEqual(t.elapsedMs(), 0);
  assertEqual(t.remainingMs(), LIMIT_MS,
    "the clock must read a full " + Engine.formatTime(LIMIT_S) + " until START");
  assertEqual(t.isRunning(), false);
  assertEqual(t.hasExpired(), false);
});

check("the clock runs once started", function () {
  const t = Engine.createTimer(1000);
  t.start();
  assertEqual(t.isRunning(), true);
  assert(t.remainingMs() <= 1000);
});

check("elapsed time is measured from the real clock", function () {
  // Rather than sleeping, wind the start time back by pretending
  // Date.now() is 90 seconds later.
  const realNow = Date.now;
  const t = Engine.createTimer();
  t.start();
  Date.now = () => realNow() + 90000;
  try {
    assert(Math.abs(t.elapsedMs() - 90000) < 50, "elapsed was " + t.elapsedMs());
    assert(Math.abs(t.remainingMs() - (LIMIT_MS - 90000)) < 50,
      "remaining was " + t.remainingMs());
    assertEqual(t.hasExpired(), false);
  } finally {
    Date.now = realNow;
  }
});

check("the clock expires at the limit, not a moment before", function () {
  const realNow = Date.now;
  const t = Engine.createTimer();
  t.start();
  try {
    Date.now = () => realNow() + LIMIT_MS - 1;
    assertEqual(t.hasExpired(), false, "expired one millisecond early");

    Date.now = () => realNow() + LIMIT_MS + 1;
    assertEqual(t.hasExpired(), true);
    assertEqual(t.remainingMs(), 0, "remaining must never go negative");
  } finally {
    Date.now = realNow;
  }
});

check("stop() freezes the elapsed time", function () {
  const realNow = Date.now;
  const t = Engine.createTimer();
  t.start();
  Date.now = () => realNow() + 45000;
  t.stop();
  Date.now = () => realNow() + 120000;
  try {
    assert(Math.abs(t.elapsedMs() - 45000) < 50,
      "the finish time moved after stop(): " + t.elapsedMs());
    assertEqual(t.isRunning(), false);
  } finally {
    Date.now = realNow;
  }
});

check("times are shown as mm:ss", function () {
  assertEqual(Engine.formatTime(0), "00:00");
  assertEqual(Engine.formatTime(9), "00:09");
  assertEqual(Engine.formatTime(60), "01:00");
  assertEqual(Engine.formatTime(137), "02:17");
  assertEqual(Engine.formatTime(299), "04:59");
  assertEqual(Engine.formatTime(300), "05:00");
  assertEqual(Engine.formatTime(599), "09:59");
  assertEqual(Engine.formatTime(1500), "25:00");
});

check("a negative time never appears on screen", function () {
  assertEqual(Engine.formatTime(-5), "00:00");
});

/* The time limit lives in three places that must agree. On
   Activity 3 it moved twice and the database constraint was left
   behind both times, at a value a full attempt hits exactly, so
   the very slowest legitimate attempt would have been rejected on
   submit. The equivalent number here is the clamp in the Apps
   Script. These two checks make that drift fail loudly instead of
   silently in front of a class. */
check("the Apps Script duration clamp leaves headroom above the time limit", function () {
  const fullAttempt = Engine.TIME_LIMIT_MS / 1000;

  const caps = [...APPS_SCRIPT.matchAll(/Math\.min\(Number\(a\.duration_seconds\)[^,]*,\s*(\d+)\s*\)/g)]
    .map((m) => Number(m[1]));

  assert(caps.length > 0, "no duration clamp found in activity-4-Code.gs");

  caps.forEach(function (cap) {
    assert(cap > fullAttempt,
      "the Apps Script clamps duration_seconds at " + cap + "s, but a full attempt " +
      "is " + fullAttempt + "s — the slowest legitimate attempt would be truncated");
  });
});

check("the page shows the same limit the engine enforces", function () {
  const html = fs.readFileSync(path.join(HERE, "..", "activity-4.html"), "utf8");
  const expected = Engine.formatTime(Engine.TIME_LIMIT_MS / 1000);   // e.g. "25:00"

  assert(html.includes('id="timerValue">' + expected + "<"),
    "the timer on the page does not start at " + expected);
  assert(html.includes('<span class="rule-value">' + expected + "</span>"),
    "the briefing tile does not say " + expected);
});


/* ==========================================================
   NAME AND CLASS
   ========================================================== */
section("Name and class");

check("surrounding and repeated spaces are tidied away", function () {
  assertEqual(Engine.cleanText("  Ahmad   Firdaus  "), "Ahmad Firdaus");
  assertEqual(Engine.cleanText("DTP\t3A"), "DTP 3A");
});

check("an empty field is rejected", function () {
  assert(Engine.validateStudentField("Name", "", 80) !== "");
  assert(Engine.validateStudentField("Name", "   ", 80) !== "", "spaces are still empty");
  assert(Engine.validateStudentField("Class", "", 40) !== "");
});

check("a normal name and class are accepted", function () {
  assertEqual(Engine.validateStudentField("Name", "Siti Aisyah", 80), "");
  assertEqual(Engine.validateStudentField("Class", "DTP 3B", 40), "");
});

check("an over-long value is rejected", function () {
  assert(Engine.validateStudentField("Name", "x".repeat(81), 80) !== "");
  assert(Engine.validateStudentField("Class", "y".repeat(41), 40) !== "");
});


/* ==========================================================
   SESSION IDS
   ========================================================== */
section("Session ids");

check("a session id is a valid v4 UUID", function () {
  const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  for (let i = 0; i < 50; i++) {
    const id = Engine.createSessionId();
    assert(pattern.test(id), "not a v4 UUID: " + id);
  }
});

check("session ids do not repeat", function () {
  const seen = new Set();
  for (let i = 0; i < 500; i++) seen.add(Engine.createSessionId());
  assertEqual(seen.size, 500, "a session id was handed out twice");
});


/* ==========================================================
   RETRY BEHAVIOUR
   ==========================================================
   Mirrors what quiz-app.js does on TRY AGAIN, to prove the
   pieces it relies on behave.
   ========================================================== */
section("Retrying after a failed attempt");

check("a retry keeps the session but changes the paper", function () {
  const session = Engine.createSessionId();

  const attempt1 = { number: 1, session: session, questions: Engine.selectQuestions(BANK) };
  const attempt2 = { number: attempt1.number + 1, session: session, questions: Engine.selectQuestions(BANK) };

  assertEqual(attempt2.session, attempt1.session, "the session id must carry over");
  assertEqual(attempt2.number, 2, "the attempt number must increase");
  assert(
    attempt1.questions.map((q) => q.id).join(",") !== attempt2.questions.map((q) => q.id).join(","),
    "the retry served the identical paper"
  );
});

check("a retry starts from a full clock and a zero score", function () {
  const t = Engine.createTimer();
  assertEqual(t.remainingMs(), Engine.TIME_LIMIT_MS);
  assertEqual(Engine.scoreAttempt([], N).score, 0);
});

check("a fresh sitting gets a different session id", function () {
  assert(Engine.createSessionId() !== Engine.createSessionId());
});

/* The live class scoreboard on the result screens. The rows come
   from the quiz_recent_attempts() function, so these check the
   SQL contract and the rules the panel has to obey. */
section("The class scoreboard");

check("the Apps Script answers the two reads the client makes", function () {
  ["leaderboard", "recent"].forEach(function (action) {
    assert(APPS_SCRIPT.includes("action === '" + action + "'"),
      "doGet does not handle action=" + action);
  });
});

check("the scoreboard returns scores but never the answers", function () {
  /* readAttempts() is the single door the reads go through, so
     the guarantee lives there: it takes columns 1..11 and the
     answer columns are 12 and 13. Widen that range and every
     student's answer sheet becomes public. */
  const fn = APPS_SCRIPT.slice(APPS_SCRIPT.indexOf("function readAttempts"));
  const body = fn.slice(0, fn.indexOf("\n}"));

  const range = body.match(/getRange\(2,\s*1,\s*last\s*-\s*1,\s*(\d+)\)/);
  assert(range, "readAttempts no longer takes a fixed column range");

  const headers = APPS_SCRIPT.slice(
    APPS_SCRIPT.indexOf("var ATTEMPT_HEADERS"),
    APPS_SCRIPT.indexOf("var VISIT_HEADERS")
  );
  const responsesCol = headers.split("'").indexOf("responses");
  assert(responsesCol > -1, "could not locate the responses column");

  assert(Number(range[1]) < 12,
    "readAttempts reads " + range[1] + " columns, which reaches question_set and " +
    "responses — the scoreboard would publish what every student answered");
});

check("neither read hands back a session id or an answer list", function () {
  ["leaderboard", "recent"].forEach(function (name) {
    const fn = APPS_SCRIPT.slice(APPS_SCRIPT.indexOf("function " + name + "("));
    const body = fn.slice(0, fn.indexOf("\n}"));
    ["responses", "question_set", "session_id"].forEach(function (field) {
      assert(!body.includes(field),
        name + "() must not return " + field);
    });
  });
});

check("the row limit is clamped, so one caller cannot pull everything", function () {
  assert(/Math\.max\(1,\s*Math\.min\(Number\(params\.limit\)[^,]*,\s*\d+\)\)/.test(APPS_SCRIPT),
    "doGet does not clamp the limit parameter");
});

check("the client asks for at least 10 rows", function () {
  // The lecturer asked for a minimum of 10 students on screen.
  const match = CONFIG_JS.match(/RECENT_SIZE:\s*(\d+)/);
  assert(match, "RECENT_SIZE is missing from quiz-config.js");
  assert(Number(match[1]) >= 10,
    "RECENT_SIZE is " + match[1] + ", but at least 10 attempts should be shown");
});

check("the clamp in the script is not below what the client asks for", function () {
  const asked = Math.max(
    Number((CONFIG_JS.match(/RECENT_SIZE:\s*(\d+)/) || [])[1] || 0),
    Number((CONFIG_JS.match(/LEADERBOARD_SIZE:\s*(\d+)/) || [])[1] || 0)
  );
  const cap = Number((APPS_SCRIPT.match(/Math\.min\(Number\(params\.limit\)[^,]*,\s*(\d+)\)/) || [])[1]);
  assert(cap >= asked,
    "the script caps reads at " + cap + " rows but the page asks for " + asked +
    " — the scoreboard would quietly come back short");
});

check("both result screens have somewhere to put the scoreboard", function () {
  ["resultHistoryList", "resultHistorySummary", "resultHistoryRefresh",
   "perfectHistoryList", "perfectHistorySummary", "perfectHistoryRefresh"].forEach(function (id) {
    assert(PAGE_HTML.includes('id="' + id + '"'), "activity-4.html is missing #" + id);
  });
});

/* The visit counter. It appends to the Visits tab and is
   deliberately fire-and-forget, so these check the contract
   rather than the behaviour: that it collects nothing
   identifying, and that one student is counted once. */
section("The visit counter");

const visitsJs = fs.readFileSync(path.join(HERE, "quiz-visits.js"), "utf8");

/* These checks look for forbidden words, so they have to read the
   CODE and not the prose around it. A comment saying "no
   fingerprint is collected" must not read as a fingerprint being
   collected. */
function stripJsComments(js) {
  return js.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

check("the Visits tab holds three columns and nothing more", function () {
  // The headers are fixed deliberately. If someone later adds an
  // IP or user agent column, this fails and makes them think
  // about it rather than doing it by accident.
  const headers = APPS_SCRIPT.slice(
    APPS_SCRIPT.indexOf("var VISIT_HEADERS"),
    APPS_SCRIPT.indexOf("\n", APPS_SCRIPT.indexOf("var VISIT_HEADERS"))
  );
  ["timestamp", "page", "device"].forEach(function (col) {
    assert(headers.includes("'" + col + "'"), "the Visits tab should record " + col);
  });
  ["ip", "ip_address", "user_agent", "useragent", "fingerprint",
   "latitude", "longitude", "location", "email"].forEach(function (col) {
    assert(!new RegExp("'" + col + "'", "i").test(headers),
      "the Visits tab must not store " + col);
  });
});

check("nothing identifying is stored", function () {
  // The visit branch of doPost is where a stray field would be
  // added, so check what it actually appends.
  const branch = stripJsComments(APPS_SCRIPT.slice(
    APPS_SCRIPT.indexOf("if (body.kind === 'visit')"),
    APPS_SCRIPT.indexOf("var a = body.attempt")
  ));
  ["getUserAgent", "getUserIp", "Session.getActiveUser", "getEmail"].forEach(function (thing) {
    assert(!branch.includes(thing), "the visit branch must not call " + thing);
  });

  // And the browser must not be sending any of it either.
  const sending = stripJsComments(visitsJs);
  ["userAgent", "navigator.platform", "geolocation", "screen.width"].forEach(function (thing) {
    assert(!sending.includes(thing), "quiz-visits.js must not read " + thing);
  });
});

check("the counter records one visit per tab session", function () {
  const code = stripJsComments(visitsJs);
  assert(/sessionStorage/.test(code),
    "visits should be deduplicated with sessionStorage");
  assert(!/localStorage/.test(code),
    "localStorage would make a returning student never count again");
});

check("the counter marks before sending, not after", function () {
  // Marking after the request returns would let a slow network
  // produce a double count.
  const from = visitsJs.indexOf("function recordVisit");
  const markAt = visitsJs.indexOf("markCounted();", from);
  const sendAt = visitsJs.indexOf("QuizDatabase.recordVisit(", from);
  assert(markAt > -1 && sendAt > -1, "could not find the mark and the send");
  assert(markAt < sendAt, "recordVisit must mark the visit before sending it");
});

check("a failed visit can never surface to the student", function () {
  assert(/try\s*{/.test(visitsJs), "the send is not wrapped defensively");
  // And the layer underneath swallows its own failures too, so a
  // rejected promise cannot escape into the console as an
  // unhandled rejection while a student is mid-question.
  const fn = SHEETS_JS.slice(SHEETS_JS.indexOf("async function recordVisit"));
  assert(/\.catch\(/.test(fn.slice(0, fn.indexOf("\n  }"))),
    "quiz-sheets.js recordVisit() has no catch");
});

check("the page loads the visit counter, after the backend it hands off to", function () {
  assert(PAGE_HTML.includes("quiz4/quiz-visits.js"),
    "activity-4.html does not load quiz-visits.js");

  // It has to come after the config it reads its settings from.
  assert(PAGE_HTML.indexOf("quiz4/quiz-config.js") < PAGE_HTML.indexOf("quiz4/quiz-visits.js"),
    "quiz-visits.js must load after quiz-config.js");

  /* AND after quiz-sheets.js, which is the difference from
     Activity 3. There, quiz-visits.js called Supabase itself and
     could load first. Here it calls QuizDatabase.recordVisit(),
     so if it runs first that object does not exist yet and the
     visit is dropped — silently, because a failed headcount is
     swallowed by design. Exactly the kind of breakage nobody
     notices until the numbers look wrong weeks later. */
  assert(PAGE_HTML.indexOf("quiz4/quiz-sheets.js") < PAGE_HTML.indexOf("quiz4/quiz-visits.js"),
    "quiz-visits.js must load after quiz-sheets.js, or every visit is silently lost");
});

check("a student is matched to their own rows regardless of spacing or case", function () {
  // buildScoreRow marks "YOU" using this comparison; a student
  // who typed "  ahmad  firdaus " must still match the row saved
  // as "Ahmad Firdaus".
  function matches(rowName, rowClass, typedName, typedClass) {
    return (
      Engine.cleanText(rowName).toLowerCase() === Engine.cleanText(typedName).toLowerCase() &&
      Engine.cleanText(rowClass).toLowerCase() === Engine.cleanText(typedClass).toLowerCase()
    );
  }
  assert(matches("Ahmad Firdaus", "DTP 3A", "  ahmad   firdaus ", "dtp 3a"), "should match");
  assert(!matches("Ahmad Firdaus", "DTP 3A", "Ahmad Firdaus", "DTP 3B"),
    "same name in a different class is a different student");
  assert(!matches("Ahmad Firdaus", "DTP 3A", "Siti Aisyah", "DTP 3A"), "different people");
});


/* ==========================================================
   WHAT GETS SENT TO THE SHEET
   ========================================================== */
section("The row sent to the Google Sheet");

/* Builds the same object quiz-app.js builds, so the checks
   below are testing the real shape. */
function buildRow(questions, responseList, marks, extras) {
  return Object.assign({
    session_id: Engine.createSessionId(),
    attempt_number: 1,
    student_name: "Ahmad Firdaus",
    class_name: "DTP 3A",
    score: marks.score,
    total_questions: marks.totalQuestions,
    percentage: marks.percentage,
    duration_seconds: 161,
    completed: marks.completed,
    timed_out: false,
    question_set: questions.map((q) => q.id),
    responses: responseList.map((r) => ({
      questionId: r.questionId, selected: r.selected, correct: r.correct,
    })),
  }, extras || {});
}

check("the row carries every question id on the paper", function () {
  const qs = Engine.selectQuestions(BANK);
  const rs = qs.map((q) => ({ questionId: q.id, selected: "a", correct: true }));
  const row = buildRow(qs, rs, Engine.scoreAttempt(rs, N));
  assertEqual(row.question_set.length, N);
});

check("the row never contains the answer key", function () {
  const qs = Engine.selectQuestions(BANK);
  const rs = qs.map((q) => ({ questionId: q.id, selected: "a", correct: true }));
  const row = buildRow(qs, rs, Engine.scoreAttempt(rs, N));

  const asText = JSON.stringify(row);
  assert(!asText.includes("correctAnswer"),
    "the answer key leaked into the database payload");

  for (const r of row.responses) {
    const keys = Object.keys(r).sort().join(",");
    assertEqual(keys, "correct,questionId,selected",
      "a response carried unexpected fields: " + keys);
  }
});

check("the row carries every column the sheet expects, in a shape it can store", function () {
  /* Activity 3 had a database schema to check against. Here the
     column list is a plain array in the Apps Script, so check
     the payload against that instead — a field renamed on one
     side and not the other would otherwise write a blank column
     for every student and nobody would notice until marking. */
  const headers = APPS_SCRIPT.slice(
    APPS_SCRIPT.indexOf("var ATTEMPT_HEADERS"),
    APPS_SCRIPT.indexOf("var VISIT_HEADERS")
  );

  const qs = Engine.selectQuestions(BANK);
  const rs = qs.map((q) => ({ questionId: q.id, selected: "a", correct: true }));
  const row = buildRow(qs, rs, Engine.scoreAttempt(rs, N));

  Object.keys(row).forEach(function (field) {
    assert(headers.includes("'" + field + "'"),
      "the page sends '" + field + "', which the sheet has no column for");
  });

  // timestamp is added by the script, not the page, so it is the
  // one header with no matching field.
  ["session_id", "student_name", "class_name", "score", "total_questions",
   "percentage", "duration_seconds", "completed", "timed_out",
   "question_set", "responses"].forEach(function (col) {
    assert(col in row, "the sheet has a '" + col + "' column that the page never fills");
  });
});

check("the row satisfies every constraint the script enforces", function () {
  for (const correctCount of [0, 1, Math.floor(N / 2), N - 1, N]) {
    const qs = Engine.selectQuestions(BANK);
    const rs = qs.map((q, i) => ({
      questionId: q.id, selected: "a", correct: i < correctCount,
    }));
    const marks = Engine.scoreAttempt(rs, N);
    const row = buildRow(qs, rs, marks);

    assert(row.attempt_number >= 1, "attempt_number");
    assert(row.score >= 0 && row.score <= row.total_questions, "score range");
    assertEqual(row.total_questions, N, "total_questions must match the paper size");
    assert(row.percentage >= 0 && row.percentage <= 100, "percentage range");
    assert(row.duration_seconds >= 0 && row.duration_seconds <= SHEET_DURATION_CAP, "duration range");
    assertEqual(row.completed, row.score === row.total_questions,
      "completed must agree with the score — this is what keeps the leaderboard honest");
    assert(row.student_name.trim().length >= 1 && row.student_name.trim().length <= 80, "name length");
    assert(row.class_name.trim().length >= 1 && row.class_name.trim().length <= 40, "class length");
    assertEqual(row.question_set.length, N, "question_set must hold one id per question");
    assert(row.responses.length <= N, "responses must not exceed the paper size");
  }
});

check("a timed-out attempt is recorded as incomplete", function () {
  const qs = Engine.selectQuestions(BANK);
  // Answered only 12 before the clock ran out; all 12 right.
  const rs = qs.slice(0, 12).map((q) => ({ questionId: q.id, selected: "a", correct: true }));
  const marks = Engine.scoreAttempt(rs, N);
  const row = buildRow(qs, rs, marks, { timed_out: true, duration_seconds: LIMIT_S });

  assertEqual(row.score, 12);
  assertEqual(row.completed, false, "a timed-out attempt can never be a pass");
  assertEqual(row.timed_out, true);
  assertEqual(row.question_set.length, N, "the full paper is still recorded");
  assertEqual(row.responses.length, 12, "only real answers are stored");
});


/* ==========================================================
   THE GOOGLE SHEETS BACKEND
   ==========================================================
   Everything below checks the seams rather than the logic. They
   are the parts with no visible failure mode: a wrong content
   type, a fetch where a script tag is needed, a token that
   matches on one side only. Each of those produces a quiz that
   plays perfectly and saves nothing.
   ========================================================== */
section("The Google Sheets backend");

check("the client offers the same interface quiz-app.js expects", function () {
  /* quiz-app.js is a byte-for-byte copy of Activity 3's and
     knows nothing about Google Sheets. That only holds while
     quiz-sheets.js keeps the shape quiz-supabase.js had. */
  const exported = SHEETS_JS.slice(SHEETS_JS.indexOf("root.QuizDatabase = {"));

  ["saveAttempt", "fetchLeaderboard", "fetchRecentAttempts", "recordVisit", "isConfigured"]
    .forEach(function (fn) {
      assert(new RegExp("\\b" + fn + ":\\s*\\w+").test(exported),
        "QuizDatabase." + fn + " is missing from quiz-sheets.js");
    });

  /* quiz-app.js aliases the backend once at the top —
     "const Database = window.QuizDatabase" — and calls it
     through that name, so follow the alias rather than
     searching for the global. */
  const appJs = stripJsComments(fs.readFileSync(path.join(HERE, "quiz-app.js"), "utf8"));
  const alias = (appJs.match(/const\s+(\w+)\s*=\s*window\.QuizDatabase/) || [])[1];
  assert(alias, "quiz-app.js does not take a reference to window.QuizDatabase at all");

  const called = [...appJs.matchAll(new RegExp("\\b" + alias + "\\.(\\w+)", "g"))].map((m) => m[1]);
  assert(called.length > 0, "quiz-app.js never calls the backend");
  new Set(called).forEach(function (fn) {
    assert(new RegExp("\\b" + fn + ":\\s*\\w+").test(exported),
      "quiz-app.js calls QuizDatabase." + fn + ", which quiz-sheets.js does not provide");
  });
});

check("writes stay a simple request, so no preflight is sent", function () {
  /* Apps Script cannot answer a CORS preflight. Setting
     "application/json" here looks like a tidy-up and breaks
     every save on the site with no error the student can see. */
  assert(/text\/plain/.test(SHEETS_JS),
    "the POST no longer uses text/plain — a preflight would be sent and every save would fail");
  assert(!/["']Content-Type["']\s*:\s*["']application\/json/.test(SHEETS_JS),
    "application/json triggers a CORS preflight that Apps Script cannot answer");
});

check("reads go through JSONP, not fetch", function () {
  /* A GET to Apps Script redirects to googleusercontent.com and
     that hop does not reliably carry CORS headers, so fetch can
     be refused permission to read a reply that arrived fine. */
  const jsonpFn = SHEETS_JS.slice(SHEETS_JS.indexOf("function jsonp("));
  const body = jsonpFn.slice(0, jsonpFn.indexOf("\n  }"));
  assert(/createElement\(["']script["']\)/.test(body),
    "jsonp() no longer injects a script tag");
  assert(!/fetch\(/.test(body), "jsonp() must not use fetch");
  assert(/callback=/.test(SHEETS_JS), "no callback parameter is sent");
  assert(APPS_SCRIPT.includes("MimeType.JAVASCRIPT"),
    "the script never replies as JavaScript, so JSONP cannot work");
});

check("the callback name is sanitised before it is echoed back", function () {
  /* The script writes the callback name straight into a
     JavaScript response. Unfiltered, that is a hole. */
  const fn = APPS_SCRIPT.slice(APPS_SCRIPT.indexOf("function json("));
  const body = fn.slice(0, fn.indexOf("\n}"));
  assert(/replace\(\/\[\^A-Za-z0-9_\]\/g/.test(body),
    "json() echoes the callback name without stripping it");
  assert(/\.slice\(0,\s*\d+\)/.test(body), "the callback name is not length-limited");
});

check("the token matches on both sides", function () {
  const inConfig = (CONFIG_JS.match(/SHARED_TOKEN:\s*"([^"]+)"/) || [])[1];
  const inScript = (APPS_SCRIPT.match(/SHARED_TOKEN\s*=\s*'([^']+)'/) || [])[1];
  assert(inConfig, "SHARED_TOKEN is missing from quiz-config.js");
  assert(inScript, "SHARED_TOKEN is missing from activity-4-Code.gs");
  assertEqual(inConfig, inScript,
    "the page and the script disagree on the token — every save would be rejected");
});

check("a wrong token is not retried forever", function () {
  // It is a configuration fault, and retrying only hides it.
  assert(/retryable:\s*false/.test(SHEETS_JS),
    "quiz-sheets.js has no non-retryable failure path");
  assert(SHEETS_JS.includes("bad token"),
    "quiz-sheets.js does not recognise the script's rejection message");
  assert(APPS_SCRIPT.includes("'bad token'"),
    "the script no longer sends the message the client looks for");
});

check("the script recomputes completion instead of trusting the page", function () {
  /* The page is public. If it could declare its own pass, the
     leaderboard would be a suggestion. */
  assert(/var completed = \(score === total\)/.test(APPS_SCRIPT),
    "the script takes the page's word for whether an attempt was perfect");
});

check("concurrent finishes queue instead of colliding", function () {
  assert(/LockService\.getScriptLock\(\)/.test(APPS_SCRIPT), "no script lock");
  assert(/releaseLock\(\)/.test(APPS_SCRIPT), "the lock is never released");
  assert(/finally\s*{/.test(APPS_SCRIPT),
    "the lock is not released in a finally block, so one error would jam the sheet");
});

check("an unconfigured sheet fails honestly rather than pretending", function () {
  assert(SHEETS_JS.includes("PASTE_YOUR"),
    "quiz-sheets.js no longer detects the placeholder URL");
  const fn = SHEETS_JS.slice(SHEETS_JS.indexOf("async function post("));
  const guard = fn.slice(0, fn.indexOf("const tries"));
  assert(/ok:\s*false/.test(guard),
    "an unconfigured sheet must report failure, never a silent success");
});

check("the config still carries the placeholder or a real deployment, not junk", function () {
  const url = (CONFIG_JS.match(/SCRIPT_URL:\s*"([^"]+)"/) || [])[1];
  assert(url, "SCRIPT_URL is missing from quiz-config.js");
  assert(url.includes("PASTE_YOUR") || /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url),
    "SCRIPT_URL is neither the placeholder nor a Web App /exec URL: " + url);
});


/* ==========================================================
   THE PAGE AND THE CODE THAT DRIVES IT
   ==========================================================
   Activity 3 shipped with an element that quiz-app.js looked up
   and the HTML did not contain. The quiz froze on question one.
   Nothing failed at load; the page was simply missing a div.
   This section exists so that cannot happen twice.
   ========================================================== */
section("Page and script agree");

check("every element quiz-app.js looks up exists in the HTML", function () {
  const appJs = fs.readFileSync(path.join(HERE, "quiz-app.js"), "utf8");
  const code = stripJsComments(appJs);

  const wanted = new Set();
  [...code.matchAll(/\$\(\s*["']([\w-]+)["']\s*\)/g)].forEach((m) => wanted.add(m[1]));
  [...code.matchAll(/getElementById\(\s*["']([\w-]+)["']\s*\)/g)].forEach((m) => wanted.add(m[1]));

  assert(wanted.size > 0, "found no element lookups at all — has the helper been renamed?");

  const missing = [...wanted].filter((id) => !PAGE_HTML.includes('id="' + id + '"'));
  assertEqual(missing.length, 0,
    "quiz-app.js looks up ids that activity-4.html does not define: " + missing.join(", "));
});

check("the page loads every script the quiz needs, in a working order", function () {
  /* Comments have to go first. The notes at the top of the file
     mention several of these filenames, and a name in prose
     would otherwise count as the place it is loaded. */
  const markup = PAGE_HTML.replace(/<!--[\s\S]*?-->/g, "");

  const order = ["quiz-config.js", "quiz-sheets.js", "quiz-visits.js", "quiz-questions.js",
                 "quiz-engine.js", "quiz-audio.js", "quiz-celebration.js", "quiz-app.js"];
  let previous = -1;
  order.forEach(function (file) {
    const at = markup.indexOf("quiz4/" + file);
    assert(at > -1, "activity-4.html does not load " + file);
    assert(at > previous, file + " is loaded out of order");
    previous = at;
  });

  assert(!/["']quiz\/quiz-/.test(markup),
    "activity-4.html is loading a file from Activity 3's quiz/ folder");
});

check("Activity 4 does not reach into Activity 3's folders", function () {
  ["quiz-app.js", "quiz-engine.js", "quiz-audio.js", "quiz-celebration.js",
   "quiz-sheets.js", "quiz-visits.js", "quiz-questions.js"].forEach(function (file) {
    const src = fs.readFileSync(path.join(HERE, file), "utf8");
    assert(!/["']quiz-images\//.test(src),
      file + " points at quiz-images/, which belongs to Activity 3");
  });
});

check("browser storage keys cannot collide with Activity 3", function () {
  /* Both activities are served from the same domain, so they
     share one localStorage and one sessionStorage. A key in
     common means muting the sound in one quiz mutes the other,
     or a visit to one suppresses the headcount for the other. */
  const mine = new Set();
  ["quiz-audio.js", "quiz-visits.js", "quiz-app.js"].forEach(function (file) {
    const src = fs.readFileSync(path.join(HERE, file), "utf8");
    [...src.matchAll(/STORAGE_KEY\s*=\s*"([^"]+)"/g)].forEach((m) => mine.add(m[1]));
  });

  const theirs = new Set();
  ["quiz-audio.js", "quiz-visits.js", "quiz-app.js"].forEach(function (file) {
    const p = path.join(HERE, "..", "quiz", file);
    if (!fs.existsSync(p)) return;
    const src = fs.readFileSync(p, "utf8");
    [...src.matchAll(/STORAGE_KEY\s*=\s*"([^"]+)"/g)].forEach((m) => theirs.add(m[1]));
  });

  assert(mine.size > 0, "found no storage keys to check");
  const shared = [...mine].filter((k) => theirs.has(k));
  assertEqual(shared.length, 0,
    "these keys are used by both activities: " + shared.join(", "));
});

check("the page names this activity, not the one it was copied from", function () {
  /* Checked in the three places a student actually reads the
     name. The page is allowed to mention Zero Defect Rush
     elsewhere — it links to it — so a blanket search would be
     wrong. */
  const title = (PAGE_HTML.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
  const heading = (PAGE_HTML.match(/id="gameTitle">([^<]*)</) || [])[1] || "";
  const brand = (PAGE_HTML.match(/class="game-brand">([^<]*)</) || [])[1] || "";

  [["title", title], ["welcome heading", heading], ["in-game brand", brand]]
    .forEach(function (pair) {
      assert(pair[1].length > 0, "could not read the " + pair[0]);
      assert(!/Zero Defect Rush/.test(pair[1]),
        "the " + pair[0] + " still says Zero Defect Rush");
      assert(/Zero\s*(&nbsp;)?\s*Waste Sprint/.test(pair[1]),
        "the " + pair[0] + " does not say Zero Waste Sprint: " + pair[1]);
    });
});


/* ==========================================================
   RESULT
   ========================================================== */
console.log("\n" + "=".repeat(52));
console.log("  " + passed + " passed, " + failed + " failed");
console.log("=".repeat(52));

if (failed > 0) {
  console.log("\nFailures:");
  failures.forEach((f) => console.log("  - " + f));
  process.exit(1);
}
process.exit(0);
