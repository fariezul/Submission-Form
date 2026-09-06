/* ============================================================
   line-station.js — A STUDENT'S PHONE
   ============================================================
   One page, one station, one enormous button.

   The page it runs on sets window.FLIGHT_STATION to 0, 1, 2 or 3
   before loading this file, which is the only difference between
   station-a.html and station-d.html.

   ------------------------------------------------------------
   WHAT THIS PAGE IS FOR, AND WHAT IT IS NOT FOR
   ------------------------------------------------------------
   It is for a student who is holding a piece of paper in one hand
   and a phone in the other, looking mostly at the paper. So:

     * The button fills most of the screen and cannot be missed.
     * It flashes and buzzes when a tap lands, because they will
       not be looking at it.
     * Nothing else on the page can be tapped by accident.
     * The screen is kept awake, because a phone that sleeps at
       plane eleven loses plane twelve.

   It is NOT for looking at results. There is no analysis here at
   all — that is the dashboard's job, on the big screen where
   everyone can discuss it. A station that starts studying its own
   average stops folding.

   ------------------------------------------------------------
   THE ORDER OF EVENTS ON A TAP, WHICH MATTERS
   ------------------------------------------------------------
       stamp -> store -> tell the student -> upload later

   The first two are instant and cannot fail for want of wifi.
   The upload happens in the background and may take all
   afternoon; the counter at the bottom says how many are still
   waiting. Nothing a student does is ever blocked by the network.
   ============================================================ */

"use strict";

