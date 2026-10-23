"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const here = __dirname;
const read = (file) => fs.readFileSync(path.join(here, file), "utf8");
global.window = global;
require(path.join(here, "quiz-engine.js"));
require(path.join(here, "quiz-questions.js"));

const engine = global.QuizEngine;
const bank = global.QUIZ_QUESTIONS;
const html = fs.readFileSync(path.join(here, "..", "activity-8.html"), "utf8");
const app = read("quiz-app.js");
const config = read("quiz-config.js");
const script = fs.readFileSync(path.join(here, "..", "..", "google-apps-script", "activity-8-Code.gs"), "utf8");

/* ---- The shape the activity was specified with --------------- */
assert.equal(bank.length, 40, "bank size");
assert.equal(engine.QUESTIONS_PER_ATTEMPT, 30, "paper size");
assert.equal(engine.TIME_LIMIT_MS, Infinity, "no time limit");
assert.deepEqual(engine.TYPE_QUOTAS, {}, "nothing is drawn, so nothing to balance");
assert.equal(new Set(bank.map((q) => q.id)).size, 40);
assert.deepEqual(bank.map((q) => q.id), Array.from({ length: 40 }, (_, i) => `f${String(i + 1).padStart(3, "0")}`));

for (const q of bank) {
  assert.ok(q.question.trim(), `${q.id}: question text`);
  assert.ok(["single-choice", "multiple-select", "image-choice"].includes(q.type), `${q.id}: type`);
  assert.equal(q.source, "final-exam-set-1", `${q.id}: source`);
  assert.equal(new Set(q.options.map((o) => o.id)).size, q.options.length, `${q.id}: unique option IDs`);
  const answer = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
  assert.ok(answer.length >= 1 && answer.length < q.options.length, `${q.id}: answer count`);
  for (const id of answer) assert.ok(q.options.some((o) => o.id === id), `${q.id}: answer ${id}`);
  if (q.type === "multiple-select") assert.ok(answer.length > 1, `${q.id}: select multiple`);
  else assert.equal(answer.length, 1, `${q.id}: select one`);
  if (q.type === "image-choice") {
    assert.ok(q.imageAlt, `${q.id}: alt text`);
    assert.doesNotMatch(q.imageAlt, /Under Training|Skilled|Expert|REJECT|Rejected/i, `${q.id}: non-revealing alt`);
    assert.ok(fs.existsSync(path.join(here, "..", "quiz8-images", q.image)), `${q.id}: image exists`);
  }
}

/* ---- THE PAPER IS FIXED. This is the point of Activity 8. ----- */
const paper = engine.selectQuestions(bank);
assert.equal(paper.length, 30);
assert.deepEqual(
  paper.map((q) => q.id),
  bank.slice(0, 30).map((q) => q.id),
  "the paper is the first 30 of the bank, in bank order"
);
for (let i = 0; i < 25; i++) {
  const again = engine.selectQuestions(bank);
  assert.deepEqual(again.map((q) => q.id), paper.map((q) => q.id), "same paper every attempt");
  for (let j = 0; j < again.length; j++) {
    assert.deepEqual(
      again[j].options.map((o) => o.id),
      paper[j].options.map((o) => o.id),
      `${again[j].id}: answer choices land in the same order every attempt`
    );
  }
}
// Selecting must not mutate the bank it was handed.
assert.deepEqual(bank.map((q) => q.id), Array.from({ length: 40 }, (_, i) => `f${String(i + 1).padStart(3, "0")}`));
assert.notEqual(paper[0].options, bank[0].options, "the paper gets its own options array, not the bank's");

/* ---- The answer must not always be option A ------------------
   The bank is written with the correct answer first, so it can be
   checked against the marking scheme by eye. Without the rotation
   that would mean pressing A thirty times scores 30 / 30. */
