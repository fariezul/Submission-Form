/* ============================================================
   wheel-tests.js — CHECKS ON THE WHEEL OF NAMES
   ============================================================
   Run from the project folder:

       node production-coordination/wheel1/wheel-tests.js

   No test framework and nothing to install.

   WHAT IS WORTH TESTING HERE
   1. FAIRNESS. Every name must have the same chance. A picker
      that quietly favoured the first few names would be unfair
      in a way nobody in the room could see.
   2. THE WHEEL AGREES WITH THE PICK. The winner is chosen first
      and the wheel is then sent to it. If the stopping angle
      were ever a segment off, the pointer would sit on one name
      while the pop-up announced another — in front of the whole
      class. So this is checked for every class size from 1 to
      120, many times each.
   3. THE PAGE WIRING. Every id wheel-app.js looks up must exist
      in activity-1.html, and the scripts must load in order.
   ============================================================ */

"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const HERE = __dirname;
global.window = global;

require(path.join(HERE, "wheel-config.js"));
require(path.join(HERE, "wheel-math.js"));

const CFG = global.WHEEL_CONFIG;
const M = global.WheelMath;

let passed = 0;
let failed = 0;

function check(name, ok, detail) {
  if (ok) { passed++; }
  else { failed++; console.log("  FAIL  " + name + (detail ? "  —  " + detail : "")); }
}

function rnd32() { return crypto.randomBytes(4).readUInt32LE(0); }


/* ---------- segmentAt ---------- */
console.log("segmentAt");
check("rotation 0 → segment 0", M.segmentAt(0, 8) === 0);
// Turning the wheel clockwise by a little brings the LAST segment
// under the pointer.
check("rotation +1° → last segment", M.segmentAt(1, 8) === 7);
check("rotation -1° → segment 0", M.segmentAt(-1, 8) === 0);
check("rotation -46° → segment 1 (8 names)", M.segmentAt(-46, 8) === 1);
check("huge rotation still in range", M.segmentAt(3600 * 50 + 0.0000001, 7) >= 0);
check("no names → -1", M.segmentAt(0, 0) === -1);
check("one name → always 0", [0, 90, 359.9, 12345].every((r) => M.segmentAt(r, 1) === 0));


/* ---------- targetRotation lands on the pick ---------- */
console.log("targetRotation");
let landMiss = 0, edgeMiss = 0, backwards = 0, short = 0;
for (let n = 1; n <= 120; n++) {
  let current = rnd32() / 1000;
  for (let k = 0; k < 400; k++) {
    const index = M.pickIndex(n, rnd32);
    const turns = 6 + (k % 3);
    const landing = k === 0 ? 0 : k === 1 ? 1 : rnd32() / 4294967296;
    const to = M.targetRotation(current, index, n, turns, landing);
    if (M.segmentAt(to, n) !== index) landMiss++;
    if (to <= current) backwards++;
    if (to - current < turns * 360) short++;
    // The pointer must be clear of the dividing lines: at least 10%
    // of a segment in from each edge.
    const size = 360 / n;
    const into = M.mod(-to, 360) / size - index;
    if (n > 1 && (into < 0.1 || into > 0.9)) edgeMiss++;
    current = to;
  }
}
check("stops on the picked name, every size 1-120", landMiss === 0, landMiss + " misses");
check("never turns backwards", backwards === 0, backwards + " times");
check("always makes the full number of turns", short === 0, short + " times");
check("never stops on a dividing line", edgeMiss === 0, edgeMiss + " times");


/* ---------- pickIndex is fair ---------- */
console.log("pickIndex");
function chiSquare(n, draws, source) {
  const counts = new Array(n).fill(0);
  for (let i = 0; i < draws; i++) counts[M.pickIndex(n, source)]++;
  const expected = draws / n;
  return counts.reduce((s, c) => s + (c - expected) * (c - expected) / expected, 0);
}
// Critical values at p = 0.001, so a fair picker fails this about
// once in a thousand runs.
check("7 names, 140 000 spins: even spread", chiSquare(7, 140000, rnd32) < 22.46);
check("30 names, 300 000 spins: even spread", chiSquare(30, 300000, rnd32) < 58.30);
check("always within range", (() => {
  for (let i = 0; i < 20000; i++) {
    const n = 1 + (i % 50);
    const v = M.pickIndex(n, rnd32);
    if (v < 0 || v >= n || v !== Math.floor(v)) return false;
  }
  return true;
})());
// A source stuck in the unfair tail must be redrawn, not used.
(() => {
  const seq = [4294967295, 4294967294, 10];
  let i = 0;
  const v = M.pickIndex(7, () => seq[i++]);
  check("draws from the unfair top of the range are redrawn", v === 3 && i === 3, "got " + v + " after " + i + " draws");
})();
check("a broken source throws instead of hanging", (() => {
  try { M.pickIndex(7, () => 4294967295); return false; } catch (e) { return true; }
})());


/* ---------- shuffle ---------- */
console.log("shuffle");
(() => {
  const list = ["a", "b", "c", "d", "e"];
  const out = M.shuffle(list, rnd32);
  check("keeps every name", out.slice().sort().join() === list.join());
  check("does not change the original", list.join() === "a,b,c,d,e");
  // Position of "a" after shuffling should be even.
  const counts = [0, 0, 0, 0, 0];
  for (let i = 0; i < 50000; i++) counts[M.shuffle(list, rnd32).indexOf("a")]++;
  const chi = counts.reduce((s, c) => s + (c - 10000) * (c - 10000) / 10000, 0);
  check("every position equally likely", chi < 18.47, "chi² " + chi.toFixed(1));
})();


