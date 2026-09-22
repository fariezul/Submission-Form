/* ============================================================
   class-list.js — ONE CLASS LIST, SHARED BY THE CLASSROOM TOOLS
   ============================================================
   Activity 1 (the name wheel) and Activity 2 (the group maker)
   use the same class. The lecturer pastes it once, on either
   page, and the other page has it too.

   WHERE IT LIVES
   In this browser's localStorage, under one key. It never leaves
   the computer: there is no server, and the website's own files
   hold no student names at all. A different laptop starts with
   the sample names until the class is pasted there.

   THE STAMP
   Every save gets a new "stamp" (the time it was saved). A page
   remembers the stamp of the list it last used; if the stamp has
   changed, the class has been replaced — pasted on the other
   page, or in another tab — and the page starts afresh with it.
   The wheel, for one, clears its "already picked" history then,
   because it belongs to the previous class.

   What does NOT change the shared list: the wheel taking a
   picked name off the wheel. That student is still in the class,
   so the group maker still has them.
   ============================================================ */

"use strict";

(function (root) {

  const KEY = "pc.classList";

  /* Shown until a real class is pasted. Made-up first names —
     no real student is ever named in the site's files. */
  const SAMPLE = [
    "Aisyah", "Haziq", "Nurul Izzah", "Amirul", "Farhana", "Danial",
    "Syafiqah", "Irfan", "Balqis", "Hakimi", "Aqilah", "Zulkarnain",
    "Mei Ling", "Arvind", "Hafizah", "Luqman", "Qistina", "Adam",
    "Sofea", "Iman", "Harith", "Alya", "Rizwan", "Nadia",
  ];

  const MAX = 120;

  function storage() {
    try { return root.localStorage; } catch (e) { return null; }
  }

  /* Before this file existed the wheel kept its own list. If a
     lecturer already pasted their class into the wheel, that list
     becomes the shared one: the names still on the wheel plus the
     ones already taken off it, so nobody goes missing. */
  function fromOldWheel(ls) {
    try {
      const w = JSON.parse(ls.getItem("wheel1.state") || "null");
      if (!w || !Array.isArray(w.names)) return null;
      const removed = (Array.isArray(w.picked) ? w.picked : [])
        .filter(function (p) { return p && p.removed && typeof p.name === "string"; })
        .map(function (p) { return p.name; });
      const names = w.names.map(String).concat(removed);
      return names.length ? names : null;
    } catch (e) { return null; }
  }

  /* The current class: { names: [...], stamp: number }. */
  function load() {
    const ls = storage();
    if (ls) {
      try {
        const s = JSON.parse(ls.getItem(KEY) || "null");
        if (s && Array.isArray(s.names) && typeof s.stamp === "number") {
          return { names: s.names.map(String).slice(0, MAX), stamp: s.stamp };
        }
      } catch (e) { /* fall through to a fresh list */ }
      const old = fromOldWheel(ls);
      if (old) return save(old);
    }
    return { names: SAMPLE.slice(), stamp: 0 };
  }

  /* Replace the class. Returns the new { names, stamp }. */
  function save(names) {
    const list = { names: names.map(String).slice(0, MAX), stamp: Date.now() };
    const ls = storage();
    if (ls) {
      try { ls.setItem(KEY, JSON.stringify(list)); } catch (e) { /* this page still works */ }
    }
    return list;
  }

  function isSample(names) {
    return names.length > 0 && names.every(function (n) { return SAMPLE.indexOf(n) !== -1; });
  }

  /* Call back when another tab replaces the class. (A page never
     hears about its own saves this way — browsers only send the
     "storage" event to OTHER tabs.) */
  function onChange(callback) {
    root.addEventListener("storage", function (e) {
      if (e.key === KEY) callback(load());
    });
  }

  root.ClassList = {
    load: load,
    save: save,
    isSample: isSample,
    onChange: onChange,
    SAMPLE: SAMPLE,
    MAX: MAX,
    KEY: KEY,
  };

})(typeof window !== "undefined" ? window : globalThis);
