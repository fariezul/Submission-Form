/* ============================================================
   groups-tests.js — CHECKS ON THE GROUP MAKER
   ============================================================
   Run from the project folder:

       node production-coordination/groups2/groups-tests.js

   WHAT IS WORTH TESTING HERE
   1. NOBODY IS LOST OR DOUBLED. Every student lands in exactly
      one group, for every class size and setting.
   2. THE SPLIT IS EVEN. Groups never differ by more than one
      person, and the plan line says what actually happens.
   3. IT IS FAIR. Over many splits, any two students end up
      together as often as any other two.
   4. MOVING A STUDENT keeps everyone, and leaders stay sane.
   5. THE SHARED CLASS LIST survives the page reloading, and the
      wheel's old list is carried over.
   6. THE PAGE WIRING: every id the script uses is on the page,
      and the scripts load in order.
   ============================================================ */

"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const HERE = __dirname;
const PC = path.join(HERE, "..");
global.window = global;

/* A stand-in for the browser's localStorage. */
function fakeStorage(initial) {
  const data = Object.assign({}, initial || {});
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
    _data: data,
  };
}
global.localStorage = fakeStorage();
global.addEventListener = () => {};

require(path.join(PC, "wheel1", "wheel-math.js"));
require(path.join(PC, "shared", "class-list.js"));
require(path.join(HERE, "groups-math.js"));

const W = global.WheelMath;
const G = global.GroupsMath;
const CL = global.ClassList;

let passed = 0, failed = 0;
function check(name, ok, detail) {
  if (ok) passed++;
  else { failed++; console.log("  FAIL  " + name + (detail ? "  —  " + detail : "")); }
}
const rnd32 = () => crypto.randomBytes(4).readUInt32LE(0);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const names = (n) => Array.from({ length: n }, (_, i) => "Student " + (i + 1));


/* ---------- group count and sizes ---------- */
console.log("groupCount / sizes");
check("30 students, 6 groups → 6", G.groupCount(30, "groups", 6) === 6);
check("31 students, groups of 5 → 6 groups (extra spread)", G.groupCount(31, "size", 5) === 6);
check("34 students, groups of 5 → 6 groups", G.groupCount(34, "size", 5) === 6);
check("4 students, groups of 5 → 1 group", G.groupCount(4, "size", 5) === 1);
check("never more groups than students", G.groupCount(3, "groups", 10) === 3);
check("never fewer than one group", G.groupCount(0, "groups", 6) === 1 && G.groupCount(0, "size", 5) === 1);
check("a size of 0 is treated as 1 per group", G.groupCount(10, "size", 0) === 10);
check("31 into 6 → one 6 and five 5s", same(G.sizes(31, 6), [6, 5, 5, 5, 5, 5]));
check("30 into 6 → six 5s", same(G.sizes(30, 6), [5, 5, 5, 5, 5, 5]));

let uneven = 0;
for (let n = 1; n <= 120; n++) {
  for (let g = 1; g <= Math.min(n, 24); g++) {
    const s = G.sizes(n, g);
    if (s.reduce((a, b) => a + b, 0) !== n || Math.max(...s) - Math.min(...s) > 1) uneven++;
  }
}
check("every split adds up and differs by at most one (1-120 students)", uneven === 0, uneven + " bad");


/* ---------- describe ---------- */
console.log("describe");
check("even", G.describe(30, 6) === "30 students → 6 groups of 5", G.describe(30, 6));
check("uneven", G.describe(31, 6) === "31 students → 5 groups of 5 and 1 group of 6", G.describe(31, 6));
check("one group", G.describe(4, 1) === "4 students → 1 group of 4", G.describe(4, 1));
check("nobody", G.describe(0, 1) === "No students yet");


/* ---------- makeGroups: nobody lost or doubled ---------- */
console.log("makeGroups");
let lost = 0, badSize = 0, badLeader = 0;
for (let n = 1; n <= 60; n++) {
  const list = names(n);
  for (let g = 1; g <= Math.min(n, 12); g++) {
    const r = G.makeGroups(list, g, true, rnd32);
    const all = r.flatMap((x) => x.members).sort();
    if (!same(all, list.slice().sort())) lost++;
    const s = r.map((x) => x.members.length);
    if (r.length !== g || Math.max(...s) - Math.min(...s) > 1) badSize++;
    if (r.some((x) => x.leader < 0 || x.leader >= x.members.length)) badLeader++;
  }
}
check("every student in exactly one group", lost === 0, lost + " bad splits");
check("right number of groups, sizes within one", badSize === 0, badSize + " bad");
check("every group has a valid leader", badLeader === 0, badLeader + " bad");
check("no leaders when switched off", G.makeGroups(names(10), 3, false, rnd32).every((x) => x.leader === -1));
check("duplicate names both placed", G.makeGroups(["Aisyah", "Aisyah", "Adam"], 2, false, rnd32)
  .flatMap((x) => x.members).filter((m) => m === "Aisyah").length === 2);

/* Fairness: how often do students 1 and 2 share a group, versus
   students 1 and 3? With 12 students in 3 groups of 4 the chance
   for any pair is 3/11. */
