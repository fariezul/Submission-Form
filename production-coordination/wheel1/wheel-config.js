/* ============================================================
   wheel-config.js — THE SETTINGS FOR "WHO'S NEXT?"
   ============================================================
   Activity 1 is a wheel of names. This file holds everything a
   lecturer might want to change, and nothing else.

   THE CLASS LIST IS NOT HERE
   The class is pasted into the page on the classroom laptop and
   kept in that browser, shared with the group maker (Activity 2)
   — see ../shared/class-list.js. No student's name is ever
   stored in the website's files.
   ============================================================ */

"use strict";

(function (root) {

  root.WHEEL_CONFIG = {

    /* The shape of what the wheel saves in the browser. Add 1
       only if that shape changes; every laptop then starts the
       wheel afresh (the shared class list is kept). */
    LIST_VERSION: 1,

    /* Beyond this many names the text on the wheel gets too small
       to read from the back of a room. The wheel still takes more,
       up to MAX_NAMES, but shows a warning. */
    COMFORT_NAMES: 60,
    MAX_NAMES: 120,

    /* THE SPIN
       A spin lasts somewhere between these two, chosen at random
       each time so the class cannot learn the rhythm. The wheel
       always turns at least MIN_TURNS full circles. */
    SPIN_MS_MIN: 6000,
    SPIN_MS_MAX: 7200,
    MIN_TURNS: 6,
    EXTRA_TURNS: 2,         // plus up to this many more, at random

    /* Anyone who has asked their device to reduce motion gets a
       short spin and no confetti. */
    REDUCED_SPIN_MS: 1800,

    /* The eight segment colours, in the order they go round the
       wheel, each with the text colour that reads on it. They
       alternate dark text and white text on purpose: two
       neighbours never look alike even on a washed-out projector.
       The colours carry no meaning — nobody's segment is "good"
       or "bad". */
    PALETTE: [
      { fill: "#f0286e", ink: "#ffffff" },  // pink
      { fill: "#ffc61a", ink: "#1a2233" },  // yellow
      { fill: "#1e7bf0", ink: "#ffffff" },  // blue
      { fill: "#ff7a1a", ink: "#1a2233" },  // orange
      { fill: "#8a4dff", ink: "#ffffff" },  // violet
      { fill: "#8ad62a", ink: "#1a2233" },  // lime
      { fill: "#d62acf", ink: "#ffffff" },  // magenta
      { fill: "#14c4b8", ink: "#1a2233" },  // teal
    ],

    /* Where this page keeps its state on the computer it runs on.
       Nothing leaves the computer — there is no server. */
    STORAGE_KEY: "wheel1.state",
  };

})(typeof window !== "undefined" ? window : globalThis);
