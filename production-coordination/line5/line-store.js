/* ============================================================
   line-store.js — WHERE THE TAPS LIVE
   ============================================================
   Every tap goes through here. It holds the round, keeps a copy
   in the browser so a dropped phone or an accidental refresh
   loses nothing, queues taps for upload, and rebuilds the whole
   line from the log when the dashboard asks.

   ============================================================
   THE RULE THAT SHAPES THE WHOLE FILE: NEVER LOSE A TAP
   ============================================================
   A student's thumb lands on the button once. There is no second
   chance to observe that moment. So the order is always:

       1. stamp it with the corrected clock
       2. write it to localStorage
       3. THEN, whenever the network feels like it, upload

   Steps 1 and 2 take under a millisecond and cannot fail for want
   of wifi. Step 3 can fail all afternoon and the data still
   survives — it is sitting in the phone, waiting, and the station
   page shows a count of how many are still queued.

   ============================================================
   WHY THE LOG IS APPEND-ONLY
   ============================================================
   Nothing is ever edited or deleted. An undo does not remove the
   tap it cancels; it appends an "undo" event that POINTS AT it.
   A time correction appends an "edit" event the same way.

   Three things fall out of that, all of which matter when five
   devices are writing at once:

     * Merging is trivial and order does not matter. Every event
       carries a globally unique id, so the same tap arriving
       twice is still one tap.
     * A phone that was offline for five minutes can upload its
       backlog at any point and the picture simply completes.
     * The sheet keeps the real history. If a student swears they
       tapped and the teacher swears they did not, the answer is
       in the log, undo and all.
   ============================================================ */

"use strict";

