/* ============================================================
   line-tests.js — CHECKS ON THE RULES OF THE LINE
   ============================================================
   Run from the project folder:

       node production-coordination/line5/line-tests.js

   No test framework and nothing to install — it uses only what
   Node already has.

   ------------------------------------------------------------
   WHAT IS WORTH TESTING HERE, AND WHY
   ------------------------------------------------------------
   Three things, and they are the three things that would do real
   damage without anyone noticing:

   1. THE MATHS. If the bottleneck is computed wrongly the class
      spends the second round improving the wrong station and the
      numbers get worse, which teaches them the opposite of the
      lesson. So there is a worked example below with times chosen
      to be checkable on paper, and every figure the dashboard
      shows is asserted against a number worked out by hand.

   2. THE CONTRACT WITH THE SHEET. The Apps Script is the deployed
      backend and line-sheets.js is the client. Both are plain
      text on disk, and most of the ways this breaks — a renamed
      field, a column read under the wrong name — are visible
      there without deploying anything.

   3. THE DOM WIRING. Activity 3 shipped with quiz-app.js looking
      up an id the HTML did not contain; the quiz threw on the
      first question and the student was stuck. That is the single
      cheapest bug to prevent mechanically, so every id these
      scripts look up is checked against the page that loads them.

   What it deliberately does NOT do is call the Google Sheet. That
   needs the deployed Web App, and the round trip is verified by
   hand once, following ACTIVITY5-README.md.
   ============================================================ */

"use strict";

const fs = require("fs");
const path = require("path");

const HERE = __dirname;
const PC = path.join(HERE, "..");
const APP = path.join(PC, "..");

/* The browser files attach themselves to "window". Node has no
   window, so make one and let them populate it. */
global.window = global;

require(path.join(HERE, "line-config.js"));
require(path.join(HERE, "line-analytics.js"));
require(path.join(HERE, "line-clock.js"));

const CONFIG = global.LINE_CONFIG;
const A = global.LineAnalytics;
const Clock = global.LineClock;

/* The other three files are read as TEXT rather than required.
   line-store.js and line-sheets.js reach for localStorage and
   fetch at load time, and line-board.js expects a document. What
   is worth checking about them is their contract with the Apps
   Script and the HTML, and that is all visible in the source. */
const SRC = {
  store:   read(path.join(HERE, "line-store.js")),
  sheets:  read(path.join(HERE, "line-sheets.js")),
  board:   read(path.join(HERE, "line-board.js")),
  station: read(path.join(HERE, "line-station.js")),
  charts:  read(path.join(HERE, "line-charts.js")),
  css:     read(path.join(HERE, "line.css")),
  gs:      read(path.join(APP, "google-apps-script", "activity-5-Code.gs")),
  board_html:   read(path.join(PC, "activity-5.html")),
  station_html: read(path.join(HERE, "station-a.html")),
};

function read(p) {
  return fs.readFileSync(p, "utf8");
}

/* Source with /* … *​/ blocks and // lines removed.
   ------------------------------------------------------------
   Several checks below ask "does this file contain X?" where X is
   a mistake. These files are heavily commented and explain those
   mistakes at length — so a plain search finds the WARNING and
   reports a failure, which is the most annoying possible kind of
   false alarm. Strip the prose first and ask about the code. */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");
}


/* ============================================================
   THE TINIEST POSSIBLE TEST HARNESS
   ============================================================ */
let passed = 0;
const failures = [];
let group = "";

function describe(name) {
  group = name;
  console.log("\n" + name);
}

function ok(condition, message) {
  if (condition) {
    passed++;
    console.log("  ✓ " + message);
  } else {
    failures.push(group + " → " + message);
    console.log("  ✗ " + message);
  }
}

/* Times are compared with a tolerance because averages divide.
   One millisecond is far tighter than anything that could matter
   and far looser than floating point error. */
function isNum(v) {
  return typeof v === "number" && isFinite(v);
}

function near(actual, expected, message, tol) {
  const t = tol === undefined ? 1 : tol;
  const good = typeof actual === "number" && isFinite(actual) &&
               Math.abs(actual - expected) <= t;
  ok(good, message + "  (expected " + expected + ", got " + actual + ")");
}


/* ============================================================
   THE WORKED EXAMPLE
   ============================================================
   Four stations taking 10s, 30s, 5s and 5s. Three aeroplanes.
   No variation at all, so every figure can be worked out on
   paper — which is the point. If a formula drifts, this is where
   it shows up as a number a human can check.

   Working it through by hand:

     plane 1   A 0-10    B 10-40    C 40-45     D 45-50
     plane 2   A 10-20   B 40-70    C 70-75     D 75-80
     plane 3   A 20-30   B 70-100   C 100-105   D 105-110

   Notice plane 2 finishes Marking at 0:20 but does not enter
   Folding until 0:40, because Folding is still on plane 1. That
   twenty-second gap is the queue, and it grows: plane 3 waits
   forty. That is the pile on the desk, in numbers.
   ============================================================ */
const S = 1000;

const STATIONS = [
  { key: "A", name: "Marking",       colour: "#38bdf8" },
  { key: "B", name: "Folding",       colour: "#818cf8" },
  { key: "C", name: "Labelling",     colour: "#c084fc" },
  { key: "D", name: "Quality Check", colour: "#f472b6" },
];

const EXAMPLE = {
  stations: STATIONS,
  itemCount: 3,
  exits: [
    [10 * S, 20 * S, 30 * S],
    [40 * S, 70 * S, 100 * S],
    [45 * S, 75 * S, 105 * S],
    [50 * S, 80 * S, 110 * S],
  ],
  verdicts: {},
  taktMs: 40 * S,
};

const ex = A.analyse(EXAMPLE);


describe("The worked example — station times");

near(ex.perStation[0].avgCycle, 10 * S, "Marking averages 10s");
near(ex.perStation[1].avgCycle, 30 * S, "Folding averages 30s");
near(ex.perStation[2].avgCycle, 5 * S, "Labelling averages 5s");
near(ex.perStation[3].avgCycle, 5 * S, "Quality Check averages 5s");

ok(ex.line.bottleneck.key === "B", "Folding is identified as the bottleneck");
near(ex.line.bottleneckCycleMs, 30 * S, "the bottleneck cycle is 30s");
near(ex.line.runWindowMs, 110 * S, "the round runs 110s end to end");


describe("The punchline — the line runs at the speed of its bottleneck");

/* Aeroplanes leave Quality Check at 50, 80 and 110 — thirty
   seconds apart, which is exactly Folding's cycle time. Every
   other station is faster and it makes no difference whatsoever.
   If this assertion ever fails, the activity has stopped teaching
   the thing it exists to teach. */
near(ex.line.lineCycleMs, 30 * S, "one aeroplane leaves every 30s");
near(ex.line.lineCycleMs, ex.line.bottleneckCycleMs,
     "the line cycle equals the bottleneck cycle");


describe("Queue and starve — the same gap from two sides");

/* Plane 2 waits 20s in front of Folding; plane 3 waits 40s. */
near(ex.queue[1][0], 0, "plane 1 waits for nothing at Folding");
near(ex.queue[1][1], 20 * S, "plane 2 waits 20s at Folding");
near(ex.queue[1][2], 40 * S, "plane 3 waits 40s at Folding");

/* Marking is never starved: the paper is always there. */
near(ex.perStation[0].totalStarveMs, 0, "Marking never waits for work");