(() => {
  const list = names(12);
  const RUNS = 30000;
  let a = 0, b = 0;
  for (let i = 0; i < RUNS; i++) {
    const r = G.makeGroups(list, 3, false, rnd32);
    const grp = (name) => r.findIndex((x) => x.members.includes(name));
    if (grp("Student 1") === grp("Student 2")) a++;
    if (grp("Student 1") === grp("Student 3")) b++;
  }
  const expect = RUNS * 3 / 11;
  const off = Math.max(Math.abs(a - expect), Math.abs(b - expect)) / expect;
  check("any two students share a group equally often (within 4%)", off < 0.04, "a " + a + ", b " + b + ", expected " + expect.toFixed(0));
})();
/* Which group gets the extra student is random too. */
(() => {
  const counts = [0, 0, 0];
  for (let i = 0; i < 9000; i++) {
    const r = G.makeGroups(names(7), 3, false, rnd32);
    counts[r.findIndex((x) => x.members.length === 3)]++;
  }
  check("the bigger group is not always the first", counts.every((c) => c > 2500), counts.join(","));
})();


/* ---------- dealOrder ---------- */
console.log("dealOrder");
(() => {
  const r = [{ members: ["a", "b"] }, { members: ["c", "d", "e"] }];
  check("round-robin, one per group at a time", same(G.dealOrder(r), [[0, 0], [1, 0], [0, 1], [1, 1], [1, 2]]));
})();


/* ---------- move ---------- */
console.log("move");
(() => {
  const r = [{ members: ["a", "b", "c"], leader: 1 }, { members: ["d", "e"], leader: 0 }];
  const m1 = G.move(r, 0, 2, 1, true, rnd32);
  check("student moves", same(m1[0].members, ["a", "b"]) && same(m1[1].members, ["d", "e", "c"]));
  check("original untouched", same(r[0].members, ["a", "b", "c"]));
  check("leaders unchanged when a non-leader moves", m1[0].leader === 1 && m1[1].leader === 0);

  const m2 = G.move(r, 0, 0, 1, true, rnd32);
  check("a member above the leader moves: leader index follows", m2[0].members[m2[0].leader] === "b");

  const m3 = G.move(r, 0, 1, 1, true, rnd32);
  check("a moved leader is no longer leader of the new group", m3[1].members[m3[1].leader] === "d");
  check("the old group gets a new leader", m3[0].leader >= 0 && m3[0].leader < m3[0].members.length);

  const m4 = G.move([{ members: ["a"], leader: 0 }, { members: [], leader: -1 }], 0, 0, 1, true, rnd32);
  check("moving into an empty group makes them its leader", m4[1].leader === 0 && m4[0].leader === -1);
  check("moving to the same group changes nothing", same(G.move(r, 0, 0, 0, true, rnd32), r));
})();


/* ---------- names and text ---------- */
console.log("names / asText");
check("default names are colours", G.defaultName(0) === "Team Pink" && G.defaultName(1) === "Team Yellow");
check("after twelve they are numbered", G.defaultName(12) === "Team Pink 2");
check("all default names differ (24 groups)", new Set(Array.from({ length: 24 }, (_, i) => G.defaultName(i))).size === 24);
check("text for WhatsApp", G.asText([{ members: ["AHMAD BIN ALI", "Siti"], leader: 0 }], ["Kumpulan A"], W.displayName) ===
  "Kumpulan A (2)\n1. Ahmad bin Ali ★ Leader\n2. Siti");


/* ---------- the shared class list ---------- */
console.log("class-list");
(() => {
  global.localStorage = fakeStorage();
  const first = CL.load();
  check("no list yet → the sample, stamp 0", CL.isSample(first.names) && first.stamp === 0);
  const saved = CL.save(["Ali", "Abu"]);
  check("save gives a stamp", saved.stamp > 0);
  check("load gives it back", same(CL.load(), saved));
  check("real names are not the sample", !CL.isSample(saved.names));

  global.localStorage = fakeStorage({ "wheel1.state": JSON.stringify({
    version: 1, names: ["Ali", "Abu"], picked: [{ name: "Siti", removed: true }, { name: "Ali", removed: false }] }) });
  const carried = CL.load();
  check("the wheel's old list is carried over, taken-off names included", same(carried.names, ["Ali", "Abu", "Siti"]) && carried.stamp > 0);
  check("…and saved as the shared list", JSON.parse(global.localStorage.getItem(CL.KEY)).names.length === 3);

  global.localStorage = fakeStorage({ [CL.KEY]: "not json" });
  check("a broken saved list falls back to the sample", CL.isSample(CL.load().names));
})();


/* ---------- the page wiring ---------- */
console.log("page wiring");
const html = fs.readFileSync(path.join(PC, "activity-2.html"), "utf8");
const app = fs.readFileSync(path.join(HERE, "groups-app.js"), "utf8");
const wanted = [...app.matchAll(/\$\("([A-Za-z0-9_-]+)"\)/g)].map((m) => m[1]);
const missing = wanted.filter((id) => !new RegExp('id="' + id + '"').test(html));
check("every id the app uses is on the page (" + wanted.length + ")", missing.length === 0, missing.join(", "));
const order = ["wheel1/wheel-math.js", "shared/class-list.js", "wheel1/wheel-audio.js",
  "wheel1/wheel-confetti.js", "groups2/groups-math.js", "groups2/groups-app.js"];
const at = order.map((f) => html.indexOf('src="' + f + '"'));
check("all six scripts are loaded", at.every((i) => i !== -1), at.join(","));
check("scripts load in dependency order", at.every((v, i) => i === 0 || v > at[i - 1]));
check("stylesheet is linked", html.includes('href="groups2/groups.css"'));
check("placeholder noindex is gone", !/name="robots"[^>]*noindex/.test(html));
const audio = fs.readFileSync(path.join(PC, "wheel1", "wheel-audio.js"), "utf8");
check("the sounds it plays exist", ["deal:", "sparkle:", "fanfare:"].every((s) => audio.includes(s)));

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