(function () {

  const config = window.LINE_CONFIG;
  const store = window.LineStore;
  const sheets = window.LineSheets;
  const clock = window.LineClock;
  const fmt = window.LineAnalytics.fmt;

  const stationIndex = window.FLIGHT_STATION;
  const station = config.STATIONS[stationIndex];
  const isQc = (config.QC_STATION_INDEX === stationIndex);

  if (!station) {
    document.body.innerHTML =
      '<p style="padding:24px;font:16px system-ui">This page is set to ' +
      'station ' + stationIndex + ', which is not in LINE_CONFIG.STATIONS. ' +
      'Check line-config.js.</p>';
    return;
  }

  const $ = function (id) { return document.getElementById(id); };

  const el = {
    root:       $("stationRoot"),
    setup:      $("setupScreen"),
    waiting:    $("waitingScreen"),
    run:        $("runScreen"),
    code:       $("lineCode"),
    joinForm:   $("joinForm"),
    joinError:  $("joinError"),
    badge:      $("stBadge"),
    title:      $("stTitle"),
    sub:        $("stSub"),
    clock:      $("stClock"),
    done:       $("cDone"),
    left:       $("cLeft"),
    last:       $("cLast"),
    tap:        $("tapBtn"),
    tapLabel:   $("tapLabel"),
    tapSub:     $("tapSub"),
    lastLine:   $("lastLine"),
    undo:       $("undoBtn"),
    leave:      $("leaveBtn"),
    conn:       $("connLine"),
    waitTitle:  $("waitTitle"),
    waitBody:   $("waitBody"),
    waitCode:   $("waitCode"),
    verdict:    $("verdictPanel"),
    vTitle:     $("verdictTitle"),
    vStep1:     $("verdictStep1"),
    vStep2:     $("verdictStep2"),
    vCauses:    $("causeButtons"),
    vLater:     $("verdictLater"),
    live:       $("srLive"),
  };

  /* Paint the station's identity into the page. */
  el.root.style.setProperty("--st-colour", station.colour);
  el.root.style.setProperty("--st-wash", station.colour + "1f");
  el.badge.textContent = station.key;
  el.title.textContent = station.name;
  el.tapLabel.textContent = station.verb || "Done";
  document.title = "Station " + station.key + " · " + station.name +
                   " | Flight Line";

  let pollTimer = null;
  let outboxTimer = null;
  let tickTimer = null;
  let lastTapAt = 0;
  let pendingVerdictItem = null;
  let wakeLock = null;


  /* ==========================================================
     KEEPING THE SCREEN AWAKE
     ==========================================================
     A phone that locks itself mid-round is the single most
     common way to lose data in this activity. Where the browser
     allows it we hold a wake lock; where it does not, the page
     says so on the status line so the student knows to set their
     screen timeout by hand.

     The lock is dropped whenever the page is hidden, and taken
     again when it comes back, because the browser revokes it on
     the way past anyway.
     ========================================================== */
  async function keepAwake() {
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", function () { wakeLock = null; });
    } catch (e) {
      wakeLock = null;   // Refused, usually because the tab is hidden.
    }
  }

  function releaseAwake() {
    if (wakeLock) { try { wakeLock.release(); } catch (e) {} wakeLock = null; }
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      if (store.isLive()) keepAwake();
      poll();          // catch up immediately rather than waiting
      store.flush();
    } else {
      releaseAwake();
    }
  });


  /* ==========================================================
     SCREENS
     ========================================================== */
  function show(which) {
    el.setup.hidden = which !== "setup";
    el.waiting.hidden = which !== "waiting";
    el.run.hidden = which !== "run";
  }

  function announce(message) {
    // A polite live region, so a student using VoiceOver hears the
    // tap land without the page stealing focus from the button.
    el.live.textContent = message;
  }


  /* ==========================================================
     JOINING A LINE
     ========================================================== */
  const savedCode = store.prefs().code || "";
  el.code.value = savedCode;

  el.joinForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const code = el.code.value.trim().toUpperCase();

    if (code.length < 2) {
      el.joinError.textContent = "Type the line code your teacher read out.";
      el.code.focus();
      return;
    }

    el.joinError.textContent = "";
    store.setPref("code", code);
    store.setPref("station", stationIndex);
    el.waitCode.textContent = code;

    show("waiting");
    setWaiting("Looking for the line…",
               "Checking whether the teacher has started a round.");
    startPolling();
    poll();
  });

  $("changeLineBtn").addEventListener("click", function () {
    stopPolling();
    show("setup");
  });

  el.leave.addEventListener("click", function () {
    if (store.outboxSize() > 0) {
      const ok = confirm(
        store.outboxSize() + " taps have not reached the sheet yet. " +
        "Leaving now keeps them on this phone, but they will only upload " +
        "when you come back. Leave anyway?");
      if (!ok) return;
    }
    releaseAwake();
    stopPolling();
    show("setup");
  });

  function setWaiting(title, body) {
    el.waitTitle.textContent = title;
    el.waitBody.textContent = body;
  }


  /* ==========================================================
     POLLING FOR THE ROUND
     ==========================================================
     The station asks the sheet what is going on. It does NOT need
     this to record a tap — only to learn when a round has started
     and what time zero is.
     ========================================================== */
  function startPolling() {
    stopPolling();
    pollTimer = setInterval(poll, config.STATION_POLL_MS);
    outboxTimer = setInterval(function () { store.flush(); }, config.OUTBOX_RETRY_MS);
    tickTimer = setInterval(tick, 250);
  }

  function stopPolling() {
    clearInterval(pollTimer); pollTimer = null;
    clearInterval(outboxTimer); outboxTimer = null;
    clearInterval(tickTimer); tickTimer = null;
  }

  let polling = false;
  let lastPollOk = null;

  async function poll() {
    if (polling) return;
    const code = store.prefs().code;
    if (!code) return;

    if (!sheets.isConfigured()) {
      lastPollOk = false;
      setWaiting("No Google Sheet is connected",
                 "This site has not been linked to a sheet yet, so the phones " +
                 "cannot be told when a round starts. Your teacher can run the " +
                 "activity from one screen instead, using solo mode on the " +
                 "dashboard.");
      renderConn();
      return;
    }

    polling = true;
    try {
      const res = await sheets.fetchRound(code);
      lastPollOk = res.ok;

      if (!res.ok) {
        renderConn();
        return;
      }

      const round = res.data.round;

      if (!round) {
        setWaiting("Waiting for the teacher",
                   "Line " + code + " has not started a round yet. Leave this " +
                   "page open — it will switch over by itself.");
        show("waiting");
        renderConn();
        return;
      }

      store.adoptRound({
        code: round.code,
        roundNo: round.round_no,
        startedAt: round.started_at_ms,
        itemCount: round.item_count,
        taktMs: round.takt_ms,
        status: round.status,
        notes: round.notes,
        endedAt: round.ended_at_ms,
      });

      if (res.data.events) store.mergeEvents(res.data.events);

      if (round.status === "live") {
        show("run");
        keepAwake();
      } else if (round.status === "ended") {
        releaseAwake();
        setWaiting("Round " + round.round_no + " has finished",
                   "Well done. The results are on the big screen. Wait here — " +
                   "when the teacher starts the next round this page will " +
                   "switch back on its own.");
        show("waiting");
      }

      render();
    } finally {
      polling = false;
      renderConn();
    }
  }


  /* ==========================================================
     THE TAP
     ==========================================================
     Everything above exists so that these few lines can be
     instant and cannot fail.
     ========================================================== */
  el.tap.addEventListener("click", function () {
    if (!store.isLive()) return;

    const now = Date.now();

    /* A thumb bounces. Two taps a fifth of a second apart are one
       tap, and treating them as two would record a plane folded in
       200 milliseconds and poison the station's average. */
    if (now - lastTapAt < config.TAP_DEBOUNCE_MS) return;

    const head = store.header();
    const elapsed = clock.now() - head.startedAt;

    /* One past the highest already recorded — not the count of
       what has been recorded. The two differ only when a reading
       has been deleted from the middle on the dashboard, and in
       that case the count would send this tap on top of a good
       later plane. See nextItemIndex in line-store.js. */
    const nextItem = store.nextItemIndex(stationIndex);

    if (nextItem >= head.itemCount) {
      flashMessage("All " + head.itemCount + " planes are done at this station.");
      return;
    }

    /* Suspiciously fast. Not blocked — a student really can label a
       plane in three seconds — but worth one question, because the
       usual cause is a double tap that got past the debounce. */
    const lastDone = store.lastOwnDone(stationIndex);
    if (lastDone && (elapsed - lastDone.ms) < config.MIN_CYCLE_MS) {
      const gap = Math.round((elapsed - lastDone.ms) / 100) / 10;
      if (!confirm("That is only " + gap + " seconds since the last plane. " +
                   "Record it anyway?")) return;
    }

    lastTapAt = now;

    const ev = store.recordDone(stationIndex, nextItem, elapsed);
    confirmTap();
    announce("Plane " + (nextItem + 1) + " recorded at " + fmt.clock(elapsed));

    if (isQc && ev) askVerdict(nextItem);

    render();
    store.flush();
  });

  /* Flash, buzz, and say so. A student looking at the paper needs
     all three, because they may only get one of them. */
  function confirmTap() {
    el.tap.classList.remove("is-hit");
    // Reading offsetWidth forces the browser to notice the class
    // really was removed, so re-adding it restarts the animation.
    void el.tap.offsetWidth;
    el.tap.classList.add("is-hit");

    if (navigator.vibrate) {
      try { navigator.vibrate(35); } catch (e) {}
    }
  }

  function flashMessage(text) {
    el.lastLine.innerHTML = "<b>" + escapeHtml(text) + "</b>";
    setTimeout(render, 2600);
  }


  /* ==========================================================
     UNDO
     ==========================================================
     Only ever cancels a tap made on THIS phone, so nobody can
     undo somebody else's station by accident.
     ========================================================== */
  el.undo.addEventListener("click", function () {
    const last = store.lastOwnDone(stationIndex);
    if (!last) return;

    if (!confirm("Remove the last plane you recorded (at " +
                 fmt.clock(last.ms) + ")?")) return;

    store.undo(last.id);
    announce("Last tap removed.");
    render();
    store.flush();
  });


  /* ==========================================================
     PASS OR REJECT — Quality Check only
     ==========================================================
     Shown AFTER the time is already recorded, so thinking about
     the verdict never slows the clock down. Pass is one tap;
     reject is two.
     ========================================================== */
  function askVerdict(itemIndex) {
    pendingVerdictItem = itemIndex;
    el.vTitle.textContent = "Plane " + (itemIndex + 1);
    el.vStep1.hidden = false;
    el.vStep2.hidden = true;
    el.verdict.hidden = false;

    // Move focus so a keyboard or switch user lands on the choice.
    const first = el.vStep1.querySelector("button");
    if (first) first.focus();
  }

  function closeVerdict() {
    el.verdict.hidden = true;
    pendingVerdictItem = null;
    el.tap.focus();
  }

  $("passBtn").addEventListener("click", function () {
    if (pendingVerdictItem === null) return;
    store.recordVerdict(pendingVerdictItem, "pass", null);
    announce("Plane passed.");
    closeVerdict();
    render();
    store.flush();
  });

  $("rejectBtn").addEventListener("click", function () {
    if (pendingVerdictItem === null) return;
    el.vStep1.hidden = true;
    el.vStep2.hidden = false;
    const first = el.vCauses.querySelector("button");
    if (first) first.focus();
  });

  el.vLater.addEventListener("click", function () {
    // The time is already safely recorded. The verdict can be
    // filled in on the dashboard afterwards.
    announce("Verdict left for later.");
    closeVerdict();
  });

  /* One button per station, plus "not sure". Built from the config
     so adding a fifth station needs no change here. */
  (function buildCauseButtons() {
    config.STATIONS.forEach(function (st, i) {
      if (i === config.QC_STATION_INDEX) return;   // QC does not cause its own faults
      const b = document.createElement("button");
      b.type = "button";
      b.className = "fl-cause";
      b.style.setProperty("--st-colour", st.colour);
      b.innerHTML = "<span>" + escapeHtml(st.key + " · " + st.name) + "</span>";
      b.addEventListener("click", function () { setCause(i); });
      el.vCauses.appendChild(b);
    });

    const unknown = document.createElement("button");
    unknown.type = "button";
    unknown.className = "fl-cause";
    unknown.textContent = "Not sure";
    unknown.addEventListener("click", function () { setCause(null); });
    el.vCauses.appendChild(unknown);
  })();

  function setCause(causeIndex) {
    if (pendingVerdictItem === null) return;
    store.recordVerdict(pendingVerdictItem, "reject", causeIndex);
    announce("Plane rejected.");
    closeVerdict();
    render();
    store.flush();
  }


  /* ==========================================================
     DRAWING
     ========================================================== */
  function tick() {
    const ms = store.elapsed();
    el.clock.textContent = (ms === null) ? "0:00" : fmt.clock(Math.max(0, ms));
  }

  function render() {
    const head = store.header();
    if (!head) return;

    const done = store.doneCount(stationIndex);
    const nextItem = store.nextItemIndex(stationIndex);
    const total = head.itemCount;

    el.sub.textContent = "Line " + head.code + " · Round " + head.roundNo;
    el.done.textContent = String(done);
    el.left.textContent = String(Math.max(0, total - nextItem));

    /* The last two planes this station actually recorded — found
       by walking back through the row rather than assuming they
       sit at [done-1] and [done-2], which stops being true the
       moment a reading is deleted from the middle. */
    const row = store.build().exits[stationIndex] || [];
    const recorded = [];
    for (let i = 0; i < total; i++) {
      if (typeof row[i] === "number") recorded.push({ i: i, ms: row[i] });
    }
    const last = recorded.length ? recorded[recorded.length - 1] : null;
    const prev = recorded.length > 1 ? recorded[recorded.length - 2] : null;

    /* The station's own last cycle time. Shown because it is the
       one number a student can act on while they are still
       working — and withheld until there are two planes, because
       the first one's "cycle" includes waiting for the round to
       reach them. */
    const lastCycle = (last && prev) ? last.ms - prev.ms : null;
    el.last.textContent = (lastCycle === null) ? "—" : fmt.secs(lastCycle);

    el.lastLine.innerHTML = last
      ? "Plane <b>" + (last.i + 1) + "</b> finished at <b>" + fmt.clock(last.ms) + "</b>"
      : "Tap the moment your first plane is finished.";

    const allDone = nextItem >= total;
    el.tap.disabled = allDone || !store.isLive();
    el.tapSub.textContent = allDone
      ? "All " + total + " planes done"
      : "plane " + (nextItem + 1) + " of " + total;

    el.undo.disabled = !store.lastOwnDone(stationIndex);

    const rail = document.getElementById("stRail");
    if (rail) rail.style.width = (total ? (nextItem / total) * 100 : 0) + "%";

    tick();
    renderConn();
  }

  function renderConn() {
    const pending = store.outboxSize();
    const c = clock.status();
    const bits = [];

    if (!sheets.isConfigured()) {
      bits.push("<b>Not connected to a sheet</b> — taps are kept on this phone");
    } else if (lastPollOk === false) {
      bits.push("<b>Offline</b> — taps are safe on this phone");
    } else if (lastPollOk === true) {
      bits.push("<b>Connected</b>");
    }

    if (pending > 0) {
      bits.push(pending + (pending === 1 ? " tap waiting to upload" : " taps waiting to upload"));
    }

    if (c.synced && Math.abs(c.offsetMs) > 1500) {
      bits.push("clock corrected by " + Math.round(c.offsetMs / 1000) + "s");
    }
    if (c.deviceClockSuspect) {
      bits.push("<b>check this phone's date &amp; time</b>");
    }
    if (!("wakeLock" in navigator)) {
      bits.push("keep the screen awake yourself");
    }
    if (!store.storageWorks()) {
      bits.push("<b>private browsing</b> — a refresh will lose taps");
    }

    el.conn.innerHTML = bits.join(" · ");
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  store.onChange(function () {
    if (!el.run.hidden) renderConn();
  });


  /* ==========================================================
     START
     ========================================================== */
  if (savedCode) {
    el.waitCode.textContent = savedCode;

    /* --------------------------------------------------------
       A LIVE ROUND IN LOCAL STORAGE IS ENOUGH TO START TAPPING
       --------------------------------------------------------
       This used to sit on "Looking for the line…" until a poll
       came back, which quietly made the network a prerequisite
       for the one thing that was designed never to need it.

       A student whose phone drops the wifi and reloads — or who
       walks behind the machine shop wall — then had a live round
       sitting in their own localStorage and no way to reach the
       button. Every tap for the rest of the round was lost, and
       the page was cheerfully telling them it was waiting for
       the teacher.

       If this device already knows the round is live, show the
       button at once. Polling still runs underneath, so the
       round-ended transition arrives whenever the network does.
       -------------------------------------------------------- */
    const known = store.header();
    if (known && known.code === savedCode && known.status === "live") {
      show("run");
      render();
      keepAwake();
    } else {
      show("waiting");
      setWaiting("Looking for the line…", "Checking whether a round has started.");
    }

    startPolling();
    poll();
  } else {
    show("setup");
  }

  // Synchronise the clock straight away, so the very first tap of
  // the round is already corrected rather than the second.
  if (sheets.isConfigured()) sheets.ping();

  sheets.recordVisit(config.PAGE + "-station-" + station.key,
                     window.matchMedia("(max-width: 820px)").matches);

  /* A phone that is about to close still has taps in the outbox?
     Say so. This will not stop a determined thumb, but it has
     rescued a round more than once. */
  window.addEventListener("beforeunload", function (e) {
    if (store.outboxSize() > 0 && store.isLive()) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

})();