/* Folding waits only at the very start, for the first plane. */
near(ex.perStation[1].totalStarveMs, 10 * S,
     "Folding waits 10s in total, only for the first plane");

/* Labelling and Quality Check spend most of the round waiting. */
near(ex.perStation[2].totalStarveMs, 90 * S, "Labelling waits 90s in total");
near(ex.perStation[3].totalStarveMs, 95 * S, "Quality Check waits 95s in total");

/* The invariant the whole model rests on: because start is the
   LATER of "I am free" and "it has arrived", at most one of the
   two gaps can be non-zero. If both were ever positive the model
   would be double-counting lost time. */
let bothPositive = 0;
for (let s = 0; s < 4; s++) {
  for (let i = 0; i < 3; i++) {
    if (ex.queue[s][i] > 0 && ex.starve[s][i] > 0) bothPositive++;
  }
}
ok(bothPositive === 0,
   "queue and starve are never both positive for the same plane");


describe("Lead time adds up");

/* Plane 1 is picked up at 0 and finished at 50. Plane 3 is
   picked up at 20 and finished at 110. */
near(ex.perItem[0].leadMs, 50 * S, "plane 1 takes 50s end to end");
near(ex.perItem[1].leadMs, 70 * S, "plane 2 takes 70s end to end");
near(ex.perItem[2].leadMs, 90 * S, "plane 3 takes 90s end to end");
near(ex.line.avgLeadMs, 70 * S, "the average plane takes 70s");

/* Every plane gets exactly 50s of actual work: 10+30+5+5. */
for (let i = 0; i < 3; i++) {
  near(ex.perItem[i].vaMs, 50 * S, "plane " + (i + 1) + " gets 50s of real work");
}

/* THE ACCOUNTING IDENTITY. Time in the line is either being
   worked on or waiting in a pile — there is no third place for it
   to go. If this ever fails, some time is being lost or counted
   twice, and every efficiency figure on the dashboard is wrong. */
for (let i = 0; i < 3; i++) {
  near(ex.perItem[i].leadMs, ex.perItem[i].vaMs + ex.perItem[i].waitMs,
       "plane " + (i + 1) + ": lead time = work + waiting");
}


describe("The two averages the lecturer asks for by name");

/* Students mix these up constantly, so both are pinned against
   the hand-worked example.

   ONE STATION on ONE plane: the four stations take 10s, 30s, 5s
   and 5s, so the average station spends 12.5s on a plane.

   ONE PLANE start to finish: 70s, because on top of the 50s of
   actual work it spends time sitting in a pile.

   The second being nearly six times the first is the entire
   point of the activity, so if these two ever converge on the
   worked example something has broken. */
near(ex.line.avgStationCycleMs, 12.5 * S,
     "the average station spends 12.5s on one plane");
near(ex.line.avgLeadMs, 70 * S,
     "the average plane takes 70s from start to finish");
ok(ex.line.avgLeadMs > ex.line.avgStationCycleMs * 3,
   "a plane takes far longer than any one station spends on it");

/* And it is the mean of the stations, not of every reading — with
   equal counts those coincide, so the example is built to tell
   them apart only if a station is missing readings. */
const lopsided = A.analyse({
  stations: STATIONS,
  itemCount: 3,
  exits: [[10 * S, 20 * S, 30 * S],
          [40 * S, 70 * S, 100 * S],
          [45 * S, 75 * S, 105 * S],
          [50 * S, null, null]],
  verdicts: {},
  taktMs: null,
});
ok(isNum(lopsided.line.avgStationCycleMs),
   "the station average still reports when one station has fewer readings");


describe("The wording is aimed at a first-semester student");

/* The technical terms are still taught — they are in the
   sentences and the students are examined on them — but a tile
   heading has room for about four words, and those four words
   should not be the ones the student is here to learn. */
const boardSrc = SRC.board;

/* The pair the lecturer asked for, headed in the same shape so
   the two numbers can be compared at a glance. */
ok(boardSrc.indexOf("ONE STATION on ONE plane") !== -1,
   "the dashboard shows the per-station average, headed in plain words");
ok(boardSrc.indexOf("ONE PLANE start to finish") !== -1,
   "and the per-plane average, headed the same way");

/* The tile grid is deliberately short. Fourteen figures read as
   decoration; a student cannot tell which one the lesson is
   about. Everything cut from it still lives in the findings, the
   charts and the station table — so this counts the tiles AND
   checks nothing was actually lost. */
