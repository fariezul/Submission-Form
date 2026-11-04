/* REPAIR REVISION — checks on the Composite Repair Activity 2 quiz.

   Run from the project folder:
       node composite-repair/quiz2/quiz-tests.js

   No framework and nothing to install. It checks the pure logic, the shape
   of the bank, the agreement between activity-2.html and quiz-app.js, and
   the contract on both sides of the Google Sheets call.

   What it CANNOT check is what is actually deployed. Apps Script serves the
   last DEPLOYED version, so editing the .gs file with no redeploy changes
   nothing live. These checks catch a wrong file; only a real attempt catches
   a stale deployment. */
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
const html = fs.readFileSync(path.join(here, "..", "activity-2.html"), "utf8");
const app = read("quiz-app.js");
const config = read("quiz-config.js");
const script = fs.readFileSync(
  path.join(here, "..", "..", "google-apps-script", "composite-repair-activity-2-Code.gs"), "utf8");

const SIZE = 30;

assert.equal(bank.length, SIZE);
assert.equal(engine.QUESTIONS_PER_ATTEMPT, 20);
assert.equal(engine.TIME_LIMIT_MS, 20 * 60 * 1000);
assert.deepEqual(engine.TYPE_QUOTAS, { "image-choice": 2 });
assert.equal(new Set(bank.map((q) => q.id)).size, SIZE);
assert.deepEqual(bank.map((q) => q.id),
  Array.from({ length: SIZE }, (_, i) => `c${String(i + 1).padStart(3, "0")}`));

for (const q of bank) {
  assert.ok(q.question.trim(), `${q.id}: question text`);
  assert.ok(["single-choice", "multiple-select", "image-choice"].includes(q.type), `${q.id}: type`);
  assert.equal(q.source, "dqp50153-test-scheme", `${q.id}: source`);
  assert.equal(new Set(q.options.map((option) => option.id)).size, q.options.length, `${q.id}: unique option IDs`);
  const answer = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
  assert.ok(answer.length >= 1 && answer.length < q.options.length, `${q.id}: answer count`);
  for (const id of answer) assert.ok(q.options.some((option) => option.id === id), `${q.id}: answer ${id}`);
  if (q.type === "multiple-select") assert.ok(answer.length > 1, `${q.id}: select multiple`);
  else assert.equal(answer.length, 1, `${q.id}: select one`);

  if (q.image) {
    assert.ok(q.imageAlt, `${q.id}: alt text`);
    assert.ok(fs.existsSync(path.join(here, "..", "quiz2-images", q.image)), `${q.id}: image exists`);
  }
}

assert.equal(bank.filter((q) => q.type === "image-choice").length, 5);
assert.equal(bank.filter((q) => q.type === "multiple-select").length, 7);
assert.equal(bank.filter((q) => q.type === "single-choice").length, 18);

/* THE ALT TEXT MUST NOT GIVE THE ANSWER AWAY.
   ------------------------------------------------------------------
   The figure questions ask the student to READ a diagram. Alt text is in
   the page source and is read aloud by a screen reader, so an alt that
   names the labels answers the question for free — and the first draft of
   this bank did exactly that, spelling out "+45, 0, 90 and -45" directly
   above a question asking for the ply sequence.

   Every answer string of every image-bearing question is checked against
   its own alt text. */
for (const q of bank.filter((item) => item.image)) {
  const alt = q.imageAlt.toLowerCase();
  const answers = [].concat(q.correctAnswer)
    .map((id) => q.options.find((option) => option.id === id).text.toLowerCase());
  for (const text of answers) {
    // Compare on the distinctive words, not stop words like "the" or "ply".
    const words = text.replace(/[^a-z0-9+\- ]/g, " ").split(/\s+/)
      .filter((w) => w.length > 2 && !["the", "ply", "and", "plies", "extra", "structural", "at"].includes(w));
    for (const w of words) {
      assert.ok(!alt.includes(w), `${q.id}: alt text leaks the answer word "${w}"`);
    }
  }
}

