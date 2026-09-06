/* ============================================================
   line-board.js — THE DASHBOARD
   ============================================================
   The screen on the projector. It starts and ends rounds, shows
   the line filling up while the class works, and turns the taps
   into the analysis they discuss afterwards.

   ------------------------------------------------------------
   IT RUNS IN TWO MODES AND DOES NOT MUCH CARE WHICH
   ------------------------------------------------------------
   TEAM MODE   Four phones tap; this screen watches. Needs the
               Google Sheet.

   SOLO MODE   No sheet, no phones. This screen holds all four
               buttons and one student taps them all. Everything
               downstream — the charts, the analysis, the export —
               is identical, because both modes write the same
               events into the same store.

   Solo mode is not a lesser fallback. For a first run, or a small
   class, or a room with bad wifi, it is the better choice: one
   clock, nothing to configure, nothing to go wrong.

   ------------------------------------------------------------
   HOW THE SCREEN STAYS FRESH
   ------------------------------------------------------------
   Two separate heartbeats, because they cost very different
   amounts:

     * The CLOCK ticks four times a second. It touches one text
       node, so it is free.
     * The DATA re-renders only when something actually changed —
       a tap arrived, or a poll brought new events. Re-running the
       analysis and redrawing eight charts several times a second
       would make a laptop's fan audible from the back of the
       room, and would not tell anyone anything new.
   ============================================================ */

"use strict";