const answerSlot = {};
for (const q of paper) {
  const key = [].concat(q.correctAnswer);
  const slot = q.options.findIndex((o) => o.id === key[0]);
  assert.ok(slot >= 0, `${q.id}: answer is among the options after rotation`);
  answerSlot[slot] = (answerSlot[slot] || 0) + 1;
  // Rotation must preserve the option set exactly — nothing added,
  // nothing dropped, nothing renamed.
  const bankQ = bank.find((b) => b.id === q.id);
  assert.deepEqual(
    q.options.map((o) => o.id).slice().sort(),
    bankQ.options.map((o) => o.id).slice().sort(),
    `${q.id}: same options, only reordered`
  );
  for (const o of q.options) {
    assert.equal(o.text, bankQ.options.find((b) => b.id === o.id).text, `${q.id}: ${o.id} keeps its text`);
  }
}
assert.ok((answerSlot[0] || 0) <= paper.length / 2,
  `the answer sits in slot A on ${answerSlot[0]} of ${paper.length} questions — too many`);
assert.ok(Object.keys(answerSlot).length >= 3, "the answer appears in at least three different slots");

// A student pressing the first option every time must fail.
const alwaysFirst = paper.map((q) => q.options[0].id);
const scoreIfAlwaysA = paper.filter((q, i) => engine.isCorrect(q, alwaysFirst[i])).length;
assert.ok(scoreIfAlwaysA < paper.length, "always choosing A must not be a pass");

// Rotation is derived from the id, so it is stable across runs.
const rotatedTwice = engine.rotateOptions(bank[0]).options.map((o) => o.id);
assert.deepEqual(rotatedTwice, engine.rotateOptions(bank[0]).options.map((o) => o.id), "rotation is stable");

/* ---- Every one of the six exam questions is on the paper ------ */
const topics = {
  "Q1 coordination and workflow": /coordination|workflow|Kitting|material, manpower/i,
  "Q2 Ishikawa and 7QC": /Ishikawa|6M|QC tools/i,
  "Q3 KAIZEN and waste": /KAIZEN|DOWNTIME|waste \(Muda\)|Muda|waste/i,
  "Q4 skill levels": /skill|Unskilled|Semi-Skilled|supervisor/i,
  "Q5 CTRM procedure": /HOD|TNF|CEO|Diagram 2/i,
  "Q6 aids, costs, documents": /audio-visual|Rental|budget|documents/i,
};
for (const [label, pattern] of Object.entries(topics)) {
  assert.ok(paper.some((q) => pattern.test(q.question)), `paper covers ${label}`);
}
// Both examination diagrams appear on the paper.
const paperImages = new Set(paper.filter((q) => q.image).map((q) => q.image));
assert.ok(paperImages.has("skill-levels.png"), "Diagram 1 is on the paper");
assert.ok(paperImages.has("training-procedure.jpg"), "Diagram 2 is on the paper");

/* ---- Marking ------------------------------------------------- */
for (const q of paper) {
  assert.equal(engine.isCorrect(q, q.correctAnswer), true, `${q.id}: correct answer scores`);
  const wrong = q.options.find((o) => ![].concat(q.correctAnswer).includes(o.id));
  assert.equal(engine.isCorrect(q, wrong.id), false, `${q.id}: wrong answer does not`);
}
assert.equal(engine.scoreAttempt(Array.from({ length: 30 }, () => ({ correct: true })), 30).completed, true);
assert.equal(engine.scoreAttempt(Array.from({ length: 29 }, () => ({ correct: true })), 30).completed, false);
assert.equal(engine.scoreAttempt(Array.from({ length: 30 }, () => ({ correct: true })), 30).percentage, 100);