(function (root) {

  const config = root.LINE_CONFIG || {};
  const clock = root.LineClock;

  const KEY_DEVICE  = "flightline.device";
  const KEY_ACTIVE  = "flightline.active";
  const KEY_ARCHIVE = "flightline.archive";
  const KEY_PREFS   = "flightline.prefs";
  const KEY_STRANDED = "flightline.stranded";


  /* ==========================================================
     LOCAL STORAGE, DEFENSIVELY
     ==========================================================
     A phone in private browsing throws on the first write rather
     than politely refusing. Every access is wrapped, and a
     failure downgrades the app to "works, but forgets on
     refresh" instead of breaking it.
     ========================================================== */
  let storageWorks = true;

  function read(key, fallback) {
    try {
      const raw = root.localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      storageWorks = false;
      return fallback;
    }
  }

  function write(key, value) {
    try {
      root.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      storageWorks = false;
      return false;
    }
  }


  /* ==========================================================
     DEVICE IDENTITY
     ==========================================================
     Not a login. Just a random label so two phones tapping at the
     same instant produce different event ids, and so the log can
     say which device a tap came from when something looks wrong.
     ========================================================== */
  /* Held in a variable as well as in storage, and that is not
     belt-and-braces — it is the whole point.

     In private browsing every localStorage read fails, so without
     the cache this function would mint a BRAND NEW id on every
     call. Event ids would still be unique, so nothing would look
     broken — but "is this tap mine?" would answer no every time,
     and the Undo button on a student's phone would silently stop
     working for the whole round. */
  let cachedDeviceId = null;

  function deviceId() {
    if (cachedDeviceId) return cachedDeviceId;

    let id = read(KEY_DEVICE, null);
    if (!id) {
      id = "d" + Math.random().toString(36).slice(2, 8) +
           Date.now().toString(36).slice(-4);
      write(KEY_DEVICE, id);
    }
    cachedDeviceId = id;
    return id;
  }


  /* ==========================================================
     THE ACTIVE ROUND
     ==========================================================
     state = {
       header: {
         code, roundNo, startedAt, itemCount, stationKeys,
         taktMs, status: "idle" | "live" | "ended", notes, endedAt
       },
       events: [ ... ],
       outbox: [ ids not yet uploaded ],
       seq: 12
     }
     ========================================================== */
  const blank = {
    header: null,
    events: [],
    outbox: [],
    seq: 0,
  };

  let state = read(KEY_ACTIVE, null) || JSON.parse(JSON.stringify(blank));
  const listeners = [];

  function save() {
    write(KEY_ACTIVE, state);
  }

  function emit() {
    save();
    listeners.forEach(function (fn) {
      try { fn(); } catch (e) { /* a broken listener must not stop the rest */ }
    });
  }

  function onChange(fn) {
    listeners.push(fn);
    return function () {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };
  }

  function header() { return state.header; }
  function events() { return state.events; }

  function isLive() {
    return !!(state.header && state.header.status === "live");
  }

  /* Elapsed milliseconds since the round's zero, on the corrected
     clock. Null before a round starts, so callers show a dash. */
  function elapsed() {
    if (!state.header || typeof state.header.startedAt !== "number") return null;
    return clock.now() - state.header.startedAt;
  }


  /* ----------------------------------------------------------
     Opening a round.
     ----------------------------------------------------------
     startedAt comes from the SERVER in team mode, so five devices
     count from one instant. In solo mode there is only one clock
     in the room, so this device's own is correct by definition.
     ---------------------------------------------------------- */
  function openRound(headerIn) {
    state = {
      header: {
        code: String(headerIn.code || "").toUpperCase(),
        roundNo: headerIn.roundNo || 1,
        startedAt: headerIn.startedAt,
        itemCount: headerIn.itemCount || config.ITEM_COUNT || 20,
        stationKeys: headerIn.stationKeys ||
          (config.STATIONS || []).map(function (s) { return s.key; }),
        taktMs: typeof headerIn.taktMs === "number" ? headerIn.taktMs : null,
        status: headerIn.status || "live",
        notes: headerIn.notes || "",
        endedAt: headerIn.endedAt || null,
        solo: !!headerIn.solo,
      },
      events: [],
      outbox: [],
      seq: 0,
    };
    emit();
    return state.header;
  }

  /* Adopt a round the dashboard started, as seen by a station
     phone. Keeps any taps this device has already made — which
     matters if a station started tapping before its poll caught
     up with the round header. */
  function adoptRound(headerIn) {
    const sameRound = state.header &&
      state.header.code === String(headerIn.code || "").toUpperCase() &&
      state.header.roundNo === headerIn.roundNo;

    if (sameRound) {
      Object.assign(state.header, {
        startedAt: headerIn.startedAt,
        itemCount: headerIn.itemCount || state.header.itemCount,
        taktMs: typeof headerIn.taktMs === "number" ? headerIn.taktMs : state.header.taktMs,
        status: headerIn.status || state.header.status,
        notes: headerIn.notes !== undefined ? headerIn.notes : state.header.notes,
        endedAt: headerIn.endedAt || state.header.endedAt,
      });
      emit();
      return state.header;
    }

    // A genuinely different round. Archive whatever is here first
    // so a station phone that never saw "end round" does not throw
    // its afternoon away.
    if (state.header && state.events.length) {
      archiveCurrent();
      // The archive is for THIS device to read back. Anything
      // still unsent needs to reach the sheet under its own
      // round number, so it is moved aside before openRound
      // resets the outbox.
      strandOutbox();
    }
    return openRound(headerIn);
  }

  function setStatus(status) {
    if (!state.header) return;
    state.header.status = status;
    if (status === "ended" && !state.header.endedAt) {
      state.header.endedAt = clock.now();
    }
    emit();
  }

  function setNotes(text) {
    if (!state.header) return;
    state.header.notes = text;
    emit();
  }


  /* ==========================================================
     APPENDING
     ==========================================================
     The only way anything enters the log.
     ========================================================== */
  function append(partial) {
    if (!state.header) return null;

    state.seq += 1;
    const ev = Object.assign({
      id: deviceId() + "-" + state.seq,
      seq: state.seq,
      at: clock.now(),
    }, partial);

    state.events.push(ev);
    state.outbox.push(ev.id);
    emit();
    return ev;
  }

  /* A station finished a plane. This is the tap. */
  function recordDone(stationIndex, itemIndex, elapsedMs) {
    return append({
      k: "done",
      st: stationIndex,
      item: itemIndex,
      ms: Math.max(0, Math.round(elapsedMs)),
    });
  }

  /* Pass or reject, recorded after the tap so that deciding takes
     as long as it needs to without affecting the time. */
  function recordVerdict(itemIndex, verdict, causeStation) {
    return append({
      k: "verdict",
      item: itemIndex,
      v: verdict,
      c: (typeof causeStation === "number") ? causeStation : null,
    });
  }

  /* Cancel an earlier event by pointing at it. */
  function undo(targetId) {
    if (!targetId) return null;
    return append({ k: "undo", t: targetId });
  }

  /* Correct a recorded time without destroying the original. */
  function editTime(targetId, newMs) {
    return append({ k: "edit", t: targetId, ms: Math.max(0, Math.round(newMs)) });
  }

  /* Events from the sheet. Ignores anything already known, so
     polling the same round every ten seconds costs nothing. */
  function mergeEvents(incoming) {
    if (!incoming || !incoming.length) return 0;

    const known = {};
    state.events.forEach(function (e) { known[e.id] = true; });

    let added = 0;
    incoming.forEach(function (e) {
      if (!e || !e.id || known[e.id]) return;
      known[e.id] = true;
      state.events.push(e);
      added++;
    });

    if (added) {
      // Keep the log in a sensible order for reading and export.
      state.events.sort(function (a, b) {
        if (a.at !== b.at) return (a.at || 0) - (b.at || 0);
        return String(a.id) < String(b.id) ? -1 : 1;
      });
      emit();
    }
    return added;
  }


  /* ==========================================================
     THE OUTBOX
     ==========================================================
     Taps waiting to be uploaded. Kept as a list of ids rather
     than copies of the events, so there is exactly one version of
     each tap in memory and no chance of the two drifting apart.
     ========================================================== */
  function outboxSize() { return state.outbox.length; }

  function pendingEvents() {
    const byId = {};
    state.events.forEach(function (e) { byId[e.id] = e; });
    return state.outbox
      .map(function (id) { return byId[id]; })
      .filter(Boolean);
  }

  function clearFromOutbox(ids) {
    const gone = {};
    ids.forEach(function (id) { gone[id] = true; });
    state.outbox = state.outbox.filter(function (id) { return !gone[id]; });
    emit();
  }

  /* Try to upload everything waiting. Safe to call as often as
     you like: it does nothing when the outbox is empty, when
     there is no sheet, or when a previous attempt is still in
     flight. */
  let flushing = false;

  /* ----------------------------------------------------------
     TAPS ORPHANED BY A ROUND CHANGE
     ----------------------------------------------------------
     A phone that was offline when the teacher started the next
     round adopts the new one and, until now, took its unsent taps
     with it into oblivion — openRound resets the outbox, and the
     archived copy is never uploaded by anything.

     So before that happens they are moved here, tagged with the
     round they actually belong to, and flush() drains this queue
     first. A student who taps twenty planes behind a machine-shop
     wall still gets all twenty into the sheet, under the right
     round, whenever their phone finds the wifi again.
     ---------------------------------------------------------- */
  function stranded() { return read(KEY_STRANDED, []); }

  function strandOutbox() {
    if (!state.header || state.header.solo) return;
    const pending = pendingEvents();
    if (!pending.length) return;

    const list = stranded();
    list.push({
      code: state.header.code,
      roundNo: state.header.roundNo,
      events: JSON.parse(JSON.stringify(pending)),
    });

    // A term's worth of abandoned batches is not worth keeping.
    while (list.length > 10) list.shift();
    write(KEY_STRANDED, list);
  }

  async function flushStranded() {
    const list = stranded();
    if (!list.length) return;

    const group = list[0];
    const res = await root.LineSheets.pushEvents(
      group.code, group.roundNo, group.events
    );

    // One group per cycle. They are already late; there is no
    // value in hammering the sheet to catch up in one go.
    if (res.ok) {
      list.shift();
      write(KEY_STRANDED, list);
    }
  }

  async function flush() {
    if (flushing) return { ok: true, skipped: true };
    if (!root.LineSheets || !root.LineSheets.isConfigured()) {
      return { ok: false, offline: true };
    }

    flushing = true;

    try {
      // Orphans first — they belong to a round that has moved on
      // and nothing else will ever carry them.
      await flushStranded();

      if (!state.header) return { ok: true, skipped: true };

      /* ------------------------------------------------------
         A SOLO ROUND MUST NEVER REACH THE SHEET
         ------------------------------------------------------
         Solo mode invents its own round number locally, because
         there is no server to ask. If those taps were uploaded
         they would land under a number the server has not issued
         yet — and will later hand to a real team round, which
         then reads back a mixture of two different classes'
         aeroplanes with no way to tell them apart.

         The sheet is only ever written by a round the server
         itself opened. Solo data lives and dies on this machine,
         which is exactly what the "Solo · nothing to sync" badge
         promises.
         ------------------------------------------------------ */
      if (state.header.solo) return { ok: true, skipped: true };
      if (!state.outbox.length) return { ok: true, sent: 0 };

      const batch = pendingEvents();
      const ids = batch.map(function (e) { return e.id; });

      const result = await root.LineSheets.pushEvents(
        state.header.code, state.header.roundNo, batch
      );
      if (result.ok) {
        /* Clear only what the sheet says it actually wrote.
           ------------------------------------------------------
           doEvents caps a batch at 200 rows and keeps the FIRST
           200, reporting the count back as "saved". A phone that
           was offline for a long stretch can exceed that, and
           clearing the whole outbox on a truncated write would
           throw away the overflow silently — the one thing this
           file exists to prevent. Anything the server did not
           take stays queued for the next cycle. */
        const saved = (result.data && typeof result.data.saved === "number")
          ? Math.max(0, Math.min(result.data.saved, ids.length))
          : ids.length;

        clearFromOutbox(ids.slice(0, saved));
        return { ok: true, sent: saved, held: ids.length - saved };
      }
      return { ok: false, error: result.error, retryable: result.retryable };
    } finally {
      flushing = false;
    }
  }


  /* ==========================================================
     REBUILDING THE LINE FROM THE LOG
     ==========================================================
     Everything the analytics needs, worked out from the events.
     Called every render, so it is written to be cheap.
     ========================================================== */
  function build(fromEvents, fromHeader) {
    const evs = fromEvents || state.events;
    const head = fromHeader || state.header;

    const stations = (config.STATIONS || []).slice();
    const itemCount = (head && head.itemCount) || config.ITEM_COUNT || 20;

    const exits = stations.map(function () { return []; });
    const verdicts = {};

    if (!evs.length) {
      return {
        stations: stations,
        itemCount: itemCount,
        exits: exits,
        verdicts: verdicts,
        taktMs: head ? head.taktMs : null,
      };
    }

    /* Pass one: which events have been cancelled, and which have
       had their time corrected. Later events win, so the list is
       walked in order. */
    const cancelled = {};
    const corrected = {};

    evs.forEach(function (e) {
      if (e.k === "undo" && e.t) cancelled[e.t] = true;
      else if (e.k === "edit" && e.t) corrected[e.t] = e.ms;
    });

    /* An undo of an undo puts the original back. Rare, but a
       student who over-corrects should not be stuck. */
    evs.forEach(function (e) {
      if (e.k === "undo" && cancelled[e.id] && e.t) delete cancelled[e.t];
    });

    /* Pass two: lay the surviving events into the grid. */
    const doneByStation = stations.map(function () { return []; });

    evs.forEach(function (e) {
      if (cancelled[e.id]) return;

      if (e.k === "done") {
        if (typeof e.st !== "number" || !doneByStation[e.st]) return;
        doneByStation[e.st].push({
          item: e.item,
          ms: (corrected[e.id] !== undefined) ? corrected[e.id] : e.ms,
        });
      } else if (e.k === "verdict") {
        verdicts[e.item] = {
          verdict: e.v,
          cause: (typeof e.c === "number") ? e.c : null,
        };
      }
    });

    doneByStation.forEach(function (list, s) {
      list.forEach(function (d) {
        if (typeof d.item === "number" && d.item >= 0 && d.item < itemCount) {
          exits[s][d.item] = d.ms;
        }
      });
    });

    return {
      stations: stations,
      itemCount: itemCount,
      exits: exits,
      verdicts: verdicts,
      taktMs: head ? head.taktMs : null,
    };
  }

  /* How many planes has this station finished? Counts only living
     events, so an undo really does step the counter back. */
  function doneCount(stationIndex) {
    const grid = build();
    const row = grid.exits[stationIndex] || [];
    let n = 0;
    for (let i = 0; i < row.length; i++) {
      if (typeof row[i] === "number") n++;
    }
    return n;
  }

  /* ----------------------------------------------------------
     WHICH PLANE IS THIS STATION ABOUT TO FINISH?
     ----------------------------------------------------------
     One past the highest it has already recorded — NOT the count
     of what it has recorded, which is a different number the
     moment there is a hole.

     Undoing the LAST tap gives the same answer either way, and
     that is the common case. But the dashboard's Data tab can
     delete ANY reading. Delete plane 3 of ten and the count drops
     to nine, so a count-based next index would be 9 — and the
     next tap would silently overwrite plane 10, destroying a good
     reading to replace a deleted one.

     Going one past the highest leaves the hole where it is. The
     analysis already knows how to report a hole; it has no way to
     notice an overwrite.
     ---------------------------------------------------------- */
  function nextItemIndex(stationIndex) {
    const grid = build();
    const row = grid.exits[stationIndex] || [];
    let highest = -1;
    for (let i = 0; i < row.length; i++) {
      if (typeof row[i] === "number" && i > highest) highest = i;
    }
    return highest + 1;
  }

  /* The most recent living "done" this device recorded for a
     station — the thing an Undo button would cancel. Only this
     device's own taps, so nobody can undo somebody else's work. */
  function lastOwnDone(stationIndex) {
    const mine = deviceId();
    const cancelled = {};
    state.events.forEach(function (e) {
      if (e.k === "undo" && e.t) cancelled[e.t] = true;
    });

    for (let i = state.events.length - 1; i >= 0; i--) {
      const e = state.events[i];
      if (e.k !== "done") continue;
      if (e.st !== stationIndex) continue;
      if (cancelled[e.id]) continue;
      if (String(e.id).indexOf(mine + "-") !== 0) continue;
      return e;
    }
    return null;
  }


  /* ==========================================================
     THE ARCHIVE — WHAT MAKES ROUND 2 WORTH RUNNING
     ==========================================================
     A finished round is copied here so the comparison tab has
     something to compare against. Kept in this browser, so the
     dashboard machine accumulates the class's rounds over the
     lesson.
     ========================================================== */
  function archived() {
    return read(KEY_ARCHIVE, []);
  }

  function archiveCurrent() {
    if (!state.header) return null;

    const list = archived();
    const entry = {
      header: JSON.parse(JSON.stringify(state.header)),
      events: JSON.parse(JSON.stringify(state.events)),
      savedAt: Date.now(),
    };

    /* Re-archiving the same round replaces it rather than piling
       up duplicates — the dashboard saves on every "end round"
       and the teacher may press it twice. */
    const i = list.findIndex(function (r) {
      return r.header.code === entry.header.code &&
             r.header.roundNo === entry.header.roundNo;
    });
    if (i >= 0) list[i] = entry; else list.push(entry);

    /* Twenty rounds is a term's worth. Beyond that the oldest go,
       because localStorage is not infinite and a full one throws. */
    while (list.length > 20) list.shift();

    write(KEY_ARCHIVE, list);
    return entry;
  }

  function forgetArchived(code, roundNo) {
    const list = archived().filter(function (r) {
      return !(r.header.code === code && r.header.roundNo === roundNo);
    });
    write(KEY_ARCHIVE, list);
  }

  function clearActive() {
    state = JSON.parse(JSON.stringify(blank));
    emit();
  }

  /* What round number should the next round have? One past the
     highest this browser has seen for that code. */
  function nextRoundNo(code) {
    const upper = String(code || "").toUpperCase();
    let highest = 0;
    archived().forEach(function (r) {
      if (r.header.code === upper && r.header.roundNo > highest) {
        highest = r.header.roundNo;
      }
    });
    if (state.header && state.header.code === upper &&
        state.header.roundNo > highest) {
      highest = state.header.roundNo;
    }
    return highest + 1;
  }


  /* ==========================================================
     PREFERENCES
     ==========================================================
     Which station this phone is, and which line it joined, so a
     student sets it once and a refresh does not send them back to
     the beginning.
     ========================================================== */
  function prefs() { return read(KEY_PREFS, {}); }

  function setPref(key, value) {
    const p = prefs();
    p[key] = value;
    write(KEY_PREFS, p);
  }


  /* ==========================================================
     EXPORT
     ==========================================================
     One row per plane per station, with everything derived
     alongside the raw time, so a student can open it in Excel and
     check the arithmetic by hand. Which some of them will, and
     should.
     ========================================================== */
  function toCsv(analysis, head) {
    const rows = [];
    const q = function (v) {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };

    rows.push([
      "line_code", "round", "plane", "station", "station_name",
      "started_s", "finished_s", "process_s",
      "queued_before_s", "station_waited_s",
      "lead_time_s", "value_added_s", "waiting_s", "verdict", "cause",
    ].join(","));

    const A = root.LineAnalytics;
    for (let i = 0; i < analysis.itemCount; i++) {
      const item = analysis.perItem[i];
      for (let s = 0; s < analysis.stations.length; s++) {
        if (analysis.exits[s][i] === undefined || analysis.exits[s][i] === null) continue;
        rows.push([
          q(head.code), q(head.roundNo), q(i + 1),
          q(analysis.stations[s].key), q(analysis.stations[s].name),
          q(sec(analysis.start[s][i])), q(sec(analysis.exits[s][i])),
          q(sec(analysis.proc[s][i])),
          q(sec(analysis.queue[s][i])), q(sec(analysis.starve[s][i])),
          q(s === analysis.stations.length - 1 ? sec(item.leadMs) : ""),
          q(s === analysis.stations.length - 1 ? sec(item.vaMs) : ""),
          q(s === analysis.stations.length - 1 ? sec(item.waitMs) : ""),
          q(s === analysis.stations.length - 1 ? (item.verdict || "") : ""),
          q(s === analysis.stations.length - 1 && item.cause !== null && item.cause !== undefined
              ? analysis.stations[item.cause].name : ""),
        ].join(","));
      }
    }

    function sec(ms) {
      return (typeof ms === "number" && isFinite(ms)) ? (ms / 1000).toFixed(1) : "";
    }

    return rows.join("\n");
  }


  root.LineStore = {
    deviceId: deviceId,
    storageWorks: function () { return storageWorks; },

    onChange: onChange,
    header: header,
    events: events,
    isLive: isLive,
    elapsed: elapsed,

    openRound: openRound,
    adoptRound: adoptRound,
    setStatus: setStatus,
    setNotes: setNotes,
    clearActive: clearActive,
    nextRoundNo: nextRoundNo,
    nextItemIndex: nextItemIndex,

    recordDone: recordDone,
    recordVerdict: recordVerdict,
    undo: undo,
    editTime: editTime,
    mergeEvents: mergeEvents,

    outboxSize: outboxSize,
    strandedCount: function () {
      return stranded().reduce(function (n, g) { return n + g.events.length; }, 0);
    },
    pendingEvents: pendingEvents,
    flush: flush,

    build: build,
    doneCount: doneCount,
    lastOwnDone: lastOwnDone,

    archived: archived,
    archiveCurrent: archiveCurrent,
    forgetArchived: forgetArchived,

    prefs: prefs,
    setPref: setPref,

    toCsv: toCsv,
  };

})(typeof window !== "undefined" ? window : globalThis);
