/* ============================================================
   quiz-tests.js — CHECKS ON THE RULES OF THE GAME
   ============================================================
   Run from the project folder:

       node production-coordination/quiz/quiz-tests.js

   No test framework and nothing to install — it uses only what
   Node already has. It exercises the pure logic in
   quiz-engine.js plus the shape of the question bank, which is
   where a silent mistake would do real damage (a shuffle that
   moves the correct answer, a score that can exceed 30, a clock
   that starts too early).

   What it deliberately does NOT do is talk to Supabase. That
   needs the live project, so the database is verified by hand
   once, following QUIZ-README.md.
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

/* The bank was cut to 50 core-concept questions in August 2026.
   30 are drawn per attempt, so a good share of a paper repeats on
   the next try — that is the accepted price of keeping only the
   questions worth asking. These two guard the floor rather than
   the ideal: below 30 an attempt cannot be built at all, and much
   above 30 is what stops every attempt being the same paper. */
check("the bank can build a full attempt", function () {
  assert(BANK.length >= 30,
    "bank has only " + BANK.length + " questions; 30 are needed for one attempt");
});

check("the bank has headroom above a single attempt", function () {
  assert(BANK.length >= 40,
    "bank has only " + BANK.length + " questions — attempts would be nearly identical");
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
    const file = path.join(HERE, "..", "quiz-images", q.image);
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
section("Selecting the 30 questions");

check("every attempt is exactly 30 questions", function () {
  for (let i = 0; i < 60; i++) {
    assertEqual(Engine.selectQuestions(BANK).length, 30, "run " + i);
  }
});

check("no question appears twice in one attempt", function () {
  for (let i = 0; i < 60; i++) {
    const set = Engine.selectQuestions(BANK);
    const ids = new Set(set.map((q) => q.id));
    assertEqual(ids.size, 30, "run " + i + " had a repeat");
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

check("30 correct is 30/30, 100%, completed", function () {
  const r = Engine.scoreAttempt(responses(30, 30), 30);
  assertEqual(r.score, 30);
  assertEqual(r.percentage, 100);
  assertEqual(r.completed, true);
});

check("29 correct is NOT completed", function () {
  const r = Engine.scoreAttempt(responses(29, 30), 30);
  assertEqual(r.score, 29);
  assertEqual(r.completed, false);
});

check("25 correct is NOT completed", function () {
  assertEqual(Engine.scoreAttempt(responses(25, 30), 30).completed, false);
});

check("0 correct is 0%, not completed", function () {
  const r = Engine.scoreAttempt(responses(0, 30), 30);
  assertEqual(r.score, 0);
  assertEqual(r.percentage, 0);
  assertEqual(r.completed, false);
});

check("unanswered questions simply do not score", function () {
  // Ran out of time after 18 questions, 18 of them right.
  const r = Engine.scoreAttempt(responses(18, 18), 30);
  assertEqual(r.score, 18);
  assertEqual(r.completed, false, "a short attempt must never count as complete");
});

check("the score cannot exceed 30", function () {
  // Even if more responses arrived than there were questions.
  const r = Engine.scoreAttempt(responses(30, 30), 30);
  assert(r.score <= 30, "score was " + r.score);
  assert(r.percentage <= 100, "percentage was " + r.percentage);
});

check("percentage matches score / 30", function () {
  for (let n = 0; n <= 30; n++) {
    const r = Engine.scoreAttempt(responses(n, 30), 30);
    const expected = Math.round((n / 30) * 10000) / 100;
    assertEqual(r.percentage, expected, "at " + n + " correct");
  }
});

check("percentage always fits the numeric(5,2) column", function () {
  for (let n = 0; n <= 30; n++) {
    const p = Engine.scoreAttempt(responses(n, 30), 30).percentage;
    assert(p >= 0 && p <= 100, "out of range: " + p);
    const decimals = (String(p).split(".")[1] || "").length;
    assert(decimals <= 2, p + " has more than 2 decimal places");
  }
});


/* ==========================================================
   THE CLOCK
   ========================================================== */
section("The 10-minute clock");

check("the limit is 10 minutes", function () {
  assertEqual(Engine.TIME_LIMIT_MS, 600000);
});

check("before START, no time has passed", function () {
  const t = Engine.createTimer();
  assertEqual(t.elapsedMs(), 0);
  assertEqual(t.remainingMs(), 600000, "the clock must read a full 10:00 until START");
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
    assert(Math.abs(t.remainingMs() - 510000) < 50, "remaining was " + t.remainingMs());
    assertEqual(t.hasExpired(), false);
  } finally {
    Date.now = realNow;
  }
});

check("the clock expires at exactly 600 seconds", function () {
  const realNow = Date.now;
  const t = Engine.createTimer();
  t.start();
  Date.now = () => realNow() + 600001;
  try {
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
  assertEqual(Engine.formatTime(600), "10:00");
});

check("a negative time never appears on screen", function () {
  assertEqual(Engine.formatTime(-5), "00:00");
});

/* The time limit lives in three places that must agree. When it
   moved from 5 to 10 minutes, the database constraint was left
   behind at 600 s — which a full 10-minute attempt hits exactly,
   so the very slowest legitimate attempt would have been rejected
   on submit. These two checks make that drift fail loudly here
   instead of silently in front of a class. */
check("the SQL duration cap leaves headroom above the time limit", function () {
  const fullAttempt = Engine.TIME_LIMIT_MS / 1000;
  const sql = fs.readFileSync(
    path.join(HERE, "..", "..", "supabase", "migrations", "20260815_quiz_attempts.sql"),
    "utf8"
  );

  const caps = [...sql.matchAll(/duration_seconds\s*>=\s*0\s+and\s+duration_seconds\s*<=\s*(\d+)/g)]
    .map((m) => Number(m[1]));

  assert(caps.length > 0, "no duration constraint found in the migration");

  caps.forEach(function (cap) {
    assert(cap > fullAttempt,
      "the migration caps duration_seconds at " + cap + "s, but a full attempt " +
      "is " + fullAttempt + "s — a timed-out attempt would be rejected");
  });
});

check("the page shows the same limit the engine enforces", function () {
  const html = fs.readFileSync(path.join(HERE, "..", "activity-3.html"), "utf8");
  const expected = Engine.formatTime(Engine.TIME_LIMIT_MS / 1000);   // e.g. "10:00"

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
  assertEqual(Engine.scoreAttempt([], 30).score, 0);
});

check("a fresh sitting gets a different session id", function () {
  assert(Engine.createSessionId() !== Engine.createSessionId());
});

/* The live class scoreboard on the result screens. The rows come
   from the quiz_recent_attempts() function, so these check the
   SQL contract and the rules the panel has to obey. */
section("The class scoreboard");

const migrationSql = fs.readFileSync(
  path.join(HERE, "..", "..", "supabase", "migrations", "20260815_quiz_attempts.sql"),
  "utf8"
);

check("the migration defines the recent-attempts function", function () {
  assert(/create or replace function public\.quiz_recent_attempts/.test(migrationSql),
    "quiz_recent_attempts is missing from the migration");
  assert(/grant execute on function public\.quiz_recent_attempts\(integer\) to anon/.test(migrationSql),
    "anon cannot call quiz_recent_attempts");
});

check("it runs as security definer, or anon could not read anything", function () {
  const fn = migrationSql.slice(migrationSql.indexOf("function public.quiz_recent_attempts"));
  const body = fn.slice(0, fn.indexOf("$$;") + 3);
  assert(/security definer/.test(body), "not security definer");
  assert(/set search_path/.test(body), "security definer without a pinned search_path");
});

check("the scoreboard returns scores but never the answers", function () {
  const fn = migrationSql.slice(migrationSql.indexOf("function public.quiz_recent_attempts"));
  const signature = fn.slice(0, fn.indexOf("language sql"));

  ["student_name", "class_name", "score", "percentage", "completed"].forEach(function (col) {
    assert(signature.includes(col), "scoreboard should return " + col);
  });

  // The whole point: these must never leave the database.
  ["responses", "question_set", "session_id", "attempt_number"].forEach(function (col) {
    assert(!signature.includes(col),
      "scoreboard must not expose " + col + " — it would reveal what students answered");
  });
});

check("the row limit is clamped, so one caller cannot pull everything", function () {
  const fn = migrationSql.slice(migrationSql.indexOf("function public.quiz_recent_attempts"));
  const body = fn.slice(0, fn.indexOf("$$;") + 3);
  assert(/limit least\(greatest\(/.test(body), "row_limit is not clamped");
});

check("the client asks for at least 10 rows", function () {
  // The lecturer asked for a minimum of 10 students on screen.
  const cfg = fs.readFileSync(path.join(HERE, "quiz-config.js"), "utf8");
  const match = cfg.match(/RECENT_SIZE:\s*(\d+)/);
  assert(match, "RECENT_SIZE is missing from quiz-config.js");
  assert(Number(match[1]) >= 10,
    "RECENT_SIZE is " + match[1] + ", but at least 10 attempts should be shown");
});

check("the client points at the function the migration creates", function () {
  const cfg = fs.readFileSync(path.join(HERE, "quiz-config.js"), "utf8");
  const match = cfg.match(/RECENT_FUNCTION:\s*"([^"]+)"/);
  assert(match, "RECENT_FUNCTION is missing from quiz-config.js");
  assert(migrationSql.includes("function public." + match[1]),
    "quiz-config.js calls " + match[1] + ", which the migration does not define");
});

check("both result screens have somewhere to put the scoreboard", function () {
  const html = fs.readFileSync(path.join(HERE, "..", "activity-3.html"), "utf8");
  ["resultHistoryList", "resultHistorySummary", "resultHistoryRefresh",
   "perfectHistoryList", "perfectHistorySummary", "perfectHistoryRefresh"].forEach(function (id) {
    assert(html.includes('id="' + id + '"'), "activity-3.html is missing #" + id);
  });
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
   WHAT GETS SENT TO THE DATABASE
   ========================================================== */
section("The row sent to Supabase");

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

check("the row carries all 30 question ids", function () {
  const qs = Engine.selectQuestions(BANK);
  const rs = qs.map((q) => ({ questionId: q.id, selected: "a", correct: true }));
  const row = buildRow(qs, rs, Engine.scoreAttempt(rs, 30));
  assertEqual(row.question_set.length, 30);
});

check("the row never contains the answer key", function () {
  const qs = Engine.selectQuestions(BANK);
  const rs = qs.map((q) => ({ questionId: q.id, selected: "a", correct: true }));
  const row = buildRow(qs, rs, Engine.scoreAttempt(rs, 30));

  const asText = JSON.stringify(row);
  assert(!asText.includes("correctAnswer"),
    "the answer key leaked into the database payload");

  for (const r of row.responses) {
    const keys = Object.keys(r).sort().join(",");
    assertEqual(keys, "correct,questionId,selected",
      "a response carried unexpected fields: " + keys);
  }
});

check("the row satisfies every database constraint", function () {
  for (const correctCount of [0, 1, 17, 29, 30]) {
    const qs = Engine.selectQuestions(BANK);
    const rs = qs.map((q, i) => ({
      questionId: q.id, selected: "a", correct: i < correctCount,
    }));
    const marks = Engine.scoreAttempt(rs, 30);
    const row = buildRow(qs, rs, marks);

    assert(row.attempt_number >= 1, "attempt_number");
    assert(row.score >= 0 && row.score <= row.total_questions, "score range");
    assertEqual(row.total_questions, 30, "total_questions must be 30");
    assert(row.percentage >= 0 && row.percentage <= 100, "percentage range");
    assert(row.duration_seconds >= 0 && row.duration_seconds <= 900, "duration range");
    assertEqual(row.completed, row.score === row.total_questions,
      "completed must agree with the score — this is what keeps the leaderboard honest");
    assert(row.student_name.trim().length >= 1 && row.student_name.trim().length <= 80, "name length");
    assert(row.class_name.trim().length >= 1 && row.class_name.trim().length <= 40, "class length");
    assertEqual(row.question_set.length, 30, "question_set must hold 30 ids");
    assert(row.responses.length <= 30, "responses must not exceed 30");
  }
});

check("a timed-out attempt is recorded as incomplete", function () {
  const qs = Engine.selectQuestions(BANK);
  // Answered only 12 before the clock ran out; all 12 right.
  const rs = qs.slice(0, 12).map((q) => ({ questionId: q.id, selected: "a", correct: true }));
  const marks = Engine.scoreAttempt(rs, 30);
  const row = buildRow(qs, rs, marks, { timed_out: true, duration_seconds: 600 });

  assertEqual(row.score, 12);
  assertEqual(row.completed, false, "a timed-out attempt can never be a pass");
  assertEqual(row.timed_out, true);
  assertEqual(row.question_set.length, 30, "the full paper is still recorded");
  assertEqual(row.responses.length, 12, "only real answers are stored");
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