/* ---- The clock runs but can never end the attempt ------------- */
const timer = engine.createTimer();
assert.equal(timer.limitMs, Infinity);
timer.start();
assert.equal(timer.hasExpired(), false);
assert.equal(timer.remainingMs(), Infinity);
const originalNow = Date.now;
try {
  let now = 1000;
  Date.now = () => now;
  const t = engine.createTimer();
  t.start();
  now += 24 * 60 * 60 * 1000;          // a whole day later
  assert.equal(t.hasExpired(), false, "a day of thinking is still not a timeout");
  assert.equal(Math.round(t.elapsedMs() / 1000), 86400);
} finally {
  Date.now = originalNow;
}
// The app must not divide by the (infinite) limit, or carry a timeout path.
assert.doesNotMatch(app, /TIME_LIMIT_MS/, "no arithmetic on an infinite limit");
assert.doesNotMatch(app, /hasExpired/, "nothing can end the attempt on the clock");
assert.match(app, /Math\.min\(\s*Math\.round\(state\.timer\.elapsedMs\(\) \/ 1000\),\s*3600\s*\)/,
  "duration is still clamped to the 3600 s the Apps Script accepts");
assert.match(app, /elapsedMs\(\) \/ 1000/, "the on-screen clock counts up");

/* ---- Page and scripts agree ---------------------------------- */
assert.match(html, /id="gameTitle">REVISION IQA 10067</);
assert.match(html, /class="game-brand">REVISION IQA 10067</);
assert.match(html, /<span id="questionCounter">1 \/ 30<\/span>/);
assert.match(html, /<span id="timerValue">00:00<\/span>/);
assert.match(html, /No Time Limit/);
assert.doesNotMatch(html, /quiz4\/|quiz6\/|quiz7\//);
/* Activity 8 began as a copy of a 20-question activity. Any surviving
   "20" would be wrong on screen — two of them were static text the
   student reads, not placeholders the script overwrites. */
assert.doesNotMatch(html, /20 ?\/ ?20/, "no 20 / 20 left over from Activity 7");
assert.match(html, /You need 30 \/ 30 to complete this challenge\./);
assert.match(html, /Perfect scores only — 30 \/ 30, ranked by time\./);
assert.match(html, /href="activity-7\.html" class="subtab">Activity 7</);
assert.match(html, /href="activity-8\.html" class="subtab subtab-active" aria-current="page">Activity 8</);
assert.match(app, /quiz8-images\/.*q\.image/);
for (const match of app.matchAll(/\$\("([A-Za-z][A-Za-z0-9]*)"\)/g)) {
  assert.ok(html.includes(`id="${match[1]}"`), `missing HTML id: ${match[1]}`);
}
for (const file of ["quiz-config.js", "quiz-sheets.js", "quiz-visits.js", "quiz-questions.js", "quiz-engine.js", "quiz-audio.js", "quiz-celebration.js", "quiz-app.js"]) {
  assert.ok(html.includes(`quiz8/${file}`), `missing script: ${file}`);
}

/* ---- Its own backend, and nobody else's ---------------------- */
assert.match(config, /PAGE: "activity-8"/);
assert.match(config, /SCRIPT_URL: "(?:PASTE_YOUR_ACTIVITY_8_WEB_APP_URL|https:\/\/script\.google\.com\/macros\/s\/[^" ]+\/exec)"/);
assert.match(config, /SHARED_TOKEN: "rev8-2026-iqa10063"/);
assert.match(script, /var SHARED_TOKEN = 'rev8-2026-iqa10063'/);
assert.match(script, /var ATTEMPTS_SHEET = 'Attempts'/);
assert.match(script, /var VISITS_SHEET   = 'Visits'/);
// Activity 8 must never reach Activity 6's or Activity 7's Sheet.
assert.doesNotMatch(script, /1pj8tldvLU3vzZSa2N2WdD8hi_4LV0Y_IIeD5TMnNk0M/, "not Activity 6's Sheet");
assert.doesNotMatch(script, /1CHz2RCAxhMkhMYYaFquMFojbNEWYzCqCsKz65Vfi4og/, "not Activity 7's Sheet");
assert.doesNotMatch(config, /AKfycbzuDA9_WgF2CrUS7DJNDBaJwzFDwiTBl/, "not Activity 6's deployment");
assert.doesNotMatch(config, /AKfycbxeb_iAdsCo3cr3aQ7ixrGKj1/, "not Activity 7's deployment");

console.log("REVISION IQA 10067: 40-question bank, fixed 30-question paper, no time limit, both diagrams, page and separate backend verified.");