/* The figure questions and the answers the marking scheme gives. */
const figureAnswers = {
  c006: ["laminate-defects.png", "Wrinkle"],              // Q2 — X
  c007: ["laminate-defects.png", "Void"],                 // Q2 — Y
  c016: ["scarf-before.png", "+45, 0, 90, −45"],     // Q5 — ply sequence
  c017: ["scarf-before.png", "The 90 ply"],               // Q5 — defect location
  c020: ["scarf-repaired.png", "An extra structural ply at +45"], // Q5 — extra ply
};
for (const [id, [image, answer]] of Object.entries(figureAnswers)) {
  const q = bank.find((item) => item.id === id);
  assert.equal(q.type, "image-choice", `${id}: figure question`);
  assert.equal(q.image, image, `${id}: figure`);
  assert.equal(q.options.find((option) => option.id === q.correctAnswer).text, answer, `${id}: scheme answer`);
}

/* The counts the paper asks for, in the multiple-select questions that
   reproduce them. "Select FOUR" must actually have four right answers. */
const selectCounts = { c005: 4, c008: 3, c009: 4, c012: 3, c014: 4, c022: 3, c027: 2 };
assert.deepEqual(Object.keys(selectCounts).sort(),
  bank.filter((q) => q.type === "multiple-select").map((q) => q.id).sort(),
  "every multiple-select question must have its answer count pinned here");
for (const [id, count] of Object.entries(selectCounts)) {
  const q = bank.find((item) => item.id === id);
  assert.equal(q.correctAnswer.length, count, `${id}: answers promised by the wording`);
}

/* The wording and the answer key must agree: a question that says
   "Select FOUR" with three right answers is unpassable, and nothing else
   in this file would catch it. */
const WORD_NUMBERS = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5, SIX: 6 };
for (const q of bank.filter((item) => item.type === "multiple-select")) {
  const said = q.question.match(/\b(ONE|TWO|THREE|FOUR|FIVE|SIX)\b/);
  assert.ok(said, `${q.id}: a multiple-select question should say how many to pick`);
  assert.equal(q.correctAnswer.length, WORD_NUMBERS[said[1]],
    `${q.id}: wording says ${said[1]} but the key has ${q.correctAnswer.length}`);
}

for (let i = 0; i < 100; i++) {
  const paper = engine.selectQuestions(bank);
  assert.equal(paper.length, 20);
  assert.equal(new Set(paper.map((q) => q.id)).size, 20);
  assert.ok(paper.filter((q) => q.type === "image-choice").length >= 2);
  for (const q of paper) {
    assert.equal(engine.isCorrect(q, q.correctAnswer), true, `${q.id}: correct after shuffle`);
    const wrong = q.options.find((option) => ![].concat(q.correctAnswer).includes(option.id));
    assert.equal(engine.isCorrect(q, wrong.id), false, `${q.id}: wrong answer`);
  }
}

// Every question in the bank must be reachable, or it is dead weight.
const seen = new Set();
for (let i = 0; i < 400; i++) engine.selectQuestions(bank).forEach((q) => seen.add(q.id));
assert.equal(seen.size, SIZE, "some questions are never asked");

const optionOrders = new Set(Array.from({ length: 30 },
  () => engine.shuffleOptions(bank[5]).options.map((o) => o.id).join("")));
assert.ok(optionOrders.size > 1, "figure answer choices shuffle between attempts");

assert.equal(engine.scoreAttempt(Array.from({ length: 20 }, () => ({ correct: true }))).completed, true);
assert.equal(engine.scoreAttempt(Array.from({ length: 19 }, () => ({ correct: true }))).completed, false);
assert.equal(engine.createTimer().limitMs, 20 * 60 * 1000);
const originalNow = Date.now;
try {
  let now = 1000;
  Date.now = () => now;
  const timer = engine.createTimer();
  timer.start();
  now += 20 * 60 * 1000 - 1;
  assert.equal(timer.hasExpired(), false);
  now += 1;
  assert.equal(timer.hasExpired(), true);
} finally {
  Date.now = originalNow;
}