const tileCount = (boardSrc.match(/^\s*tile\(/gm) || []).length;
ok(tileCount <= 7,
   "the tile grid stays short (" + tileCount + " tiles)");

/* Each idea has to reach the student in plain words somewhere,
   AND keep its proper name so the vocabulary is still taught.
   Checked against the findings, which is where the explanations
   moved to — not against the tile labels, which is where they
   used to be. */
/* Built here rather than reusing the one from the quality
   section further down — that is declared later in the file, and
   reaching forward for it threw at load. */
const wordingRejects = A.analyse(Object.assign({}, EXAMPLE, {
  verdicts: { 0: { verdict: "reject", cause: 1 } },
}));

const spoken = findingText(wordingRejects) + " " + findingText(ex) + " " + boardSrc;

/* process cycle efficiency and Little's Law are absent from this
   list on purpose — see the block above. The IDEA behind the
   first is still checked, just without its name. */
ok(/being worked on|real work/i.test(spoken),
   "the working-versus-waiting idea is explained, without naming it");

[["takt time",        /every 40s|customer/i],
 ["first pass yield", /rejected|passed the check/i],
 ["line balance",     /shared out/i],
 ["bottleneck",       /slowest station/i],
 ["work in progress", /stuck in the line/i]].forEach(function (pair) {
  ok(pair[1].test(spoken),
     'the idea behind "' + pair[0] + '" is explained in plain words');
  ok(spoken.indexOf(pair[0]) !== -1,
     'and "' + pair[0] + '" itself still appears, so the term is not lost');
});

/* No jargon left as a bare column heading. */
["<th>Lead</th>", "<th>Efficiency</th>", "<th>Median</th>",
 "<th>Spread</th>", "<th>Verdict</th>"].forEach(function (h) {
  ok(boardSrc.indexOf(h) === -1,
     "no column is headed " + h.replace(/<\/?th>/g, ""));
});


describe("The derived figures");

/* 150s of work inside 210s of lead time. */
near(ex.line.pce, 150 / 210, "process cycle efficiency is 150/210", 0.0005);

/* (10+30+5+5) / (4 x 30) */
near(ex.line.balanceEfficiency, 50 / 120, "line balance is 50/120", 0.0005);

/* Sum of the stations for the first plane, then one bottleneck
   cycle for each one after it: 50 + 2x30. With no variation at
   all the line achieves exactly this, which is the definition of
   a perfectly steady line. */
near(ex.line.theoreticalMinMs, 110 * S, "the theoretical minimum is 110s");
near(ex.line.theoreticalMinMs, ex.line.runWindowMs,
     "a line with no variation hits its theoretical minimum exactly");

near(ex.perStation[1].utilisation, 90 / 110, "Folding is busy 90s of 110s", 0.0005);
near(ex.perStation[3].utilisation, 15 / 110, "Quality Check is busy 15s of 110s", 0.0005);


describe("Little's Law");

/* Worked by hand: planes are in the line 0-50, 10-80 and 20-110,
   which integrates to 210 plane-seconds over a 110s round.

   The law says the same number can be reached from throughput
   and lead time without ever counting the planes: 3/110 planes
   per second times 70s each. It comes out at 210/110 both ways.
   Seeing those two agree on real class data is the moment the
   formula stops looking made up. */
near(ex.line.avgWip, 210 / 110, "average WIP measured directly is 210/110", 0.0005);
near(ex.line.littleLawWip, 210 / 110, "Little's Law gives the same figure", 0.0005);
near(ex.line.avgWip, ex.line.littleLawWip,
     "measured WIP and Little's Law agree", 0.0005);
ok(ex.line.maxWip === 3, "at its fullest the line held 3 planes");


describe("Takt");

/* Takt is 40s here and Folding takes 30s, so the line can keep
   up. Nothing should be flagged. */
ok(ex.line.overTakt.length === 0, "no station is over takt at 40s");

const tight = A.analyse(Object.assign({}, EXAMPLE, { taktMs: 20 * S }));
ok(tight.line.overTakt.length === 1 && tight.line.overTakt[0].key === "B",
   "at a 20s takt, only Folding is flagged as unable to keep up");


describe("Quality");

const withRejects = A.analyse(Object.assign({}, EXAMPLE, {
  verdicts: { 0: { verdict: "reject", cause: 1 }, 1: { verdict: "pass", cause: null } },
}));
near(withRejects.line.fpy, 2 / 3, "one reject in three is a 67% first pass yield", 0.001);
ok(withRejects.line.causeCounts[1] === 1, "the fault is attributed to Folding");
near(withRejects.line.wastedVaMs, 50 * S,
     "the rejected plane wasted 50s of the team's effort");


/* ============================================================
   BAD AND MISSING DATA
   ============================================================
   A round is timed by teenagers holding paper. Taps get missed,
   doubled and mistimed. None of that may be allowed to produce a
   confident wrong number.
   ============================================================ */
describe("Bad and missing readings");

const impossible = A.analyse({
  stations: STATIONS,
  itemCount: 1,
  // Folding claims to have finished before Marking did.
  exits: [[30 * S], [20 * S], [40 * S], [50 * S]],
  verdicts: {},
  taktMs: null,
});
ok(impossible.line.problems.length >= 1,
   "a plane leaving Folding before Marking finished it is reported");
ok(impossible.proc[1][0] === null,
   "the impossible reading is excluded rather than averaged as negative");
ok(impossible.perStation[1].avgCycle === null,
   "Folding has no average rather than a nonsense one");

const holes = A.analyse({
  stations: STATIONS,
  itemCount: 3,
  exits: [[10 * S, 20 * S, 30 * S], [40 * S, null, 100 * S],
          [45 * S, 75 * S, 105 * S], [50 * S, 80 * S, 110 * S]],
  verdicts: {},
  taktMs: null,
});
ok(holes.line.problems.length >= 1, "a missing tap in the middle is reported");
ok(holes.line.completed === 1,
   "only the plane with a complete journey counts as finished");

const empty = A.analyse({ stations: STATIONS, itemCount: 20, exits: [[], [], [], []],
                          verdicts: {}, taktMs: 90 * S });
ok(empty.line.completed === 0, "an empty round completes nothing");
ok(empty.line.bottleneck === null, "an empty round names no bottleneck");
ok(empty.line.avgLeadMs === null, "an empty round has no average lead time");
ok(empty.line.runWindowMs === 0, "an empty round has run for no time");
ok(A.findings(empty).length >= 1, "an empty round still produces a readable message");

const one = A.analyse({ stations: STATIONS, itemCount: 1,
                        exits: [[10 * S], [40 * S], [45 * S], [50 * S]],
                        verdicts: {}, taktMs: null });
ok(one.line.completed === 1, "a single plane completes");
ok(one.line.lineCycleMs === null,
   "a single plane gives no line cycle — there is no gap to measure");
ok(one.perStation[0].sdCycle === null, "one reading has no standard deviation");

/* A partial round is the normal case: the dashboard analyses
   every few seconds while the class is still working. */
const partial = A.analyse({
  stations: STATIONS,
  itemCount: 20,
  exits: [[10 * S, 20 * S, 30 * S], [40 * S, 70 * S], [45 * S], []],
  verdicts: {},
  taktMs: 90 * S,
});
ok(partial.line.completed === 0, "nothing has reached the end yet");
ok(partial.line.problems.length === 0,
   "a partly-finished round is not mistaken for broken data");
near(partial.perStation[0].avgCycle, 10 * S, "Marking's average is already usable");
ok(A.findings(partial).length >= 1, "a partial round still says something");


/* ============================================================
   THE TAP LOG
   ============================================================
   line-store.js loads in Node without complaint: its only
   dependency on a browser is localStorage, every access to which
   is wrapped, so it quietly reports storageWorks() === false and
   keeps everything in memory. Which means the append-only log can
   be exercised for real here rather than merely read as text.
   ============================================================ */
describe("The tap log");

require(path.join(HERE, "line-store.js"));
const Store = global.LineStore;

ok(Store.storageWorks() === false,
   "with no localStorage the store degrades instead of throwing");

/* THE SECOND REGRESSION.
   ------------------------------------------------------------
   With storage unavailable — private browsing, which a student
   may well be in — the device id used to be re-generated on every
   call. Nothing looked broken, because event ids stayed unique.
   But "was this tap mine?" then answered no every time, and the
   Undo button on that phone silently did nothing all round.

   Every assertion below about undo depends on this one. */
ok(Store.deviceId() === Store.deviceId(),
   "the device id is stable even when localStorage is unavailable");

Store.openRound({ code: "T", roundNo: 1, startedAt: 0, itemCount: 10,
                  taktMs: null, status: "live", solo: true });

for (let i = 0; i < 5; i++) {
  Store.recordDone(1, Store.nextItemIndex(1), (i + 1) * 1000);
}
ok(Store.doneCount(1) === 5, "five taps are recorded");
ok(Store.nextItemIndex(1) === 5, "the next plane is the sixth");

/* Undo the last tap and the station goes back to where it was —
   the common case, and the one the phone's Undo button uses. */
const lastTap = Store.lastOwnDone(1);
Store.undo(lastTap.id);
ok(Store.doneCount(1) === 4, "undo removes the last tap");
ok(Store.nextItemIndex(1) === 4, "and the next plane steps back with it");

/* Undoing the undo puts it back. A student who over-corrects
   should not be stuck. */
const theUndo = Store.events()[Store.events().length - 1];
Store.undo(theUndo.id);
ok(Store.doneCount(1) === 5, "an undo can itself be undone");

/* THE REGRESSION THIS SECTION EXISTS FOR.
   ------------------------------------------------------------
   The dashboard's Data tab can delete ANY reading, not just the
   last. Deleting one from the middle leaves a hole, and the count
   of recorded planes is then smaller than the next plane's index.

   If the next tap were placed by COUNT it would land on top of a
   good later reading and destroy it — silently, because an
   overwrite looks exactly like a normal tap. Placing it one past
   the highest leaves the hole where it is, and the analysis
   already knows how to report a hole. */
const middle = Store.events().filter(function (e) {
  return e.k === "done" && e.item === 2;
})[0];
Store.undo(middle.id);

ok(Store.doneCount(1) === 4, "deleting a middle reading drops the count to four");
ok(Store.nextItemIndex(1) === 5,
   "but the next plane is still the sixth, not the fifth");

Store.recordDone(1, Store.nextItemIndex(1), 9000);
const rowAfter = Store.build().exits[1];
ok(rowAfter[4] === 5000,
   "the good fifth reading survives the next tap (this is the bug)");
ok(rowAfter[5] === 9000, "the new tap lands on the sixth plane");
ok(rowAfter[2] === undefined || rowAfter[2] === null,
   "the deleted reading stays a hole");

/* A corrected time replaces the value without destroying the
   original event. */
const toFix = Store.events().filter(function (e) {
  return e.k === "done" && e.item === 0;
})[0];
Store.editTime(toFix.id, 1500);
ok(Store.build().exits[1][0] === 1500, "an edit changes the reading");
ok(Store.events().some(function (e) { return e.id === toFix.id; }),
   "and the original tap is still in the log");

/* Merging the same events twice must change nothing — the
   dashboard re-reads the whole round every ten seconds. */
const snapshot = JSON.parse(JSON.stringify(Store.events()));
const before = Store.events().length;
Store.mergeEvents(snapshot);
ok(Store.events().length === before, "merging known events adds nothing");
Store.mergeEvents(snapshot);
ok(Store.events().length === before, "merging them again still adds nothing");

Store.mergeEvents([{ id: "other-1", seq: 1, k: "done", st: 2, item: 0, ms: 4000, at: 1 }]);
ok(Store.events().length === before + 1, "an unknown event from the sheet is taken in");
ok(Store.build().exits[2][0] === 4000, "and it reaches the grid");

/* Verdicts, and the last one winning. */
Store.recordVerdict(0, "reject", 1);
ok(Store.build().verdicts[0].verdict === "reject", "a verdict is recorded");
ok(Store.build().verdicts[0].cause === 1, "with the station that caused it");
Store.recordVerdict(0, "pass", null);
ok(Store.build().verdicts[0].verdict === "pass",
   "a corrected verdict replaces the earlier one");

/* The outbox holds everything until it is told otherwise. */
ok(Store.outboxSize() === Store.events().length - 1,
   "every locally-made tap is queued for upload (the merged one is not)");

Store.clearActive();
ok(Store.header() === null, "clearing the round empties the store");


describe("A station's own count does not depend on the one before it");

/* Found by running the live site: Folding had tapped twice, its
   card read "0 of 6", and the two taps were sitting safely in the
   sheet the whole time.
   ------------------------------------------------------------
   perStation.done counts planes with a COMPUTABLE PROCESS TIME,
   and that needs the upstream station to have reported too. It is
   the right number for an average and the wrong number for a
   card, because a student whose own phone is working perfectly
   would see zero whenever Marking's phone dropped off the wifi —
   and would reasonably decide their taps were being lost.

   Both numbers are legitimate. This pins the difference so the
   two are not quietly swapped for each other again. */
const upstreamMissing = A.analyse({
  stations: STATIONS,
  itemCount: 6,
  exits: [[],                       // Marking has uploaded nothing
          [40 * S, 70 * S],         // Folding has tapped twice
          [], []],
  verdicts: {},
  taktMs: null,
});

ok(upstreamMissing.perStation[1].done === 0,
   "with no upstream times, Folding has no measurable cycles");
ok(upstreamMissing.perStation[1].avgCycle === null,
   "and honestly reports no average rather than inventing one");

/* The raw taps are still there, which is what the card must show. */
const rawTaps = upstreamMissing.exits[1].filter(function (v) {
  return typeof v === "number";
}).length;
ok(rawTaps === 2, "but both of Folding's taps are still in the data");

ok(upstreamMissing.line.problems.length >= 1,
   "and the missing upstream readings are reported as a problem");

/* The dashboard must read the card's number off the raw taps. */
ok(/const mine = countDone\(a, p\.index\)/.test(SRC.board),
   "the station card counts the station's own taps");
ok(!/esc\(String\(p\.done\)\)/.test(SRC.board),
   "and not the count of planes it could work a time out for");


describe("Every chart survives every shape of data");

/* A NaN reaching an SVG attribute renders nothing at all, with no
   error anywhere — which is why this checks the output text
   rather than merely that the call did not throw. */
require(path.join(HERE, "line-charts.js"));
const Charts = global.LineCharts;

const shapes = {
  "the worked example": ex,
  "an empty round": empty,
  "a single plane": one,
  "a partial round": partial,
  "impossible readings": impossible,
  "rejects": withRejects,
};

Object.keys(shapes).forEach(function (label) {
  Object.keys(Charts).forEach(function (name) {
    if (name === "roundCompare") return;   // takes a comparison, tested below
    let out = null;
    let threw = null;
    try { out = Charts[name](shapes[label]); } catch (e) { threw = e; }
    ok(!threw && typeof out === "string" && out.indexOf("<svg") === 0,
       name + " draws something for " + label +
       (threw ? " — threw: " + threw.message : ""));
    ok(out === null || out.indexOf("NaN") === -1,
       name + " puts no NaN in the markup for " + label);
    ok(out === null || out.indexOf("undefined") === -1,
       name + " puts no undefined in the markup for " + label);
  });
});

/* ============================================================
   REGRESSIONS FROM THE ADVERSARIAL AUDIT
   ============================================================
   Each of these is a defect that shipped into the first draft,
   survived three sceptical reviewers, and is fixed. They are
   pinned here because every one of them was silent — a wrong
   number that looked like a right one.
   ============================================================ */
describe("Audit regressions");

/* 1. WIP WENT NEGATIVE.
   ------------------------------------------------------------
   An arrival is derived from Marking's tap; a departure is
   Quality Check's raw tap. So a plane QC recorded but Marking
   did not used to emit a -1 with no matching +1, walking the
   count below zero and drawing the chart outside its viewBox.
   In team mode this needs nothing more exotic than Marking's
   phone losing the wifi while the other three keep uploading. */
const orphaned = A.analyse({
  stations: STATIONS,
  itemCount: 3,
  exits: [[null, 20 * S, 30 * S],
          [40 * S, 70 * S, 100 * S],
          [45 * S, 75 * S, 105 * S],
          [50 * S, 80 * S, 110 * S]],
  verdicts: {},
  taktMs: null,
});

ok(orphaned.line.avgWip === null || orphaned.line.avgWip >= 0,
   "average WIP is never negative when a Marking tap is missing");
ok(orphaned.line.wipSeries.every(function (p) { return p.wip >= 0; }),
   "no point in the WIP series counts fewer than zero aeroplanes");
ok(orphaned.line.maxWip >= 0, "peak WIP is never negative");

/* A plane still being worked on must STILL be counted — the fix
   must not throw the baby out by requiring both ends. */
const inFlight = A.analyse({
  stations: STATIONS,
  itemCount: 2,
  exits: [[10 * S, 20 * S], [40 * S], [45 * S], [50 * S]],
  verdicts: {},
  taktMs: null,
});
ok(inFlight.line.maxWip >= 1,
   "a plane still in the line is counted as work in progress");

/* 2. exitGaps DIFFERENCED ACROSS A HOLE.
   ------------------------------------------------------------
   The surviving QC taps were differenced with the holes squeezed
   out, so one missing plane made the line's cycle time count two
   planes as one — inflating the single number the whole activity
   builds towards. */
const holedEnd = A.analyse({
  stations: STATIONS,
  itemCount: 3,
  exits: [[10 * S, 20 * S, 30 * S],
          [40 * S, 70 * S, 100 * S],
          [45 * S, 75 * S, 105 * S],
          [50 * S, null, 110 * S]],
  verdicts: {},
  taktMs: null,
});
ok(holedEnd.line.lineCycleMs === null,
   "a gap spanning a missing plane is not counted as one cycle");

/* 3. theoreticalMin WAS SIZED BY A DIFFERENT SET OF PLANES
      than the runWindow it was compared against, so mid-round it
      claimed a saving that was mostly just the planes not out
      yet. It is now withheld until the round is complete. */
ok(partial.line.theoreticalMinMs === null,
   "no theoretical minimum is offered while the round is running");
ok(isNum(ex.line.theoreticalMinMs),
   "a finished round does report one");
ok(ex.line.roundComplete === true && partial.line.roundComplete === false,
   "the round knows whether it is finished");

/* 4. LITTLE'S LAW WAS CLAIMED AS AN IDENTITY MID-ROUND,
      where the two sides legitimately disagree because in-flight
      planes are counted on one side only. */
ok(ex.line.drained === true, "a round with every plane out is drained");
ok(partial.line.drained === false, "a round with planes still in it is not");

/* Title AND body. The wording has moved between the two once
   already, and a test that reads only the body silently stopped
   checking anything the moment it did. */
function findingText(analysis) {
  return A.findings(analysis)
    .map(function (f) { return f.title + " " + f.body; })
    .join(" ");
}

const midFindings = findingText(partial);
const doneFindings = findingText(ex);

/* TWO TERMS ARE DELIBERATELY NOT SAID TO STUDENTS.
   ------------------------------------------------------------
   Little's Law and process cycle efficiency were cut from the
   findings on the lecturer's instruction — they are not on a
   first-semester syllabus, and a formula at the end of a
   paragraph turns a plain explanation back into homework.

   Both are still COMPUTED, still exported on the analysis, and
   still tested below, because the maths is right and the
   lecturer can read them off. This only governs what appears on
   screen in front of a class.

   Checked across a finished round, a half-finished one and a
   round with rejects, so a term cannot creep back in through a
   branch the other cases never reach. */
[midFindings, doneFindings, findingText(wordingRejects)].forEach(function (text, i) {
  const where = ["a half-finished round", "a finished round", "a round with rejects"][i];
  ok(text.indexOf("Little's Law") === -1,
     "Little's Law is not named to students in " + where);

  /* Looks for the FORMULA, not for the words "the same number".
     That phrase is used innocently by the bottleneck finding —
     "a plane comes out every 31s, almost the same number" — and
     an over-broad guard here failed on it, which would have
     pushed someone to reword a sentence that was doing its job. */
  ok(!/multiplied by|throughput .* lead time|WIP *=/.test(text),
     "and neither is the formula behind it, in " + where);
  ok(text.toLowerCase().indexOf("process cycle efficiency") === -1,
     "process cycle efficiency is not named to students in " + where);
});

/* The findings they replaced must still be there — dropping the
   term must not have dropped the point. */
ok(/planes were stuck/.test(doneFindings),
   "the pile of half-finished planes is still reported");
ok(/work in progress/.test(doneFindings),
   "and still called work in progress, which does stay");
ok(/being worked on/.test(doneFindings),
   "the working-versus-waiting split is still reported");

/* "only" belongs to a bad number.
   ------------------------------------------------------------
   Found on the live site: a well-run round produced "A plane
   spent only 94% of its time being worked on", which is a
   compliment phrased as a complaint — and it turned up precisely
   when a class had done the activity well. */
const efficient = A.analyse({
  stations: STATIONS,
  itemCount: 3,
  // Almost no queuing: each station is free the moment the next
  // aeroplane reaches it.
  exits: [[10 * S, 40 * S, 70 * S],
          [20 * S, 50 * S, 80 * S],
          [25 * S, 55 * S, 85 * S],
          [30 * S, 60 * S, 90 * S]],
  verdicts: {},
  taktMs: null,
});
const efficientText = findingText(efficient);

ok(efficient.line.pce >= 0.7,
   "the tidy round really is mostly work (" +
   A.fmt.pct(efficient.line.pce) + ")");
ok(!/spent only/.test(efficientText),
   "a good efficiency is not described with the word 'only'");

/* A round with a heavy bottleneck, where the queue really does
   dominate. The worked example is 71% and reads as the good case,
   so it cannot be used to prove the other branch. */
const queueHeavy = A.analyse({
  stations: STATIONS,
  itemCount: 4,
  exits: [[5 * S, 10 * S, 15 * S, 20 * S],        // fast
          [45 * S, 85 * S, 125 * S, 165 * S],     // 40s each: the jam
          [50 * S, 90 * S, 130 * S, 170 * S],
          [55 * S, 95 * S, 135 * S, 175 * S]],
  verdicts: {},
  taktMs: null,
});
ok(queueHeavy.line.pce < 0.7,
   "the jammed round really is mostly waiting (" +
   A.fmt.pct(queueHeavy.line.pce) + ")");
ok(/spent only/.test(findingText(queueHeavy)),
   "and a poor efficiency still gets the word 'only'");

/* 5. SOLO TAPS WERE UPLOADED under a round number the server had
      not issued and would later hand to a real team round. */
ok(/if \(state\.header\.solo\) return/.test(stripComments(SRC.store)),
   "flush() refuses to upload a solo round to the shared sheet");
ok(/data\.saved/.test(stripComments(SRC.store)),
   "flush() clears only the events the sheet says it wrote");
ok(/strandOutbox\(\)/.test(stripComments(SRC.store)),
   "unsent taps are set aside before a round change wipes the outbox");

/* 6. CHART GEOMETRY ESCAPED THE VIEWBOX.
      balance() sized its ceiling from the averages alone, so one
      slow plane drew its whisker cap above the plot and the SVG
      clipped it away silently. */
function outsideViewBox(markup) {
  const m = markup.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!m) return "no viewBox";
  const w = Number(m[1]);
  const h = Number(m[2]);
  let bad = null;
  const re = /\b(x|y|cx|cy|x1|y1|x2|y2)="(-?[\d.]+)"/g;
  let hit;
  while ((hit = re.exec(markup)) !== null) {
    const v = Number(hit[2]);
    const vertical = /y/.test(hit[1]);
    const limit = vertical ? h : w;
    // A little slack: labels legitimately sit a few units outside.
    if (v < -30 || v > limit + 30) { bad = hit[1] + "=" + v; break; }
  }
  return bad;
}