(function () {

  const config = window.LINE_CONFIG;
  const store = window.LineStore;
  const sheets = window.LineSheets;
  const clock = window.LineClock;
  const A = window.LineAnalytics;
  const charts = window.LineCharts;
  const fmt = A.fmt;

  const $ = function (id) { return document.getElementById(id); };

  const el = {
    body:        document.body,
    setup:       $("setupPanel"),
    status:      $("statusBar"),
    clock:       $("boardClock"),
    statePill:   $("statePill"),
    connPill:    $("connPill"),
    codeLabel:   $("codeLabel"),
    roundLabel:  $("roundLabel"),
    doneLabel:   $("doneLabel"),
    stations:    $("stationCards"),
    solo:        $("soloPanel"),
    soloBtns:    $("soloButtons"),
    tabs:        $("boardTabs"),
    panels:      {
      live:    $("panelLive"),
      analysis:$("panelAnalysis"),
      compare: $("panelCompare"),
      improve: $("panelImprove"),
      data:    $("panelData"),
      help:    $("panelHelp"),
    },
    liveFlow:    $("liveFlow"),
    metrics:     $("metricGrid"),
    findings:    $("findingsList"),
    findingsTitle: $("findingsTitle"),
    langSwitch:  document.querySelector(".fl-langswitch"),
    problems:    $("problemBox"),
    chartsWrap:  $("chartsWrap"),
    stationTable:$("stationTable"),
    itemTable:   $("itemTable"),
    compareWrap: $("compareWrap"),
    notes:       $("kaizenNotes"),
    notesState:  $("notesState"),
    joinLinks:   $("joinLinks"),
    startBtn:    $("startRoundBtn"),
    endBtn:      $("endRoundBtn"),
    newBtn:      $("newRoundBtn"),
    live:        $("srLive"),
  };

  let activeTab = "live";
  let pollTimer = null;
  let outboxTimer = null;
  let tickTimer = null;
  let lastSignature = "";
  let lastPollOk = null;
  let flowView = "station";


  /* ==========================================================
     SETUP FORM
     ========================================================== */
  (function initSetup() {
    const prefs = store.prefs();
    $("cfgCode").value = prefs.code || "";
    $("cfgItems").value = config.ITEM_COUNT;
    $("cfgDemand").value = config.DEMAND_MINUTES === null ? "" : config.DEMAND_MINUTES;

    if (!sheets.isConfigured()) {
      $("modeTeam").disabled = true;
      $("modeSolo").checked = true;
      $("modeNote").innerHTML =
        "No Google Sheet is connected yet, so team mode is unavailable. " +
        "Solo mode works fully. To turn on the phones, follow the setup at " +
        "the top of <code>google-apps-script/activity-5-Code.gs</code>.";
    }
  })();

  el.startBtn.addEventListener("click", startRound);
  el.endBtn.addEventListener("click", endRound);
  el.newBtn.addEventListener("click", newRound);

  async function startRound() {
    const code = $("cfgCode").value.trim().toUpperCase();
    const items = Math.max(1, Math.min(200, parseInt($("cfgItems").value, 10) || 20));
    const demand = parseFloat($("cfgDemand").value);
    const solo = $("modeSolo").checked;

    if (code.length < 2) {
      $("setupError").textContent = "Give the line a short code, e.g. DTP3A.";
      $("cfgCode").focus();
      return;
    }

    $("setupError").textContent = "";
    store.setPref("code", code);

    const taktMs = (isFinite(demand) && demand > 0)
      ? (demand * 60000) / items
      : null;

    let roundNo = store.nextRoundNo(code);
    el.startBtn.disabled = true;
    el.startBtn.textContent = "Starting…";

    let startedAt = null;

    if (!solo && sheets.isConfigured()) {
      /* The SERVER decides two things this laptop must not.

         TIME ZERO, so five devices count from one instant rather
         than from whenever each of them happened to notice.

         THE ROUND NUMBER, because this browser only knows the
         rounds it has seen itself. Run the dashboard from a
         different machine and its idea of "next" would collide
         with a round that already exists. The sheet knows them
         all, so the sheet decides — and we take what it gives us
         rather than what we asked for. */
      const res = await sheets.startRound({
        code: code,
        item_count: items,
        takt_ms: taktMs,
        stations: config.STATIONS.map(function (s) { return s.key; }),
      });

      if (!res.ok) {
        $("setupError").textContent =
          "Could not start the round on the sheet: " + res.error +
          " — you can still run it in solo mode.";
        el.startBtn.disabled = false;
        el.startBtn.textContent = "Start round";
        return;
      }
      startedAt = res.data.round.started_at_ms;
      roundNo = res.data.round.round_no;
    } else {
      // Solo mode: one clock in the room, and this is it.
      startedAt = clock.now();
    }

    store.openRound({
      code: code,
      roundNo: roundNo,
      startedAt: startedAt,
      itemCount: items,
      taktMs: taktMs,
      status: "live",
      solo: solo,
    });

    el.startBtn.disabled = false;
    el.startBtn.textContent = "Start round";

    buildSoloButtons();
    startHeartbeats();
    setTab("live");
    renderAll();
    announce("Round " + roundNo + " started.");
  }

  async function endRound() {
    const head = store.header();
    if (!head) return;

    const done = countFinished();
    if (done < head.itemCount) {
      if (!confirm("Only " + done + " of " + head.itemCount +
                   " planes have finished. End the round anyway?")) return;
    }

    store.setStatus("ended");
    store.archiveCurrent();

    if (!head.solo && sheets.isConfigured()) {
      await sheets.endRound(head.code, head.roundNo, head.notes || "");
    }

    renderAll();
    setTab("analysis");
    announce("Round ended. The analysis is ready.");
  }

  function newRound() {
    const head = store.header();
    if (head && head.status === "live") {
      if (!confirm("A round is still running. Start a new one anyway? " +
                   "The current one will be saved first.")) return;
      store.setStatus("ended");
    }
    if (head) store.archiveCurrent();

    store.clearActive();
    stopHeartbeats();
    renderAll();
    announce("Ready to start a new round.");
  }


  /* ==========================================================
     SOLO MODE BUTTONS
     ==========================================================
     The same tap, the same store, the same analysis — just on
     this screen instead of four phones.
     ========================================================== */
  function buildSoloButtons() {
    el.soloBtns.innerHTML = "";
    const head = store.header();
    if (!head || !head.solo) return;

    config.STATIONS.forEach(function (st, i) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "fl-tapbtn fl-solo-btn";
      b.style.setProperty("--st-colour", st.colour);
      b.innerHTML =
        '<span style="font-size:26px">' + esc(st.key) + " · " + esc(st.name) + "</span>" +
        '<small data-solo-sub="' + i + '"></small>';
      b.addEventListener("click", function () { soloTap(i, b); });
      el.soloBtns.appendChild(b);
    });
  }

  const soloLastTap = {};

  function soloTap(stationIndex, button) {
    if (!store.isLive()) return;

    const now = Date.now();
    if (now - (soloLastTap[stationIndex] || 0) < config.TAP_DEBOUNCE_MS) return;
    soloLastTap[stationIndex] = now;

    const head = store.header();
    const elapsed = clock.now() - head.startedAt;

    /* One past the highest recorded, not the count — see
       nextItemIndex in line-store.js. */
    const nextItem = store.nextItemIndex(stationIndex);

    if (nextItem >= head.itemCount) return;

    store.recordDone(stationIndex, nextItem, elapsed);

    button.classList.remove("is-hit");
    void button.offsetWidth;
    button.classList.add("is-hit");
    if (navigator.vibrate) { try { navigator.vibrate(30); } catch (e) {} }

    if (config.QC_STATION_INDEX === stationIndex) askVerdict(nextItem);

    renderAll();
    store.flush();
  }

  /* In solo mode the verdict is asked on this screen. Deliberately
     the same two-tap flow as the phone, so a class that starts in
     solo mode and moves to team mode is not learning it twice. */
  let pendingVerdictItem = null;

  function askVerdict(itemIndex) {
    pendingVerdictItem = itemIndex;
    $("boardVerdictTitle").textContent = "Plane " + (itemIndex + 1);
    $("boardVerdictStep1").hidden = false;
    $("boardVerdictStep2").hidden = true;
    $("boardVerdict").hidden = false;
    const first = $("boardVerdictStep1").querySelector("button");
    if (first) first.focus();
  }

  function closeVerdict() {
    $("boardVerdict").hidden = true;
    pendingVerdictItem = null;
  }

  $("boardPassBtn").addEventListener("click", function () {
    if (pendingVerdictItem === null) return;
    store.recordVerdict(pendingVerdictItem, "pass", null);
    closeVerdict(); renderAll(); store.flush();
  });

  $("boardRejectBtn").addEventListener("click", function () {
    $("boardVerdictStep1").hidden = true;
    $("boardVerdictStep2").hidden = false;
    const first = $("boardCauseButtons").querySelector("button");
    if (first) first.focus();
  });

  $("boardVerdictLater").addEventListener("click", closeVerdict);

  (function buildBoardCauses() {
    const wrap = $("boardCauseButtons");
    config.STATIONS.forEach(function (st, i) {
      if (i === config.QC_STATION_INDEX) return;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "fl-cause";
      b.style.setProperty("--st-colour", st.colour);
      b.textContent = st.key + " · " + st.name;
      b.addEventListener("click", function () { setCause(i); });
      wrap.appendChild(b);
    });
    const unknown = document.createElement("button");
    unknown.type = "button";
    unknown.className = "fl-cause";
    unknown.textContent = "Not sure";
    unknown.addEventListener("click", function () { setCause(null); });
    wrap.appendChild(unknown);
  })();

  function setCause(causeIndex) {
    if (pendingVerdictItem === null) return;
    store.recordVerdict(pendingVerdictItem, "reject", causeIndex);
    closeVerdict(); renderAll(); store.flush();
  }


  /* ==========================================================
     HEARTBEATS
     ========================================================== */
  function startHeartbeats() {
    stopHeartbeats();
    tickTimer = setInterval(tick, 250);
    const head = store.header();
    if (head && !head.solo && sheets.isConfigured()) {
      pollTimer = setInterval(poll, config.MONITOR_POLL_MS);

      /* The dashboard writes too — every verdict set from the
         Data tab, every corrected time, every deleted reading —
         and those go through the same outbox as a station's taps.
         The station pages retry theirs on a timer; this screen
         had no such timer, so a single failed upload sat in the
         queue until "New round" cleared it away. The teacher's
         corrections are the last thing that should be silently
         dropped, since they are usually made precisely because
         something already went wrong. */
      outboxTimer = setInterval(function () { store.flush(); },
                                config.OUTBOX_RETRY_MS);
      poll();
    }
  }

  function stopHeartbeats() {
    clearInterval(tickTimer); tickTimer = null;
    clearInterval(pollTimer); pollTimer = null;
    clearInterval(outboxTimer); outboxTimer = null;
  }

  let polling = false;

  async function poll() {
    if (polling) return;
    const head = store.header();
    if (!head || head.solo) return;

    polling = true;
    try {
      const res = await sheets.fetchRound(head.code, head.roundNo);
      lastPollOk = res.ok;
      if (res.ok && res.data.events) {
        const added = store.mergeEvents(res.data.events);
        if (added) renderAll();
      }
      if (res.ok && res.data.round && res.data.round.status !== head.status) {
        store.setStatus(res.data.round.status);
        renderAll();
      }
    } finally {
      polling = false;
      renderConn();
    }
  }

  function tick() {
    const ms = store.elapsed();
    el.clock.textContent = (ms === null) ? "0:00" : fmt.clock(Math.max(0, ms));
    el.clock.classList.toggle("fl-clock-idle", !store.isLive());
  }


  /* ==========================================================
     TABS
     ========================================================== */
  el.tabs.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-tab]");
    if (btn) setTab(btn.getAttribute("data-tab"));
  });

  function setTab(name) {
    activeTab = name;
    Array.prototype.forEach.call(el.tabs.querySelectorAll("[data-tab]"), function (b) {
      b.setAttribute("aria-selected", b.getAttribute("data-tab") === name ? "true" : "false");
    });
    Object.keys(el.panels).forEach(function (k) {
      if (el.panels[k]) el.panels[k].hidden = (k !== name);
    });
    // Charts are only built for the panel on screen, so switching
    // tabs is what pays for them rather than every poll.
    lastSignature = "";
    renderAll();
  }


  /* ==========================================================
     RENDER
     ========================================================== */
  function renderAll() {
    const head = store.header();

    el.setup.hidden = !!head;
    el.status.hidden = !head;
    el.tabs.hidden = !head;
    Object.keys(el.panels).forEach(function (k) {
      if (el.panels[k] && !head) el.panels[k].hidden = true;
    });
    if (!head) {
      /* Blank the live cards and the solo buttons too. Without
         this, "New round" drops you back to the setup form with
         the FINISHED round's four cards still sitting under it —
         twenty of twenty, complete, bottleneck and all — which
         reads as though the new round has somehow already run. */
      el.stations.innerHTML = "";
      el.solo.hidden = true;
      renderJoinLinks();
      return;
    }

    if (!el.panels[activeTab] || el.panels[activeTab].hidden) {
      if (el.panels[activeTab]) el.panels[activeTab].hidden = false;
    }

    el.solo.hidden = !head.solo || head.status !== "live";

    const grid = store.build();
    const a = A.analyse(grid);

    renderStatus(head, a);
    renderStationCards(a);
    renderSoloLabels(head);

    /* Only redo the expensive parts when the data actually moved.
       The signature is cheap to compute and covers everything the
       charts depend on. */
    const sig = [activeTab, store.events().length, head.status,
                 a.line.completed, a.line.runWindowMs].join("|");
    if (sig !== lastSignature) {
      lastSignature = sig;
      renderPanel(a, head);
    }

    renderConn();
    tick();
  }

  function renderStatus(head, a) {
    el.codeLabel.textContent = head.code;
    el.roundLabel.textContent = "Round " + head.roundNo;
    el.doneLabel.textContent = a.line.completed + " / " + head.itemCount;

    const pill = el.statePill;
    pill.className = "fl-pill " +
      (head.status === "live" ? "fl-pill-live"
        : head.status === "ended" ? "fl-pill-ended" : "fl-pill-idle");
    pill.textContent =
      head.status === "live" ? (head.solo ? "Running · solo" : "Running · team")
      : head.status === "ended" ? "Finished" : "Ready";

    el.endBtn.hidden = head.status !== "live";
    el.newBtn.hidden = head.status === "live";
  }

  function renderStationCards(a) {
    const head = store.header();
    el.stations.innerHTML = "";

    a.perStation.forEach(function (p) {
      const card = document.createElement("div");
      card.className = "fl-station-card";
      card.style.setProperty("--st-colour", p.colour);

      const isBottleneck = a.line.bottleneck && a.line.bottleneck.index === p.index &&
                           a.line.completed >= 3;
      if (isBottleneck) card.classList.add("is-bottleneck");

      /* What is this station doing right now? Derived, not
         reported: if the station upstream is further ahead than
         this one, there is a pile waiting; if it is not, this
         station is standing idle.

         The first station is excluded from the pile count on
         purpose. The stack of blank A4 beside Marking is not work
         in progress — it is raw material, and nobody has spent
         anything on it yet. Counting it would put "20 waiting" on
         the card before the round has even begun. */
      /* THE RAW NUMBER OF TAPS, not the number the analysis could
         work a time out for.
         ----------------------------------------------------------
         p.done counts planes with a computable process time, and
         that needs the station UPSTREAM to have reported too. So a
         station whose own phone is working perfectly showed 0 of 6
         whenever Marking's phone was offline — the student has
         tapped six times, the card says nothing happened, and they
         reasonably conclude their taps are being lost.

         The card answers "what have I recorded?", which is a
         question about this station alone. The averages below it
         still say "—" until the upstream times arrive, which is
         honest: the count is known, the duration genuinely is not. */
      const mine = countDone(a, p.index);
      const pile = p.index > 0 ? countDone(a, p.index - 1) - mine : 0;
      let tag = "";

      if (head.status !== "live") {
        tag = mine >= head.itemCount ? '<span class="fl-tag fl-tag-done">complete</span>' : "";
      } else if (mine >= head.itemCount) {
        tag = '<span class="fl-tag fl-tag-done">finished</span>';
      } else if (p.index === 0) {
        tag = '<span class="fl-tag fl-tag-working">working</span>';
      } else if (pile > 0) {
        tag = '<span class="fl-tag fl-tag-working">working · ' + pile +
              ' in the pile</span>';
      } else {
        tag = '<span class="fl-tag fl-tag-waiting">waiting for a plane</span>';
      }

      card.innerHTML =
        '<div class="fl-station-head">' +
          '<span class="fl-station-key">' + esc(p.key) + "</span>" +
          '<span class="fl-station-name">' + esc(p.name) + "</span>" +
          (isBottleneck ? '<span class="fl-tag fl-tag-bottleneck">bottleneck</span>' : "") +
        "</div>" +
        '<div class="fl-station-big num">' + esc(String(mine)) +
          "<small>of " + head.itemCount + "</small></div>" +
        '<div class="fl-station-meta">' +
          "<span>avg <b>" + esc(fmt.secs(p.avgCycle)) + "</b></span>" +
          "<span>waited <b>" + esc(fmt.clock(p.totalStarveMs)) + "</b></span>" +
          "<span>busy <b>" + esc(fmt.pct(p.utilisation)) + "</b></span>" +
        "</div>" +
        '<div style="margin-top:9px">' + tag + "</div>" +
        '<div class="fl-station-rail"><span style="width:' +
          (head.itemCount ? (mine / head.itemCount) * 100 : 0) + '%"></span></div>';

      el.stations.appendChild(card);
    });
  }

  /* Which plane each solo button is about to record. Without this
     the person tapping has to look away at the cards to find out
     where they are, which is exactly the moment a tap gets missed. */
  function renderSoloLabels(head) {
    if (!head || !head.solo) return;
    config.STATIONS.forEach(function (st, i) {
      const label = el.soloBtns.querySelector('[data-solo-sub="' + i + '"]');
      if (!label) return;
      const next = store.nextItemIndex(i);
      label.textContent = (next >= head.itemCount)
        ? "all " + head.itemCount + " done"
        : "plane " + (next + 1) + " of " + head.itemCount;
    });
  }

  function countDone(a, s) {
    let n = 0;
    const row = a.exits[s] || [];
    for (let i = 0; i < a.itemCount; i++) if (typeof row[i] === "number") n++;
    return n;
  }

  function countFinished() {
    const a = A.analyse(store.build());
    return a.line.completed;
  }


  /* ----------------------------------------------------------
     Panels
     ---------------------------------------------------------- */
  function renderPanel(a, head) {
    if (activeTab === "live")     renderLive(a);
    if (activeTab === "analysis") renderAnalysis(a);
    if (activeTab === "compare")  renderCompare(a, head);
    if (activeTab === "improve")  renderImprove(head);
    if (activeTab === "data")     renderData(a, head);
  }

  function renderLive(a) {
    el.liveFlow.innerHTML =
      '<h3>The line, drawn to scale</h3>' +
      '<p class="fl-chart-sub">' +
        (flowView === "station"
          ? "One row per student. Every gap is somebody waiting for a plane to reach them."
          : "One row per plane. Shaded stretches are time it spent sitting in a pile.") +
      '</p>' +
      '<div class="fl-btn-row fl-no-print" style="margin-bottom:10px">' +
        '<button type="button" class="fl-btn" data-flow="station"' +
          (flowView === "station" ? " disabled" : "") + ">By station</button>" +
        '<button type="button" class="fl-btn" data-flow="item"' +
          (flowView === "item" ? " disabled" : "") + ">By plane</button>" +
      "</div>" +
      (flowView === "station" ? charts.flowByStation(a) : charts.flowByItem(a));

    Array.prototype.forEach.call(el.liveFlow.querySelectorAll("[data-flow]"), function (b) {
      b.addEventListener("click", function () {
        flowView = b.getAttribute("data-flow");
        lastSignature = "";
        renderAll();
      });
    });
  }

  function renderAnalysis(a) {
    renderMetrics(a);
    renderFindings(a);
    renderProblems(a);
    renderStationTable(a);

    el.chartsWrap.innerHTML =
      chartBox("Line balance", "Each station's average against the customer's drumbeat. " +
               "A bar above the red line cannot keep up.", charts.balance(a)) +
      chartBox("Working and waiting", "Where each student's round went. The amber block " +
               "is time spent waiting for the next plane to arrive.", charts.workVsWait(a)) +
      chartBox("Did they get faster?", "Time per plane as the round went on. A downward " +
               "slope is the learning curve; a spike is usually a dropped plane.",
               charts.runChart(a)) +
      chartBox("Planes stuck in the line", "Work in progress at every moment. A staircase " +
               "that only climbs means a pile is building somewhere.", charts.wipChart(a)) +
      chartBox("How long each plane took", "Split into time somebody was working on it and " +
               "time it spent waiting.", charts.leadTimes(a)) +
      (a.line.rejects
        ? chartBox("Where the faults came from", "Rejects by the station that caused them, " +
                   "worst first.", charts.rejectPareto(a))
        : "");
  }

  function chartBox(title, sub, svgMarkup) {
    return '<div class="fl-chart"><h3>' + esc(title) + "</h3>" +
           '<p class="fl-chart-sub">' + esc(sub) + "</p>" + svgMarkup + "</div>";
  }

  function renderMetrics(a) {
    const L = a.line;

    /* accent is decoration; tone is a judgement.
       ------------------------------------------------------------
       A tile with a tone (good / warn / bad) takes its colour from
       that, and the inline accent is deliberately NOT written —
       an inline style beats a class, so setting both would paint a
       failing figure in a cheerful colour. Tiles with nothing to
       judge get a decorative accent instead, which is what turns
       the row into a band of colour rather than six white boxes. */
    function tile(label, value, note, tone, accent) {
      const style = (!tone && accent)
        ? ' style="--tile-accent:' + accent + '"' : "";
      return '<div class="fl-metric' + (tone ? " fl-metric-" + tone : "") + '"' +
             style + ">" +
             '<div class="fl-metric-label">' + esc(label) + "</div>" +
             '<div class="fl-metric-value num">' + value + "</div>" +
             (note ? '<div class="fl-metric-note">' + note + "</div>" : "") +
             "</div>";
    }

    /* Borrowed from the stations so the whole page uses one set of
       colours, rather than inventing a second palette here. */
    const hue = config.STATIONS.map(function (s) { return s.colour; });

    /* Every station's own average, written out under the tile.
       Seeing "Marking 12s · Folding 32s · Labelling 15s" side by
       side is what makes the slowest one obvious without anyone
       having to explain the word bottleneck first. */
    const perStationList = a.perStation
      .filter(function (p) { return isNum(p.avgCycle); })
      .map(function (p) { return esc(p.name) + " " + esc(fmt.secs(p.avgCycle)); })
      .join(" · ");

    /* ------------------------------------------------------------
       SIX TILES, NOT FOURTEEN
       ------------------------------------------------------------
       This grid was a wall of numbers, and a wall of numbers is
       read as decoration. A student looking at fourteen figures
       does not know which one the lesson is about, so they take
       nothing from any of them.

       So: six. Every other figure is still on this page — takt,
       line balance, work in progress, output rate and the rest are
       all explained properly in "What the numbers say" just below,
       drawn in the charts, and listed per station in the table.
       They were duplicated here, not housed here.

       The six that stayed are the ones the discussion needs:
         1  did we finish?
         2  how long does ONE STATION take on ONE plane
         3  how long does ONE PLANE take altogether
         4  ...and how little of that was actually work
         5  who was the slowest
         6  how long everyone else stood about because of it

       Two and three sit together on purpose. The second is many
       times the first, and the moment a student notices that gap
       they have understood the activity.

       The labels are deliberately plain. The proper terms are all
       still taught — they are in the notes and the findings, and
       the students are examined on them — but a tile has room for
       about four words, and those four should not be the ones the
       student came here to learn.
       ------------------------------------------------------------ */
    el.metrics.innerHTML =
      /* No warning colour here even when planes were rejected.
         This tile answers "did we finish the order?", and 20 of 20
         is a yes — painting it orange says the opposite. The
         rejects are named in the note, get their own finding, and
         have a whole Pareto chart to themselves. */
      tile("Planes finished",
           L.completed + '<small>/ ' + L.itemCount + "</small>",
           L.rejects
             ? L.goodUnits + " good, " + L.rejects + " rejected · in " +
               esc(fmt.clock(L.runWindowMs))
             : "all passed the check · in " + esc(fmt.clock(L.runWindowMs)),
           null, hue[0]) +

      /* These two headings are deliberately the same shape and
         deliberately short. Side by side, "ONE STATION on ONE
         plane · 16s" against "ONE PLANE start to finish · 4:36"
         asks the question by itself — a student sees one number
         is seventeen times the other before anyone says a word.
         Spelled out at full length they wrapped to three lines
         each and the parallel was lost. */
      tile("ONE STATION on ONE plane",
           esc(fmt.secs(L.avgStationCycleMs)),
           "average · " + (perStationList || "waiting for the first plane"),
           null, hue[1]) +

      tile("ONE PLANE start to finish",
           esc(fmt.secs(L.avgLeadMs)),
           "average · picked up at Marking to finished at Quality Check",
           null, hue[2]) +

      tile("How much of that was real work", esc(fmt.pct(L.pce)),
           isNum(L.avgVaMs) && isNum(L.avgWaitMs)
             ? "only " + esc(fmt.secs(L.avgVaMs)) + " of work · the other " +
               esc(fmt.secs(L.avgWaitMs)) + " it sat in a pile"
             : "",
           L.pce === null ? null : (L.pce < 0.4 ? "bad" : (L.pce < 0.7 ? "warn" : "good"))) +

      tile("Slowest station", L.bottleneck ? esc(L.bottleneck.name) : "—",
           L.bottleneck
             ? "takes " + esc(fmt.secs(L.bottleneckCycleMs)) + " · so a plane only " +
               "comes out every " + esc(fmt.secs(L.lineCycleMs))
             : "", L.bottleneck ? "bad" : null) +

      tile("Time the team spent waiting", esc(fmt.clock(L.totalStarveMs)),
           isNum(L.teamIdleShare)
             ? esc(fmt.pct(L.teamIdleShare)) + " of everyone's time, stood with nothing to do"
             : "", L.teamIdleShare > 0.3 ? "bad" : (L.teamIdleShare > 0.15 ? "warn" : null));
  }

  /* ==========================================================
     WHICH LANGUAGE THE FINDINGS ARE READ IN
     ==========================================================
     Remembered per device, so a class that reads Malay does not
     re-press the button every round. Only this section moves —
     the tiles, the charts and the tables are numbers, and a
     number reads the same in both.
     ========================================================== */
  let findingsLang = store.prefs().findingsLang === "ms" ? "ms" : "en";

  const PANEL_TITLE = {
    en: "What the numbers say",
    ms: "Apa yang nombor ini beritahu",
  };

  el.langSwitch.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-lang]");
    if (!btn) return;
    setFindingsLang(btn.getAttribute("data-lang"));
  });

  function setFindingsLang(lang) {
    findingsLang = (lang === "ms") ? "ms" : "en";
    store.setPref("findingsLang", findingsLang);

    Array.prototype.forEach.call(
      el.langSwitch.querySelectorAll("[data-lang]"), function (b) {
        b.setAttribute("aria-pressed",
          b.getAttribute("data-lang") === findingsLang ? "true" : "false");
      });

    el.findingsTitle.textContent = PANEL_TITLE[findingsLang];

    /* Re-render just this panel. The rest of the analysis has not
       changed, and re-running every chart to swap some prose would
       make the projector stutter for no reason. */
    const head = store.header();
    if (head) renderFindings(A.analyse(store.build()));

    announce(findingsLang === "ms"
      ? "Analisis ditukar kepada Bahasa Malaysia."
      : "Analysis switched to English.");
  }

  function renderFindings(a) {
    const list = A.findings(a, findingsLang);
    el.findings.innerHTML = list.map(function (f) {
      return '<div class="fl-finding fl-finding-' + f.tone + '">' +
             "<h3>" + esc(f.title) + "</h3><p>" + esc(f.body) + "</p></div>";
    }).join("");
  }

  function renderProblems(a) {
    const p = a.line.problems;
    if (!p.length) { el.problems.hidden = true; return; }

    el.problems.hidden = false;
    el.problems.className = "fl-notice fl-notice-warn";
    el.problems.innerHTML =
      "<b>" + p.length + (p.length === 1 ? " reading needs" : " readings need") +
      " a look.</b> These are left out of the averages rather than allowed to " +
      "distort them. You can correct any time on the Data tab." +
      "<ul>" + p.slice(0, 6).map(function (x) {
        return "<li>" + esc(x.message) + "</li>";
      }).join("") +
      (p.length > 6 ? "<li>… and " + (p.length - 6) + " more</li>" : "") + "</ul>";
  }

  function renderStationTable(a) {
    const rows = a.perStation.map(function (p) {
      return "<tr>" +
        '<td><span class="fl-swatch" style="background:' + p.colour + '"></span>' +
          esc(p.key + " · " + p.name) + "</td>" +
        "<td>" + p.done + "</td>" +
        "<td>" + esc(fmt.secs(p.avgCycle)) + "</td>" +
        "<td>" + esc(fmt.secs(p.medianCycle)) + "</td>" +
        "<td>" + esc(fmt.secs(p.minCycle)) + "</td>" +
        "<td>" + esc(fmt.secs(p.maxCycle)) + "</td>" +
        "<td>" + esc(fmt.secs(p.sdCycle)) + "</td>" +
        "<td>" + esc(fmt.clock(p.busyMs)) + "</td>" +
        "<td>" + esc(fmt.clock(p.totalStarveMs)) + "</td>" +
        "<td>" + p.starveCount + "</td>" +
        "<td>" + esc(fmt.pct(p.utilisation)) + "</td>" +
        "</tr>";
    }).join("");

    /* Column headings in words rather than in the trade's
       shorthand. "Median" and "standard deviation" are the right
       names and the wrong thing to put at the top of a column a
       first-semester student is reading for the first time. */
    el.stationTable.innerHTML =
      "<thead><tr>" +
      "<th>Station</th>" +
      "<th>Planes done</th>" +
      "<th>Average per plane</th>" +
      "<th>Usual time</th>" +
      "<th>Fastest</th>" +
      "<th>Slowest</th>" +
      "<th>How much it varied</th>" +
      "<th>Time working</th>" +
      "<th>Time waiting</th>" +
      "<th>Times it waited</th>" +
      "<th>Busy</th>" +
      "</tr></thead><tbody>" + rows + "</tbody>";
  }


  /* ----------------------------------------------------------
     COMPARE
     ---------------------------------------------------------- */
  function renderCompare(current, head) {
    const rounds = store.archived().filter(function (r) {
      return r.header.code === head.code;
    });

    // The round on screen counts too, even before it is archived.
    const all = rounds.slice();
    if (!all.some(function (r) { return r.header.roundNo === head.roundNo; })) {
      all.push({ header: head, events: store.events() });
    }
    all.sort(function (x, y) { return x.header.roundNo - y.header.roundNo; });

    if (all.length < 2) {
      el.compareWrap.innerHTML =
        '<div class="fl-notice fl-notice-info">' +
        "<b>One round so far.</b> Run a second one after the class has agreed " +
        "on an improvement, and this tab fills with the before-and-after. " +
        "That comparison is the whole reason for the first round." +
        "</div>";
      return;
    }

    const analyses = all.map(function (r) {
      return { head: r.header, a: A.analyse(store.build(r.events, r.header)) };
    });

    const first = analyses[0];
    const last = analyses[analyses.length - 1];
    const cmp = A.compare(first.a, last.a);

    /* Two separate signals, and keeping them separate is the
       whole point of this table:

         THE ARROW says which way the number moved.
         THE COLOUR says whether that was good.

       They are not the same thing. Output going UP is good;
       lead time going up is bad. Tying the arrow to "better"
       would draw a down-arrow beside a rising output figure,
       which reads as a fall and teaches the opposite of what
       happened. */
    function row(label, d, format) {
      if (!d) return "";
      const rose = d.change > 0;
      const arrow = d.same ? "→" : (rose ? "▲" : "▼");
      const colour = d.same ? "var(--fl-ink-faint)"
                            : (d.better ? "var(--fl-good)" : "var(--fl-reject)");
      const pctText = (rose ? "+" : "") + Math.round(d.change * 100) + "%";

      /* Both figures in a row share one unit, chosen from the
         larger of the two. "3:25 → 96s" is a comparison the
         reader has to do arithmetic to understand; "3:25 → 1:36"
         is one they can see. */
      const fmtPair = format(Math.max(Math.abs(d.from), Math.abs(d.to)));

      return "<tr><td>" + esc(label) + "</td>" +
             "<td>" + esc(fmtPair(d.from)) + "</td>" +
             "<td>" + esc(fmtPair(d.to)) + "</td>" +
             '<td style="color:' + colour + '">' +
               arrow + " " + esc(pctText) + "</td></tr>";
    }

    /* Each of these takes the larger of the pair and hands back
       the formatter to use for both. */
    const t = function (biggest) {
      return (biggest >= 100000) ? fmt.clock : fmt.secs;
    };
    const c = function () { return fmt.clock; };
    const p = function () { return function (f) { return fmt.pct(f); }; };
    const n2 = function () {
      return function (v) { return isNum(v) ? v.toFixed(2) : "—"; };
    };
    const n1 = function () {
      return function (v) { return isNum(v) ? v.toFixed(1) : "—"; };
    };

    el.compareWrap.innerHTML =
      '<div class="fl-panel"><div class="fl-panel-title">Round ' +
        first.head.roundNo + " against round " + last.head.roundNo + "</div>" +
      (cmp.bottleneckMoved
        ? '<div class="fl-notice fl-notice-info">The bottleneck <b>moved</b> — from ' +
          esc(cmp.bottleneckBefore.name) + " to " + esc(cmp.bottleneckAfter.name) +
          ". That is what success looks like: fixing the slowest station promotes " +
          "the next one, and the improvement never finishes.</div>"
        : (cmp.bottleneckAfter
            ? '<div class="fl-notice fl-notice-warn"><b>' + esc(cmp.bottleneckAfter.name) +
              " is still the bottleneck.</b> Whatever changed, it did not change " +
              "the constraint. Look again at what that station actually does.</div>"
            : "")) +
      '<div class="fl-table-wrap"><table class="fl-table">' +
      "<thead><tr><th>Measure</th><th>Round " + first.head.roundNo +
        "</th><th>Round " + last.head.roundNo + "</th><th>Change</th></tr></thead><tbody>" +
      row("Total run time", cmp.runWindow, c) +
      row("Average time per plane", cmp.leadTime, t) +
      row("One plane leaves every", cmp.lineCycle, t) +
      row("Output, planes per minute", cmp.throughput, n2) +
      row("Time waiting per plane", cmp.waiting, t) +
      row("Team time spent waiting", cmp.starve, c) +
      row("Planes stuck in the line", cmp.wip, n1) +
      row("Real work vs waiting", cmp.pce, p) +
      row("Line balance", cmp.balance, p) +
      row("First Pass Yield", cmp.fpy, p) +
      "</tbody></table></div></div>" +
      chartBox("Station times, round against round",
               "Faded bars are the first round, solid the latest.",
               charts.roundCompare(cmp)) +
      renderRoundList(analyses);
  }

  function renderRoundList(analyses) {
    const rows = analyses.map(function (r) {
      return "<tr><td>Round " + r.head.roundNo + "</td>" +
        "<td>" + r.a.line.completed + " / " + r.a.line.itemCount + "</td>" +
        "<td>" + esc(fmt.clock(r.a.line.runWindowMs)) + "</td>" +
        "<td>" + esc(fmt.secs(r.a.line.avgLeadMs)) + "</td>" +
        "<td>" + esc(fmt.secs(r.a.line.lineCycleMs)) + "</td>" +
        "<td>" + esc(fmt.pct(r.a.line.pce)) + "</td>" +
        "<td>" + esc(fmt.pct(r.a.line.fpy)) + "</td>" +
        "<td>" + (r.a.line.bottleneck ? esc(r.a.line.bottleneck.name) : "—") + "</td>" +
        "</tr>";
    }).join("");

    return '<div class="fl-panel"><div class="fl-panel-title">Every round on this line</div>' +
      '<div class="fl-table-wrap"><table class="fl-table"><thead><tr>' +
      "<th>Round</th><th>Finished</th><th>Run time</th><th>Per plane</th>" +
      "<th>Line cycle</th><th>Work vs wait</th><th>FPY</th><th>Bottleneck</th>" +
      "</tr></thead><tbody>" + rows + "</tbody></table></div></div>";
  }


  /* ----------------------------------------------------------
     IMPROVE — what the class decides between rounds
     ---------------------------------------------------------- */
  function renderImprove(head) {
    if (el.notes.value !== (head.notes || "")) el.notes.value = head.notes || "";
  }

  let notesTimer = null;
  el.notes.addEventListener("input", function () {
    store.setNotes(el.notes.value);
    el.notesState.textContent = "Saving…";
    clearTimeout(notesTimer);
    // Waiting for a pause in typing means one upload per thought
    // rather than one per keystroke.
    notesTimer = setTimeout(async function () {
      const head = store.header();
      if (head && !head.solo && sheets.isConfigured()) {
        const res = await sheets.saveNotes(head.code, head.roundNo, head.notes);
        el.notesState.textContent = res.ok ? "Saved to the sheet" : "Saved on this device";
      } else {
        el.notesState.textContent = "Saved on this device";
      }
    }, 900);
  });


  /* ----------------------------------------------------------
     DATA — the raw grid, and the place to fix a bad tap
     ---------------------------------------------------------- */
  function renderData(a, head) {
    const heads = a.stations.map(function (s) {
      return '<th><span class="fl-swatch" style="background:' + s.colour + '"></span>' +
             esc(s.key) + "</th>";
    }).join("");

    let rows = "";
    for (let i = 0; i < a.itemCount; i++) {
      const item = a.perItem[i];
      const cells = a.stations.map(function (s, sIdx) {
        const v = a.exits[sIdx][i];
        const proc = a.proc[sIdx][i];
        if (typeof v !== "number") return '<td class="is-muted">—</td>';
        return '<td><button type="button" class="fl-cell" data-edit="' + sIdx + "," + i +
               '" title="Click to correct this time">' +
               esc(fmt.clock(v)) +
               (isNum(proc) ? ' <span class="is-muted">(' + esc(fmt.secs(proc)) + ")</span>" : "") +
               "</button></td>";
      }).join("");

      rows += '<tr class="' + (item.verdict === "reject" ? "is-reject" : "") + '">' +
        "<td>#" + (i + 1) + "</td>" + cells +
        "<td>" + esc(fmt.secs(item.leadMs)) + "</td>" +
        "<td>" + esc(fmt.secs(item.vaMs)) + "</td>" +
        "<td>" + esc(fmt.secs(item.waitMs)) + "</td>" +
        "<td>" + esc(fmt.pct(item.pce)) + "</td>" +
        '<td><button type="button" class="fl-cell" data-verdict="' + i + '">' +
          (item.verdict === "reject"
            ? "✕ reject" + (item.cause !== null && a.stations[item.cause]
                ? " (" + esc(a.stations[item.cause].key) + ")" : "")
            : item.verdict === "pass" ? "✓ pass" : "—") +
        "</button></td></tr>";
    }

    el.itemTable.innerHTML =
      "<thead><tr><th>Plane</th>" + heads +
      "<th>Total time</th>" +
      "<th>Being worked on</th>" +
      "<th>Sat waiting</th>" +
      "<th>Real work</th>" +
      "<th>Passed?</th>" +
      "</tr></thead><tbody>" + rows + "</tbody>";

    Array.prototype.forEach.call(el.itemTable.querySelectorAll("[data-edit]"), function (b) {
      b.addEventListener("click", function () {
        const parts = b.getAttribute("data-edit").split(",");
        editTime(parseInt(parts[0], 10), parseInt(parts[1], 10));
      });
    });
    Array.prototype.forEach.call(el.itemTable.querySelectorAll("[data-verdict]"), function (b) {
      b.addEventListener("click", function () {
        askVerdict(parseInt(b.getAttribute("data-verdict"), 10));
      });
    });
  }

  /* Correcting a time appends an "edit" event rather than changing
     anything, so the original tap is still in the log and the
     correction is visible as a correction. */
  function editTime(stationIndex, itemIndex) {
    const evs = store.events();
    const cancelled = {};
    evs.forEach(function (e) { if (e.k === "undo" && e.t) cancelled[e.t] = true; });

    let target = null;
    evs.forEach(function (e) {
      if (e.k === "done" && e.st === stationIndex && e.item === itemIndex && !cancelled[e.id]) {
        target = e;
      }
    });
    if (!target) return;

    const a = A.analyse(store.build());
    const current = a.exits[stationIndex][itemIndex];
    const answer = prompt(
      "Corrected finish time for " + config.STATIONS[stationIndex].name +
      ", plane " + (itemIndex + 1) + ".\n\n" +
      "Type it as minutes:seconds from the start of the round, e.g. 4:35.\n" +
      "Leave it empty and press OK to delete this reading instead.",
      fmt.clock(current));

    if (answer === null) return;

    if (answer.trim() === "") {
      if (confirm("Remove this reading altogether?")) {
        store.undo(target.id);
        lastSignature = ""; renderAll(); store.flush();
      }
      return;
    }

    const ms = parseClock(answer);
    if (ms === null) {
      alert("That did not look like a time. Use minutes:seconds, e.g. 4:35.");
      return;
    }

    store.editTime(target.id, ms);
    lastSignature = ""; renderAll(); store.flush();
  }

  /* "4:35" -> 275000. Also accepts a plain number of seconds. */
  function parseClock(str) {
    const s = String(str).trim();
    if (/^\d+$/.test(s)) return parseInt(s, 10) * 1000;
    const m = s.match(/^(\d+):([0-5]?\d)(?:\.(\d+))?$/);
    if (!m) return null;
    return (parseInt(m[1], 10) * 60 + parseInt(m[2], 10)) * 1000 +
           (m[3] ? Math.round(parseFloat("0." + m[3]) * 1000) : 0);
  }


  /* ==========================================================
     EXPORT, PRINT, DISPLAY MODE
     ========================================================== */
  $("exportBtn").addEventListener("click", function () {
    const head = store.header();
    if (!head) return;
    const a = A.analyse(store.build());
    const csv = store.toCsv(a, head);

    /* A BOM at the front is what makes Excel open a UTF-8 CSV
       correctly rather than mangling anything non-ASCII. */
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "flight-line-" + head.code + "-round" + head.roundNo + ".csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });

  $("printBtn").addEventListener("click", function () {
    if (activeTab !== "analysis") setTab("analysis");
    setTimeout(function () { window.print(); }, 220);
  });

  $("displayBtn").addEventListener("click", async function () {
    const on = !el.body.classList.contains("fl-display");
    el.body.classList.toggle("fl-display", on);
    $("displayBtn").textContent = on ? "Leave display mode" : "Display mode";

    try {
      if (on && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if (!on && document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (e) {
      // Full screen was refused — the layout change alone is still
      // most of the benefit, so this is not worth reporting.
    }
  });

  document.addEventListener("fullscreenchange", function () {
    if (!document.fullscreenElement && el.body.classList.contains("fl-display")) {
      el.body.classList.remove("fl-display");
      $("displayBtn").textContent = "Display mode";
    }
  });


  /* ==========================================================
     JOIN LINKS — what the students type into their phones
     ========================================================== */
  function renderJoinLinks() { buildJoinLinks(); }

  /* ----------------------------------------------------------
     WHAT A STUDENT ACTUALLY TYPES
     ----------------------------------------------------------
     The link always POINTS at the real file, so clicking it works
     everywhere. What is DISPLAYED is the shortest thing that will
     work from where this page is being served:

       on the deployed site   farizuljaafar.com/line/b
       anywhere else          .../production-coordination/line5/station-b.html

     The short form is a rewrite in vercel.json. It does not exist
     on a local http-server, so showing it while testing on
     localhost would have the teacher write a dead URL on the
     whiteboard. Hence the check rather than a constant.
     ---------------------------------------------------------- */
  function buildJoinLinks() {
    const base = location.href.replace(/[^/]*$/, "") + "line5/";
    const host = location.hostname;
    const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(host) ||
                  location.protocol === "file:";

    el.joinLinks.innerHTML = config.STATIONS.map(function (st) {
      const letter = st.key.toLowerCase();
      const href = base + "station-" + letter + ".html";
      const shown = local
        ? href.replace(/^https?:\/\//, "")
        : host + "/line/" + letter;

      return '<div class="fl-join-card" style="--st-colour:' + st.colour + '">' +
        "<b>" + esc(st.key + " · " + st.name) + "</b>" +
        '<a class="fl-join-url" href="' + esc(href) + '" target="_blank" ' +
        'rel="noopener">' + esc(shown) + "</a></div>";
    }).join("");
  }
  buildJoinLinks();


  /* ==========================================================
     ODDS AND ENDS
     ========================================================== */
  function renderConn() {
    const head = store.header();
    const pending = store.outboxSize();
    const c = clock.status();

    if (!head) { el.connPill.hidden = true; return; }
    el.connPill.hidden = false;

    if (head.solo) {
      el.connPill.className = "fl-pill fl-pill-idle";
      el.connPill.textContent = "Solo · nothing to sync";
      return;
    }
    if (!sheets.isConfigured()) {
      el.connPill.className = "fl-pill fl-pill-warn";
      el.connPill.textContent = "No sheet connected";
      return;
    }
    if (lastPollOk === false) {
      el.connPill.className = "fl-pill fl-pill-bad";
      el.connPill.textContent = "Cannot reach the sheet";
      return;
    }

    el.connPill.className = "fl-pill fl-pill-live";
    el.connPill.textContent = "Synced" +
      (pending ? " · " + pending + " waiting" : "") +
      (c.synced && Math.abs(c.offsetMs) > 1500
        ? " · clock " + Math.round(c.offsetMs / 1000) + "s" : "");
  }

  function announce(msg) { el.live.textContent = msg; }

  function esc(s) {
    return String(s === null || s === undefined ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function isNum(v) { return typeof v === "number" && isFinite(v); }

  store.onChange(function () { renderConn(); });

  /* Space bar is a hazard on a page full of buttons — it presses
     whatever has focus. On the dashboard, the number keys 1-4 are
     given to the solo buttons instead, so a solo time-taker can
     keep both hands on the keyboard and their eyes on the line. */
  document.addEventListener("keydown", function (e) {
    const head = store.header();
    if (!head || !head.solo || head.status !== "live") return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (!$("boardVerdict").hidden) return;

    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= config.STATIONS.length) {
      const btn = el.soloBtns.children[n - 1];
      if (btn) { e.preventDefault(); btn.click(); }
    }
  });


  /* ==========================================================
     START
     ========================================================== */
  (function boot() {
    /* Put the buttons and the panel title in step with whatever
       language this device chose last time, before anything is
       drawn — otherwise a class that reads Malay sees the English
       heading flash up on every reload. */
    setFindingsLang(findingsLang);

    const head = store.header();
    if (head) {
      buildSoloButtons();
      startHeartbeats();
      // Coming back to a finished round should land on the
      // analysis, which is the only reason to reopen it.
      setTab(head.status === "ended" ? "analysis" : "live");
    }
    renderAll();

    if (sheets.isConfigured()) sheets.ping();
    sheets.recordVisit(config.PAGE, window.matchMedia("(max-width: 820px)").matches);
  })();

})();
