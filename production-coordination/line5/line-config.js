/* ============================================================
   line-config.js — HOW ACTIVITY 5 IS SET UP
   ============================================================
   Flight Line is a live production-line simulation. Four students
   fold paper aeroplanes at four stations; a fifth screen (yours)
   watches the numbers arrive and turns them into lean analytics.

   Everything you would normally want to change lives in this one
   file. You should not have to open any other file to run the
   activity with a different class, a different item count, or
   different station names.

   ------------------------------------------------------------
   DO I HAVE TO CONNECT A GOOGLE SHEET?
   ------------------------------------------------------------
   No. Leave SCRIPT_URL as the placeholder and the activity still
   works completely — in SOLO MODE, where one device (yours) holds
   all four station buttons and nothing is sent anywhere.

   Fill SCRIPT_URL in and you unlock TEAM MODE: each student runs
   their own station on their own phone, and your laptop shows the
   line filling up as they tap.

   Setup instructions are at the top of
   google-apps-script/activity-5-Code.gs, and in ACTIVITY5-README.md.
   ============================================================ */

"use strict";

window.LINE_CONFIG = {

  /* ----------------------------------------------------------
     THE GOOGLE SHEET
     ----------------------------------------------------------
     Paste the deployed Web App URL here. It looks like:
       https://script.google.com/macros/s/AKfycb..../exec

     Remember: editing activity-5-Code.gs changes nothing until
     you redeploy it as a NEW VERSION —
     Deploy -> Manage deployments -> pencil -> Version: New version.
     This catches everybody once.
     ---------------------------------------------------------- */
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbyT-ej-TmlUEyU6UJNcrpJu_kTNRs78PfpzXLZo3ut0jJ_fsGAgunbszKGLfRJ3J2mVkg/exec",

  /* Must match SHARED_TOKEN in activity-5-Code.gs. It sits in a
     file the browser downloads, so it is a speed bump against
     drive-by junk, not a secret. */
  SHARED_TOKEN: "flightline-2026-iqa10063",

  /* Recorded when the page is opened, for the visit count. */
  PAGE: "activity-5",


  /* ----------------------------------------------------------
     THE LINE ITSELF
     ----------------------------------------------------------
     Four stations, in the order the paper travels. You may add a
     fifth or drop to three — the buttons, the charts and the
     reject causes all follow this list. Three to six works well;
     beyond that the phone buttons get small.

     "key" is what gets written to the sheet, so once a class has
     run, do not renumber existing keys.

     "colour" is the station's colour everywhere on screen. These
     are chosen to be strong enough to read as TEXT on a white
     page as well as to fill a chart bar — a pastel that looks
     pleasant as a bar is unreadable as a heading.

     Red, amber and green are reserved for bottleneck / waiting /
     good and must never be mistaken for a station, which is why
     these run blue → indigo → purple → pink. The tests fail if a
     station takes a reserved colour.
     ---------------------------------------------------------- */
  STATIONS: [
    { key: "A", name: "Marking",       verb: "Marked",   colour: "#0284c7" },
    { key: "B", name: "Folding",       verb: "Folded",   colour: "#4f46e5" },
    { key: "C", name: "Labelling",     verb: "Labelled", colour: "#9333ea" },
    { key: "D", name: "Quality Check", verb: "Checked",  colour: "#db2777" },
  ],

  /* How many aeroplanes the line must build in one round. */
  ITEM_COUNT: 20,

  /* The last station is the one that judges pass or reject. It is
     the last in the STATIONS list, which is why Quality Check sits
     at the end. Set to null to turn reject recording off entirely. */
  QC_STATION_INDEX: 3,


  /* ----------------------------------------------------------
     THE CUSTOMER
     ----------------------------------------------------------
     Takt time is the drumbeat: how often the customer needs one
     finished aeroplane. It is the single most useful line on the
     whole dashboard, because every station's bar is measured
     against it.

         takt = available time / units the customer wants

     DEMAND_MINUTES is how long the class has to fill the order.
     With 20 items in 30 minutes, takt is 90 seconds — the line
     must deliver a finished plane every 90 seconds to keep up.

     Set DEMAND_MINUTES to null and the dashboard hides the takt
     line rather than inventing a target.
     ---------------------------------------------------------- */
  DEMAND_MINUTES: 30,


  /* ----------------------------------------------------------
     HOW OFTEN THE SCREENS TALK TO THE SHEET
     ----------------------------------------------------------
     In milliseconds. These are a real trade-off, not a
     preference: a Google account gets a limited amount of Apps
     Script running time per day, and every poll spends a little.

     At these settings a 30-minute round costs roughly 500
     requests, which is comfortable. Halving them doubles the
     cost. There is no benefit in polling the monitor faster than
     a station can fold a plane.

     A station tap is NEVER delayed by the network — it is stamped
     and stored the instant it happens, then uploaded in the
     background. Polling only affects how fresh the MONITOR looks.
     ---------------------------------------------------------- */
  MONITOR_POLL_MS: 10000,   // your dashboard: every 10 seconds
  STATION_POLL_MS: 20000,   // a student's phone: every 20 seconds
  OUTBOX_RETRY_MS: 4000,    // how soon to retry a tap that failed to send


  /* ----------------------------------------------------------
     CLOCK SYNCHRONISATION
     ----------------------------------------------------------
     Four phones do not agree on what time it is. They are usually
     within a second or two of each other, but "usually" is not
     good enough when a station takes 40 seconds — a 3-second
     disagreement is a 7% error, and a bad enough one can make a
     plane appear to leave Folding before it arrived.

     So every device measures its own offset against the Apps
     Script's clock, the same way an internet time client does,
     and applies it. CLOCK_SAMPLES is how many measurements to
     keep; the one with the fastest round trip wins, because that
     is the one least distorted by the network.
     ---------------------------------------------------------- */
  CLOCK_SAMPLES: 5,

  /* If the measured offset is larger than this many milliseconds,
     say so on screen. A phone more than half a minute out usually
     has its clock set by hand and should be fixed in Settings. */
  CLOCK_WARN_MS: 30000,


  /* ----------------------------------------------------------
     SAFETY RAILS ON THE TAP BUTTON
     ----------------------------------------------------------
     A student's thumb bounces. Two taps 300ms apart are one tap.
     Nobody folds a paper aeroplane in under two seconds, so
     anything faster than MIN_CYCLE_MS asks "are you sure?"
     rather than silently recording a nonsense time.
     ---------------------------------------------------------- */
  TAP_DEBOUNCE_MS: 900,
  MIN_CYCLE_MS: 2000,
};