/* ---------- colours ---------- */
console.log("colourIndex");
(() => {
  const P = CFG.PALETTE.length;
  let clash = 0;
  for (let n = 2; n <= 120; n++) {
    for (let i = 0; i < n; i++) {
      const a = M.colourIndex(i, n, P);
      const b = M.colourIndex((i + 1) % n, n, P);
      if (a === b) clash++;
    }
  }
  check("no two neighbours share a colour, sizes 2-120", clash === 0, clash + " clashes");
})();
check("palette alternates dark and white text", CFG.PALETTE.every((p, i) =>
  (i % 2 === 0) === (p.ink.toLowerCase() === "#ffffff")));


/* ---------- parseNames ---------- */
console.log("parseNames");
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
check("one per line", same(M.parseNames("Ali\nAbu\nSiti"), ["Ali", "Abu", "Siti"]));
check("Windows line endings", same(M.parseNames("Ali\r\nAbu\r\n"), ["Ali", "Abu"]));
check("blank lines and spaces", same(M.parseNames("\n  Ali  \n\n   \nNurul   Izzah \n"), ["Ali", "Nurul Izzah"]));
check("a single comma line is a list", same(M.parseNames("Ali, Abu,Siti ,"), ["Ali", "Abu", "Siti"]));
check("commas kept inside a multi-line list", same(M.parseNames("Tan, Mei Ling\nAbu"), ["Tan, Mei Ling", "Abu"]));
check("duplicates both stay", same(M.parseNames("Aisyah\nAisyah"), ["Aisyah", "Aisyah"]));
check("empty box", same(M.parseNames(""), []) && same(M.parseNames(null), []));
check("full names kept whole", same(M.parseNames("MUHAMMAD AIMAN HAKIMI BIN ABDULLAH\nNUR AINA SOFEA BINTI RAZAK"),
  ["MUHAMMAD AIMAN HAKIMI BIN ABDULLAH", "NUR AINA SOFEA BINTI RAZAK"]));
check("Excel rows: number, name, IC → the name",
  same(M.parseNames("BIL\tNAMA\tNO. KP\n1\tAHMAD BIN ALI\t050101-04-1234\n2\tSITI AISYAH BINTI OMAR\t050202-04-5678\n"),
    ["AHMAD BIN ALI", "SITI AISYAH BINTI OMAR"]));
check("Excel rows with a matric column after the name",
  same(M.parseNames("1\tMT2301-001\tLIM MEI LING\n2\tMT2301-002\tARVIND A/L KUMAR"), ["LIM MEI LING", "ARVIND A/L KUMAR"]));
check("numbered lines from a PDF", same(M.parseNames("1. Ahmad bin Ali\n2) Siti binti Omar\n10 Adam"), ["Ahmad bin Ali", "Siti binti Omar", "Adam"]));
check("IC number after the name, space-separated", same(M.parseNames("AHMAD BIN ALI 050101-04-1234"), ["AHMAD BIN ALI"]));
check("header row skipped", same(M.parseNames("Nama Pelajar\nAhmad\nNAMA:\nSiti"), ["Ahmad", "Siti"]));
check("lines of only numbers dropped", same(M.parseNames("1\n2\nAhmad\n050101-04-1234"), ["Ahmad"]));


/* ---------- displayName and splitTwoLines ---------- */
console.log("displayName");
check("CAPITALS become Title Case, bin/binti small",
  M.displayName("MUHAMMAD AIMAN HAKIMI BIN ABDULLAH") === "Muhammad Aiman Hakimi bin Abdullah");
check("a/l and hyphenated names", M.displayName("ARVIND A/L KUMAR-RAJ") === "Arvind a/l Kumar-Raj");
check("apostrophe stays lower after it", M.displayName("NUR'AIN BINTI ALI") === "Nur'ain binti Ali");
check("mixed case left exactly as typed", M.displayName("Mohd McDonald bin Ali") === "Mohd McDonald bin Ali");
check("split at the most even space",
  same(M.splitTwoLines("Muhammad Aiman Hakimi bin Abdullah"), ["Muhammad Aiman Hakimi", "bin Abdullah"]));
check("one word is not split", same(M.splitTwoLines("Aisyah"), ["Aisyah"]));


/* ---------- config ---------- */
console.log("config");
check("no class list is built into the config", !("CLASS_NAMES" in CFG));
check("spin lengths make sense", CFG.SPIN_MS_MIN > 1000 && CFG.SPIN_MS_MAX >= CFG.SPIN_MS_MIN);


/* ---------- the page wiring ---------- */
console.log("page wiring");
const html = fs.readFileSync(path.join(HERE, "..", "activity-1.html"), "utf8");
const app = fs.readFileSync(path.join(HERE, "wheel-app.js"), "utf8");

const wanted = [...app.matchAll(/\$\("([A-Za-z0-9_-]+)"\)/g)].map((m) => m[1]);
const missing = wanted.filter((id) => !new RegExp('id="' + id + '"').test(html));
check("every id the app uses is on the page (" + wanted.length + ")", missing.length === 0, missing.join(", "));

const order = ["wheel1/wheel-config.js", "wheel1/wheel-math.js", "shared/class-list.js", "wheel1/wheel-audio.js", "wheel1/wheel-confetti.js", "wheel1/wheel-app.js"];
const at = order.map((f) => html.indexOf('src="' + f + '"'));
check("all six scripts are loaded", at.every((i) => i !== -1), at.join(","));
check("scripts load in dependency order", at.every((v, i) => i === 0 || v > at[i - 1]));
check("stylesheet is linked", html.includes('href="wheel1/wheel.css"'));
check("placeholder noindex is gone", !/name="robots"[^>]*noindex/.test(html));


console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
