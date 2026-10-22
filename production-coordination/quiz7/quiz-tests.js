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
const html = fs.readFileSync(path.join(here, "..", "activity-7.html"), "utf8");
const app = read("quiz-app.js");
const config = read("quiz-config.js");
const script = fs.readFileSync(path.join(here, "..", "..", "google-apps-script", "activity-7-Code.gs"), "utf8");

assert.equal(bank.length, 25);
assert.equal(engine.QUESTIONS_PER_ATTEMPT, 20);
assert.equal(engine.TIME_LIMIT_MS, 20 * 60 * 1000);
assert.deepEqual(engine.TYPE_QUOTAS, { "image-choice": 2 });
assert.equal(new Set(bank.map((q) => q.id)).size, 25);
assert.deepEqual(bank.map((q) => q.id), Array.from({ length: 25 }, (_, i) => `t${String(i + 1).padStart(3, "0")}`));

for (const q of bank) {
  assert.ok(q.question.trim(), `${q.id}: question text`);
  assert.ok(["single-choice", "multiple-select", "image-choice"].includes(q.type), `${q.id}: type`);
  assert.equal(q.source, "test-2-marking-scheme", `${q.id}: source`);
  assert.equal(new Set(q.options.map((option) => option.id)).size, q.options.length, `${q.id}: unique option IDs`);
  const answer = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
  assert.ok(answer.length >= 1 && answer.length < q.options.length, `${q.id}: answer count`);
  for (const id of answer) assert.ok(q.options.some((option) => option.id === id), `${q.id}: answer ${id}`);
  if (q.type === "multiple-select") assert.ok(answer.length > 1, `${q.id}: select multiple`);
  else assert.equal(answer.length, 1, `${q.id}: select one`);
  if (q.type === "image-choice") {
    // The alt text must describe the figure without naming the stages a
    // question asks for, or a screen reader hands out the answer.
    assert.ok(q.imageAlt, `${q.id}: alt text`);
    assert.doesNotMatch(q.imageAlt, /Need Assessment|Measuring Effectiveness|Learning Style|Audience Consideration|Communication of Training/, `${q.id}: non-revealing alt`);
    assert.ok(fs.existsSync(path.join(here, "..", "quiz7-images", q.image)), `${q.id}: image exists`);
  }
}

assert.equal(bank.filter((q) => q.type === "image-choice").length, 5);
assert.equal(bank.filter((q) => q.type === "multiple-select").length, 6);

// The five diagram questions and the answers the marking scheme gives.
const diagramAnswers = [
  "Need Assessment",            // t007 — X
  "Measuring Effectiveness",    // t008 — Z
  "Learning Style",             // t009 — after Learning Objectives
  "Audience Consideration",     // t010 — before Content Development
  "Communication of Training",  // t011 — after Time lines
];
for (let i = 0; i < diagramAnswers.length; i++) {
  const q = bank[i + 6];
  assert.equal(q.type, "image-choice", `${q.id}: diagram question`);
  assert.equal(q.image, "training-plan.jpg", `${q.id}: figure`);
  assert.equal(q.options.find((option) => option.id === q.correctAnswer).text, diagramAnswers[i], `${q.id}: scheme answer`);
}

// The counts the Test 2 paper asks for, in the multiple-select questions
// that reproduce them.
const selectCounts = { t004: 5, t012: 5, t014: 5, t016: 3, t018: 3, t020: 2 };
for (const [id, count] of Object.entries(selectCounts)) {
  const q = bank.find((item) => item.id === id);
  assert.equal(q.correctAnswer.length, count, `${id}: marks awarded`);
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
const optionOrders = new Set(Array.from({ length: 30 }, () => engine.shuffleOptions(bank[6]).options.map((o) => o.id).join("")));
assert.ok(optionOrders.size > 1, "diagram answer choices shuffle between attempts");
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

assert.match(html, /id="gameTitle">REVISION 2</);
assert.match(html, /class="game-brand">REVISION 2</);
assert.match(html, /id="workflowZoomDialog"/);
assert.match(html, /id="workflowZoomButton"/);
assert.match(app, /quiz7-images\/.*q\.image/);
assert.match(app, /zoomDialog\.showModal\(\)/);
assert.doesNotMatch(html, /quiz4\/|quiz6\//);
// The sub-tab bar must still reach Activity 6, and mark 7 as the current page.
assert.match(html, /href="activity-6\.html" class="subtab">Activity 6</);
assert.match(html, /href="activity-7\.html" class="subtab subtab-active" aria-current="page">Activity 7</);
for (const match of app.matchAll(/\$\("([A-Za-z][A-Za-z0-9]*)"\)/g)) {
  assert.ok(html.includes(`id="${match[1]}"`), `missing HTML id: ${match[1]}`);
}
for (const file of ["quiz-config.js", "quiz-sheets.js", "quiz-visits.js", "quiz-questions.js", "quiz-engine.js", "quiz-audio.js", "quiz-celebration.js", "quiz-app.js"]) {
  assert.ok(html.includes(`quiz7/${file}`), `missing script: ${file}`);
}

assert.match(config, /PAGE: "activity-7"/);
assert.match(config, /SCRIPT_URL: "(?:PASTE_YOUR_ACTIVITY_7_WEB_APP_URL|https:\/\/script\.google\.com\/macros\/s\/[^" ]+\/exec)"/);
assert.match(config, /SHARED_TOKEN: "rev2-2026-iqa10063"/);
assert.match(script, /var SHARED_TOKEN = 'rev2-2026-iqa10063'/);
assert.match(script, /var ATTEMPTS_SHEET = 'Attempts'/);
assert.match(script, /var VISITS_SHEET   = 'Visits'/);
assert.match(script, /getRange\(2, 1, last - 1, 11\)/);
// Activity 7 must never write into Activity 6's spreadsheet.
assert.doesNotMatch(script, /1pj8tldvLU3vzZSa2N2WdD8hi_4LV0Y_IIeD5TMnNk0M/);
assert.doesNotMatch(config, /AKfycbzuDA9_WgF2CrUS7DJNDBaJwzFDwiTBl-VYb4rsLY_olaT33RV-kWmLz4RLIrtMxvc7Vg/);

console.log("REVISION 2: 25-question bank, selection, scoring, diagram, page and separate backend verified.");
