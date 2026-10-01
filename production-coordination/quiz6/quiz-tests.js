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
const html = fs.readFileSync(path.join(here, "..", "activity-6.html"), "utf8");
const app = read("quiz-app.js");
const config = read("quiz-config.js");
const script = fs.readFileSync(path.join(here, "..", "..", "google-apps-script", "activity-6-Code.gs"), "utf8");

assert.equal(bank.length, 23);
assert.equal(engine.QUESTIONS_PER_ATTEMPT, 20);
assert.equal(engine.TIME_LIMIT_MS, 20 * 60 * 1000);
assert.deepEqual(engine.TYPE_QUOTAS, {});
assert.equal(new Set(bank.map((q) => q.id)).size, 23);
assert.deepEqual(bank.map((q) => q.id), Array.from({ length: 23 }, (_, i) => `r${String(i + 1).padStart(3, "0")}`));

for (const q of bank) {
  assert.ok(q.question.trim(), `${q.id}: question text`);
  assert.ok(["single-choice", "multiple-select", "image-choice"].includes(q.type), `${q.id}: type`);
  assert.ok(q.source === "test-1-marking-scheme" || q.source === "production-process-workflow", `${q.id}: source`);
  assert.equal(new Set(q.options.map((option) => option.id)).size, q.options.length, `${q.id}: unique option IDs`);
  const answer = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
  assert.ok(answer.length >= 1 && answer.length < q.options.length, `${q.id}: answer count`);
  for (const id of answer) assert.ok(q.options.some((option) => option.id === id), `${q.id}: answer ${id}`);
  if (q.type === "multiple-select") assert.ok(answer.length > 1, `${q.id}: select multiple`);
  else assert.equal(answer.length, 1, `${q.id}: select one`);
  if (q.type === "image-choice") {
    assert.ok(q.imageAlt && !/Storage → Kitting|Autoclave → Demould/.test(q.imageAlt), `${q.id}: non-revealing alt`);
    assert.ok(fs.existsSync(path.join(here, "..", "quiz6-images", q.image)), `${q.id}: image exists`);
  }
}

assert.equal(bank.filter((q) => q.type === "image-choice").length, 5);
assert.equal(bank.filter((q) => q.type === "multiple-select").length, 3);

const workflowKeys = [
  "Storage → Kitting → Lay-up",
  "Autoclave → Demould → Trimming",
  "NDT → Mechanical Assembly → Painting",
  "Receiving → Final Inspection → Shipping",
  "Kitting → Demould → Packing",
];
for (let i = 0; i < workflowKeys.length; i++) {
  const q = bank[i + 18];
  assert.equal(q.options.find((option) => option.id === q.correctAnswer).text, workflowKeys[i]);
  assert.equal(q.image, `workflow-q${i + 19}.png`);
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
const optionOrders = new Set(Array.from({ length: 30 }, () => engine.shuffleOptions(bank[18]).options.map((o) => o.id).join("")));
assert.ok(optionOrders.size > 1, "workflow answer choices shuffle between attempts");
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

assert.match(html, /id="gameTitle">REVISION 1</);
assert.match(html, /class="game-brand">REVISION 1</);
assert.match(html, /id="workflowZoomDialog"/);
assert.match(html, /id="workflowZoomButton"/);
assert.match(app, /quiz6-images\/.*q\.image/);
assert.match(app, /zoomDialog\.showModal\(\)/);
assert.doesNotMatch(html, /quiz4\//);
for (const match of app.matchAll(/\$\("([A-Za-z][A-Za-z0-9]*)"\)/g)) {
  assert.ok(html.includes(`id="${match[1]}"`), `missing HTML id: ${match[1]}`);
}
for (const file of ["quiz-config.js", "quiz-sheets.js", "quiz-visits.js", "quiz-questions.js", "quiz-engine.js", "quiz-audio.js", "quiz-celebration.js", "quiz-app.js"]) {
  assert.ok(html.includes(`quiz6/${file}`), `missing script: ${file}`);
}

assert.match(config, /PAGE: "activity-6"/);
assert.match(config, /SCRIPT_URL: "(?:PASTE_YOUR_ACTIVITY_6_WEB_APP_URL|https:\/\/script\.google\.com\/macros\/s\/[^" ]+\/exec)"/);
assert.match(config, /SHARED_TOKEN: "rev1-2026-iqa10063"/);
assert.match(script, /var SHARED_TOKEN = 'rev1-2026-iqa10063'/);
assert.match(script, /var ATTEMPTS_SHEET = 'Attempts'/);
assert.match(script, /var VISITS_SHEET   = 'Visits'/);
assert.match(script, /getRange\(2, 1, last - 1, 11\)/);
assert.doesNotMatch(config, /AKfycbzOQKDzdmFkWxxEGqmWH7Sqe17cDo/);

console.log("REVISION 1: 23-question bank, selection, scoring, diagrams, page and separate backend verified.");