const wideSpread = A.analyse({
  stations: STATIONS,
  itemCount: 3,
  exits: [[10 * S, 20 * S, 30 * S],
          [40 * S, 70 * S, 200 * S],     // one very slow plane
          [205 * S, 210 * S, 215 * S],
          [220 * S, 225 * S, 230 * S]],
  verdicts: {},
  taktMs: 40 * S,
});

Object.keys(Charts).forEach(function (name) {
  if (name === "roundCompare") return;
  const out = Charts[name](wideSpread);
  const bad = outsideViewBox(out);
  ok(bad === null, name + " keeps its geometry inside the viewBox" +
     (bad ? " (found " + bad + ")" : ""));
});

/* 7. workVsWait FOLDED DROPPED READINGS INTO "round finished",
      making a missing tap look like an early finish and shrinking
      the amber waiting block it exists to show. */
ok(SRC.charts.indexOf("lc-unrecorded") !== -1,
   "workVsWait draws unaccounted time as its own segment");
ok(SRC.css.indexOf(".lc-unrecorded") !== -1,
   "and line.css gives it a distinct appearance");

/* 8. THE STATION PAGE OVERFLOWED A 667pt iPHONE, so the big
      button panned under a thumb instead of pressing. */
const tapFloor = SRC.css.match(/\.fl-tapbtn \{[\s\S]*?min-height:\s*([\d.]+)dvh/);
ok(!!tapFloor && Number(tapFloor[1]) <= 30,
   "the tap button's minimum height leaves room for the rest of the screen" +
   (tapFloor ? " (" + tapFloor[1] + "dvh)" : ""));

/* 9. PRINTING CLIPPED the three rightmost table columns,
      including Waiting. */
const printBlock = SRC.css.slice(SRC.css.indexOf("@media print"));
ok(/\.fl-table-wrap \{[^}]*overflow:\s*visible/.test(printBlock),
   "printing lets the tables overflow visibly rather than clipping them");
ok(/\.fl-table \{[^}]*min-width:\s*0/.test(printBlock),
   "and drops the on-screen minimum width");


const cmp = A.compare(ex, withRejects);
let cmpOut = null, cmpThrew = null;
try { cmpOut = Charts.roundCompare(cmp); } catch (e) { cmpThrew = e; }
ok(!cmpThrew && cmpOut.indexOf("<svg") === 0, "roundCompare draws something");
ok(cmpOut.indexOf("NaN") === -1, "roundCompare puts no NaN in the markup");


describe("Comparing rounds");

/* Round two is the same line with Folding sped up to 15s, which
   should move the bottleneck rather than merely shrink it — the
   thing the second round exists to demonstrate. */
const faster = A.analyse({
  stations: STATIONS,
  itemCount: 3,
  exits: [[10 * S, 20 * S, 30 * S], [25 * S, 40 * S, 55 * S],
          [30 * S, 45 * S, 60 * S], [35 * S, 50 * S, 65 * S]],
  verdicts: {},
  taktMs: 40 * S,
});
const better = A.compare(ex, faster);
ok(better.leadTime.better === true, "a shorter lead time is reported as better");
ok(better.throughput.better === true, "a higher output rate is reported as better");
ok(better.starve.better === true, "less waiting is reported as better");
ok(better.leadTime.change < 0, "the lead time change is negative");
ok(better.throughput.change > 0, "the throughput change is positive");

/* The direction a number moved and whether that is good are two
   different things, and the dashboard must not conflate them —
   output rising is an improvement, lead time rising is not. */
ok(better.throughput.change > 0 && better.throughput.better === true,
   "output rising counts as better");
ok(better.leadTime.change < 0 && better.leadTime.better === true,
   "lead time falling counts as better");


/* ============================================================
   THE CLOCK
   ============================================================ */
describe("Clock synchronisation");

Clock.reset();
ok(Clock.status().offsetMs === 0, "an unsynchronised device applies no offset");

/* Worked through by hand, because the sign of an offset is the
   easiest thing in this whole file to get backwards.

   Sent at device-time 1000. The server stamped its reply 6100.
   The reply landed at device-time 1200, so the round trip took
   200ms and the reply spent roughly half of that — 100ms — coming
   back. At the instant it landed, the server's clock therefore
   read about 6100 + 100 = 6200, while this device read 1200.

   The device is 5000ms behind, so 5000 must be ADDED to every
   reading it takes. */
Clock.reset();
Clock.addSample(1000, 6100, 1200);          // 200ms round trip
near(Clock.status().offsetMs, 5000, "the offset is measured from the round trip", 1);

/* A slow round trip is a worse estimate — the journey out and the
   journey back are less likely to have taken the same time — so
   it must not displace a better one already held. This sample
   would give 9000 + 1500 - 5000 = 5500, and must be ignored. */
Clock.addSample(2000, 9000, 5000);          // 3000ms round trip
near(Clock.status().offsetMs, 5000,
     "a slow sample does not displace a faster one", 1);

/* A faster round trip does displace it.
   11060 + 20 - 6040 = 5040. */
Clock.addSample(6000, 11060, 6040);         // 40ms round trip
near(Clock.status().offsetMs, 5040,
     "a faster sample replaces the earlier estimate", 1);

Clock.reset();
Clock.addSample(1000, 5000, 500);           // negative round trip
Clock.addSample(1000, 5000, 90000);         // absurdly long
ok(Clock.status().samples === 0, "impossible round trips are discarded");

Clock.reset();
Clock.addSample(1000, 1000000, 1200);
ok(Clock.status().deviceClockSuspect === true,
   "a phone whose clock is wildly out is flagged");
Clock.reset();


/* ============================================================
   THE CONTRACT WITH THE GOOGLE SHEET
   ============================================================
   The Apps Script is the deployed backend; line-sheets.js and
   line-store.js are the clients. A field renamed on one side and
   not the other fails silently — the tap uploads, the sheet
   stores a blank, and nobody finds out until the analysis is
   wrong. Both sides are text on disk, so most of that is
   checkable here without deploying anything.
   ============================================================ */
describe("Client and Apps Script agree");

const token = CONFIG.SHARED_TOKEN;
ok(SRC.gs.indexOf("var SHARED_TOKEN = '" + token + "'") !== -1,
   "the Apps Script token matches SHARED_TOKEN in line-config.js");

["round_start", "round_end", "notes", "events", "visit"].forEach(function (kind) {
  ok(SRC.sheets.indexOf('"' + kind + '"') !== -1,
     "the client sends a " + kind + " message");
  ok(SRC.gs.indexOf("'" + kind + "'") !== -1,
     "the Apps Script handles " + kind);
});

["round", "rounds", "ping"].forEach(function (action) {
  ok(SRC.sheets.indexOf('"' + action + '"') !== -1,
     "the client asks for " + action);
  ok(SRC.gs.indexOf("'" + action + "'") !== -1,
     "the Apps Script answers " + action);
});

/* Every field name the client reads out of a reply must be one
   the Apps Script actually puts there. */
["started_at_ms", "round_no", "item_count", "takt_ms", "status",
 "ended_at_ms", "notes"].forEach(function (field) {
  ok(SRC.gs.indexOf(field) !== -1,
     "the Apps Script returns " + field);
});
["started_at_ms", "round_no", "item_count", "takt_ms", "status"].forEach(function (field) {
  ok(SRC.station.indexOf(field) !== -1 || SRC.board.indexOf(field) !== -1,
     "a client reads " + field + " out of the reply");
});

ok(SRC.gs.indexOf("server_now = Date.now()") !== -1,
   "every Apps Script reply carries the server clock");
ok(SRC.sheets.indexOf("server_now") !== -1,
   "the client reads the server clock out of every reply");

/* The one that would be easy to get wrong: station index 0 and an
   elapsed time of 0 are both falsy, and a naive "value || ''"
   would turn Marking's first tap into a blank cell. */
ok(/ev\.st === null \|\| ev\.st === undefined/.test(SRC.gs),
   "the Apps Script tests station index against null, not falsiness");
ok(/ev\.ms === null \|\| ev\.ms === undefined/.test(SRC.gs),
   "the Apps Script tests elapsed time against null, not falsiness");
ok(/ev\.item === null \|\| ev\.item === undefined/.test(SRC.gs),
   "the Apps Script tests the item index against null, not falsiness");

/* These two look at the actual header value being sent, not
   merely at whether the string appears in the file. Both files
   DISCUSS application/json in their comments, at length, because
   the reason not to use it is the least obvious thing here — an
   assertion that just searched the text would fail on the warning
   against the mistake it is meant to catch. */
ok(/"Content-Type":\s*"text\/plain/.test(SRC.sheets),
   "writes still post as text/plain, so no CORS preflight is triggered");
ok(!/"Content-Type":\s*"application\/json/.test(SRC.sheets),
   "nothing posts as application/json, which would break every save");
ok(SRC.gs.indexOf("LockService") !== -1,
   "the Apps Script locks before appending, so four phones cannot collide");

/* ----------------------------------------------------------
   THE PUBLIC ENDPOINT MUST NOT BE ABLE TO DELETE
   ----------------------------------------------------------
   The Web App URL and the shared token both sit in a file the
   browser downloads, so anyone who views source has them. The
   script therefore appends, reads and marks a round ended — and
   nothing else. An undo is a new row pointing at an old one,
   never a deletion.

   There ARE delete helpers in the file, for housekeeping from
   the Apps Script editor, where running one requires being
   signed in as the owner. This asserts they have not been wired
   into the web-facing surface, which is the one edit that would
   turn a tidy-up convenience into "anybody with the URL can wipe
   a term of class data".
   ---------------------------------------------------------- */
const gsCode = stripComments(SRC.gs);

ok(/function deleteLineCode/.test(gsCode),
   "the Apps Script has editor-only delete helpers");
ok(!/(action === '|action==='|body\.kind === '|body\.kind===')(cleanup|delete|purge)/i.test(gsCode),
   "no delete helper is routed from doGet or doPost");

/* And the routed actions are exactly the ones expected — a new
   case appearing here should be a deliberate decision, not a
   surprise found later. */
const routedActions = (gsCode.match(/action === '([a-z_]+)'/g) || [])
  .map(function (m) { return m.replace(/action === '|'/g, ""); }).sort();
ok(routedActions.join(",") === "ping,round,rounds",
   "doGet routes only ping, round and rounds (found: " +
   (routedActions.join(",") || "none") + ")");

const routedKinds = (gsCode.match(/body\.kind === '([a-z_]+)'/g) || [])
  .map(function (m) { return m.replace(/body\.kind === '|'/g, ""); }).sort();
ok(routedKinds.join(",") === "events,notes,round_end,round_start,visit",
   "doPost routes only the five write kinds (found: " +
   (routedKinds.join(",") || "none") + ")");

/* deleteRow appears only below the housekeeping divider. */
const dividerAt = SRC.gs.indexOf("HOUSEKEEPING — EDITOR ONLY");
ok(dividerAt > 0, "the Apps Script marks off its editor-only section");
ok(SRC.gs.indexOf("deleteRow") > dividerAt,
   "no row deletion appears above that divider, where the web-facing code lives");

/* The event abbreviations the store writes must be the ones the
   Apps Script reads back out again. */
["id", "seq", "k", "st", "item", "ms", "v", "c", "t", "at"].forEach(function (f) {
  ok(new RegExp("ev\\." + f + "\\b").test(SRC.gs),
     "the Apps Script carries the event's '" + f + "' field");
});


/* ============================================================
   THE DOM WIRING
   ============================================================
   The check that would have caught Activity 3's feedbackFlash.
   ============================================================ */
describe("Every id the dashboard looks up exists in activity-5.html");

function idsUsedIn(source) {
  const found = {};
  const patterns = [
    /getElementById\(\s*"([A-Za-z0-9_-]+)"\s*\)/g,
    /\$\(\s*"([A-Za-z0-9_-]+)"\s*\)/g,
  ];
  patterns.forEach(function (re) {
    let m;
    while ((m = re.exec(source)) !== null) found[m[1]] = true;
  });
  return Object.keys(found).sort();
}

function hasId(html, id) {
  return new RegExp('id="' + id + '"').test(html);
}

const boardIds = idsUsedIn(SRC.board);
ok(boardIds.length > 20, "the dashboard looks up " + boardIds.length + " ids");
boardIds.forEach(function (id) {
  ok(hasId(SRC.board_html, id), "activity-5.html contains #" + id);
});

describe("Every id the station page looks up exists in station-a.html");

const stationIds = idsUsedIn(SRC.station);
ok(stationIds.length > 15, "the station page looks up " + stationIds.length + " ids");
stationIds.forEach(function (id) {
  ok(hasId(SRC.station_html, id), "station-a.html contains #" + id);
});

describe("Tabs and panels line up");

/* Every tab button in the HTML must have a panel the dashboard
   knows about, and vice versa. A tab with no panel shows a blank
   screen with no error. */
const tabNames = [];
let tm;
const tabRe = /data-tab="([a-z]+)"/g;
while ((tm = tabRe.exec(SRC.board_html)) !== null) {
  if (tabNames.indexOf(tm[1]) === -1) tabNames.push(tm[1]);
}
ok(tabNames.length === 6, "there are six tabs (" + tabNames.join(", ") + ")");
tabNames.forEach(function (name) {
  const panelId = "panel" + name.charAt(0).toUpperCase() + name.slice(1);
  ok(hasId(SRC.board_html, panelId), "tab '" + name + "' has #" + panelId);
  ok(new RegExp(panelId).test(SRC.board),
     "the dashboard knows about #" + panelId);
});

describe("Scripts load in dependency order");

/* Each file reads the globals below it at load time. Out of
   order, the page throws on load rather than degrading. */
function order(html, files) {
  return files.map(function (f) { return html.indexOf(f); });
}
const boardOrder = order(SRC.board_html, [
  "line-config.js", "line-clock.js", "line-analytics.js",
  "line-sheets.js", "line-store.js", "line-charts.js", "line-board.js",
]);
ok(boardOrder.every(function (v) { return v > 0; }),
   "activity-5.html loads all seven scripts");
ok(boardOrder.every(function (v, i) { return i === 0 || v > boardOrder[i - 1]; }),
   "activity-5.html loads them in dependency order");

const stationOrder = order(SRC.station_html, [
  "FLIGHT_STATION", "line-config.js", "line-clock.js",
  "line-analytics.js", "line-sheets.js", "line-store.js", "line-station.js",
]);
ok(stationOrder.every(function (v) { return v > 0; }),
   "station-a.html sets FLIGHT_STATION and loads six scripts");
ok(stationOrder.every(function (v, i) { return i === 0 || v > stationOrder[i - 1]; }),
   "station-a.html sets FLIGHT_STATION before line-station.js runs");
/* Looks for a real script tag, not a mention. station-a.html
   explains in a comment why it does NOT load the charts, and a
   plain text search would trip over that explanation. */
ok(!/<script[^>]+src="line-charts\.js"/.test(SRC.station_html),
   "a phone does not download the chart code it will never run");


/* ============================================================
   THE SHORT URLS MUST NOT BE REWRITES
   ============================================================
   The station pages load their scripts by RELATIVE path —
   src="line-config.js" — which resolves against whatever URL the
   browser thinks it is on.

   A Vercel *rewrite* serves the file's content at the short URL
   without changing that: at /line/b the browser asks for
   /line/line-config.js, gets a 404, and every script on the page
   is missing. The HTML still arrives, so the tab title reads
   "Station B · Folding" and the page looks like it loaded. It is
   completely dead.

   That shipped, and it passed a check of "HTTP 200 plus the right
   <title>" — which is exactly the wrong thing to have checked.

   A *redirect* sends the browser to the real path first, so the
   relative URLs resolve normally. This asserts the distinction,
   because the two words are one letter apart in a config file
   nobody reads twice.
   ============================================================ */
describe("The short station URLs send the browser to the real path");

const vercel = JSON.parse(read(path.join(APP, "vercel.json")));
const shortPaths = ["/line", "/line/a", "/line/b", "/line/c", "/line/d"];

/* The station pages rely on this being true. If they ever move to
   root-absolute paths, a rewrite becomes safe and this whole
   section can go — so the assertion is anchored to the reason. */
ok(/<script src="line-config\.js">/.test(SRC.station_html),
   "the station pages load their scripts by relative path");

shortPaths.forEach(function (p) {
  const asRedirect = (vercel.redirects || []).some(function (r) { return r.source === p; });
  const asRewrite = (vercel.rewrites || []).some(function (r) { return r.source === p; });

  ok(asRedirect, p + " is a redirect");
  ok(!asRewrite,
     p + " is NOT a rewrite — a rewrite leaves relative script paths 404ing");
});

/* And each one has to point at a file that exists. */
(vercel.redirects || []).forEach(function (r) {
  if (!/^\/line/.test(r.source)) return;
  const target = path.join(APP, r.destination.replace(/^\//, ""));
  ok(fs.existsSync(target),
     r.source + " points at a file that exists (" + r.destination + ")");
});


describe("The four station pages differ only where they should");

const A_HTML = SRC.station_html;
["a", "b", "c", "d"].forEach(function (letter, i) {
  const html = read(path.join(HERE, "station-" + letter + ".html"));
  const m = html.match(/window\.FLIGHT_STATION = (\d+);/);
  ok(!!m && Number(m[1]) === i,
     "station-" + letter + ".html is station " + i);

  /* Normalise the four differences away and the files must be
     byte-identical. This is what stops the four drifting apart
     when one of them is edited and the others are forgotten. */
  const normalise = function (s) {
    return s
      .replace(/window\.FLIGHT_STATION = \d+;/, "STATION")
      .replace(/<title>[^<]*<\/title>/, "TITLE")
      .replace(/STATION [A-D]\b/g, "STATION")
      .replace(/Station [A-D] of the/g, "Station of the")
      .replace(/id="stBadge">[A-D]</, 'id="stBadge">X<')
      .replace(/id="stTitle">[^<]*</, 'id="stTitle">X<')
      .replace(/\d+ = the \w+ station in/, "N = the station in");
  };
  ok(normalise(html) === normalise(A_HTML),
     "station-" + letter + ".html is otherwise identical to station-a.html");
});


/* ============================================================
   SETTINGS THAT WOULD BREAK THE ACTIVITY QUIETLY
   ============================================================ */
describe("The configuration hangs together");

ok(Array.isArray(CONFIG.STATIONS) && CONFIG.STATIONS.length >= 2,
   "there are at least two stations");
ok(CONFIG.STATIONS.every(function (s) { return s.key && s.name && s.colour; }),
   "every station has a key, a name and a colour");

const keys = CONFIG.STATIONS.map(function (s) { return s.key; });
ok(new Set(keys).size === keys.length, "no two stations share a key");

ok(CONFIG.QC_STATION_INDEX === null ||
   (CONFIG.QC_STATION_INDEX >= 0 && CONFIG.QC_STATION_INDEX < CONFIG.STATIONS.length),
   "the quality-check station is one of the stations");

/* Red, amber and green mean rejected, waiting and good. A station
   painted in one of them would make a chart ambiguous at exactly
   the moment it matters.

   The reserved values are read OUT OF line.css rather than
   written here again. A list repeated in two places is a list
   that will one day be updated in one of them, and this test
   would then be checking against a palette the site no longer
   uses while reporting a pass. */
function cssVar(name) {
  const m = SRC.css.match(new RegExp("--" + name + ":\\s*(#[0-9a-fA-F]{3,8})"));
  return m ? m[1].toLowerCase() : null;
}

const RESERVED = ["fl-good", "fl-wait", "fl-reject"].map(cssVar);
ok(RESERVED.every(Boolean),
   "the reserved colours can be read out of line.css (" + RESERVED.join(", ") + ")");
ok(CONFIG.STATIONS.every(function (s) {
     return RESERVED.indexOf(s.colour.toLowerCase()) === -1;
   }),
   "no station uses a colour reserved for reject, waiting or good");

/* Every station colour is also used as TEXT on a white page — the
   big letter on its card, the heading on its phone. A pastel that
   works as a chart fill is unreadable there, so each one has to be
   dark enough to carry type. This is a rough luminance check, not
   a full contrast calculation, but it catches the mistake. */
CONFIG.STATIONS.forEach(function (s) {
  const hex = s.colour.replace("#", "");
  const rr = parseInt(hex.slice(0, 2), 16);
  const gg = parseInt(hex.slice(2, 4), 16);
  const bb = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * rr + 0.587 * gg + 0.114 * bb) / 255;
  ok(luminance < 0.55,
     s.name + "'s colour is dark enough to read as text on white " +
     "(luminance " + luminance.toFixed(2) + ")");
});


describe("The SVG literals have not drifted from the stylesheet");

/* line-charts.js cannot use var(--fl-reject) in a presentation
   attribute — a CSS custom property is not resolved there, the
   attribute is silently dropped, and the shape renders black. So
   four colours are duplicated as literal hex in PAINT. Duplication
   is the price of the SVG spec; this is the check that keeps the
   two copies honest. */
const paintBlock = SRC.charts.match(/const PAINT = \{[\s\S]*?\};/);
ok(!!paintBlock, "line-charts.js defines a PAINT block");

[["reject", "fl-reject"], ["wait", "fl-wait"], ["soft", "fl-ink-soft"],
 ["faint", "fl-ink-faint"]].forEach(function (pair) {
  const m = paintBlock[0].match(new RegExp(pair[0] + ':\\s*"(#[0-9a-fA-F]{3,8})"'));
  const inCss = cssVar(pair[1]);
  ok(!!m && !!inCss && m[1].toLowerCase() === inCss,
     "PAINT." + pair[0] + " matches --" + pair[1] + " in line.css" +
     (m && inCss ? " (" + m[1] + ")" : ""));
});

/* And the mistake itself must not creep back in.
   ------------------------------------------------------------
   Scanned with the comments stripped out. line-charts.js explains
   this trap at length and shows the broken markup as an example,
   so a plain text search would fail on the warning against the
   very mistake it is meant to catch. That has now happened twice
   in this file, which is why the helper exists. */
ok(!/(?:fill|stroke)="var\(/.test(stripComments(SRC.charts)),
   "no CSS variable is used inside an SVG presentation attribute");

ok(CONFIG.ITEM_COUNT > 0, "the run has a positive number of aeroplanes");
ok(CONFIG.TAP_DEBOUNCE_MS >= 200,
   "the debounce is long enough to swallow a bouncing thumb");
ok(CONFIG.MONITOR_POLL_MS >= 3000 && CONFIG.STATION_POLL_MS >= 3000,
   "neither poll is fast enough to burn the daily Apps Script quota");


describe("Chart styles exist");

/* A chart class with no rule in line.css renders as invisible
   black-on-black, which looks like a chart that failed to draw. */
const chartClasses = {};
let cm;
const classRe = /class="(lc-[a-z-]+)[^"]*"/g;
const allCharts = SRC.charts;
while ((cm = classRe.exec(allCharts)) !== null) {
  cm[1].split(/\s+/).forEach(function (c) { chartClasses[c] = true; });
}
Object.keys(chartClasses).sort().forEach(function (c) {
  ok(SRC.css.indexOf("." + c) !== -1, "line.css styles ." + c);
});


/* ============================================================ */
console.log("\n" + "=".repeat(56));
if (failures.length === 0) {
  console.log(passed + " checks passed. The line is sound.");
  process.exit(0);
} else {
  console.log(passed + " passed, " + failures.length + " FAILED:\n");
  failures.forEach(function (f) { console.log("  ✗ " + f); });
  process.exit(1);
}