assert.match(html, /id="gameTitle">REPAIR REVISION</);
assert.match(html, /class="game-brand">REPAIR REVISION</);
assert.doesNotMatch(html, /REVISION 2/);
assert.match(html, /id="workflowZoomDialog"/);
assert.match(html, /id="workflowZoomButton"/);
assert.match(app, /quiz2-images\/.*q\.image/);
assert.match(app, /zoomDialog\.showModal\(\)/);
// This page must never load another activity's quiz folder.
assert.doesNotMatch(html, /quiz4\/|quiz6\/|quiz7\/|quiz8\/|activity-1-quiz/);
// The sub-tab bar must reach Activity 1 and mark 2 as the current page.
assert.match(html, /href="activity-1\.html" class="subtab">Activity 1</);
assert.match(html, /href="activity-2\.html" class="subtab subtab-active" aria-current="page">Activity 2</);
// The placeholder copy must be gone.
assert.doesNotMatch(html, /under construction/i);
assert.doesNotMatch(html, /noindex/);

for (const match of app.matchAll(/\$\("([A-Za-z][A-Za-z0-9]*)"\)/g)) {
  assert.ok(html.includes(`id="${match[1]}"`), `missing HTML id: ${match[1]}`);
}
const loadOrder = ["quiz-config.js", "quiz-sheets.js", "quiz-visits.js", "quiz-questions.js",
                   "quiz-engine.js", "quiz-audio.js", "quiz-celebration.js", "quiz-app.js"];
let previous = -1;
for (const file of loadOrder) {
  const at = html.indexOf(`quiz2/${file}`);
  assert.ok(at > -1, `missing script: ${file}`);
  assert.ok(at > previous, `${file} is loaded out of order`);
  previous = at;
}

assert.match(config, /PAGE: "cr-activity-2"/);
assert.match(config, /SCRIPT_URL: "(?:PASTE_YOUR_WEB_APP_URL_HERE|https:\/\/script\.google\.com\/macros\/s\/[^" ]+\/exec)"/);
assert.match(config, /SHARED_TOKEN: "crr-2026-dqp50153"/);
assert.match(script, /var SHARED_TOKEN = 'crr-2026-dqp50153'/);
assert.match(script, /var ATTEMPTS_SHEET = 'Attempts'/);
assert.match(script, /var VISITS_SHEET   = 'Visits'/);
assert.match(script, /getRange\(2, 1, last - 1, 11\)/);
assert.match(script, /var completed = \(score === total\)/);

/* THIS ACTIVITY MUST NEVER WRITE INTO ANOTHER ACTIVITY'S SHEET.
   ------------------------------------------------------------------
   Both files were copied from Activity 7, and a copied URL or
   spreadsheet ID is the one mistake with no visible symptom: every save
   succeeds, and Composite Repair results pile up quietly in a Production
   Coordination spreadsheet. The .gs is container-bound on purpose, so it
   should carry no spreadsheet ID at all. */
assert.doesNotMatch(script, /SPREADSHEET_ID\s*=\s*'[^']+'/,
  "this script must be container-bound, not pointed at a spreadsheet by ID");
assert.match(script, /getActiveSpreadsheet\(\)/);
assert.doesNotMatch(script, /rev2-2026-iqa10063/);
assert.doesNotMatch(config, /rev2-2026-iqa10063/);
assert.doesNotMatch(config, /AKfycbxeb_iAdsCo3cr3aQ7ixrGKj1_L_EgpfxhtSVMTYNBWjgEUbxgl3iCkkmS5I4fmigRZ/,
  "that is Activity 7's Web App URL");

/* Storage keys are shared across the whole domain, so a key in common with
   another activity means muting the sound in one mutes the other. */
const audio = read("quiz-audio.js");
const visits = read("quiz-visits.js");
assert.match(audio, /STORAGE_KEY = "crr-sound"/);
assert.match(visits, /STORAGE_KEY = "crr-visit-logged"/);
for (const file of [audio, visits]) assert.doesNotMatch(file, /"rev2-/);

console.log(`REPAIR REVISION: ${SIZE}-question bank, selection, scoring, figures, alt text, page and separate backend verified.`);
