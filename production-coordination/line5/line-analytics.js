/* ============================================================
   line-analytics.js — TURNING TAPS INTO LEAN NUMBERS
   ============================================================
   Every calculation on the dashboard happens in this one file,
   and nothing in this file touches the screen or the network. It
   takes a round of recorded times in, and gives numbers back.

   That separation is on purpose. The maths is the part that must
   be right — a wrong bottleneck sends the class off improving the
   wrong station — so it is kept where it can be tested on its
   own. line-tests.js does exactly that, with worked examples you
   can check by hand.

   ============================================================
   THE ONE IDEA THE WHOLE FILE RESTS ON
   ============================================================
   Each station records ONE time per plane: the moment it finished
   it. Nobody records when a station started. We do not need it,
   because a station can only begin a plane when TWO things are
   both true:

       1. it has finished the previous plane, and
       2. the plane has arrived from the station upstream.

   So the start is simply the later of those two:

       start = max( my previous finish , upstream's finish )

   And that single line of arithmetic is what separates the two
   kinds of lost time that lean cares about:

     - If the UPSTREAM finish is later, the station sat there with
       nothing to do. That is STARVING — waiting for the next
       plane to arrive.
     - If MY OWN previous finish is later, the plane sat in a pile
       waiting for me. That is QUEUING — the waste the students
       can see with their own eyes, growing on the desk.

   Exactly one of those two is happening at any handover, never
   both, which is why "max" is the whole story. They are two
   descriptions of the same gap, told from opposite ends: the
   station's story and the plane's story.

   ------------------------------------------------------------
   WHAT THIS ASSUMES, AND WHERE IT IS BLIND
   ------------------------------------------------------------
   It assumes a station picks up the next plane the moment it can.
   If a student finishes, chats for twenty seconds and then
   starts, those twenty seconds are counted as PROCESS time on the
   next plane rather than idle time — the tap log cannot tell the
   difference.

   That is worth saying out loud to the class rather than hiding.
   It is also the honest answer to "why is my station's average so
   high?" — sometimes the answer really is the chatting.
   ============================================================ */

"use strict";

(function (root) {

  /* ==========================================================
     SMALL HELPERS
     ========================================================== */

  function isNum(v) {
    return typeof v === "number" && isFinite(v);
  }

  function mean(list) {
    if (!list.length) return null;
    let total = 0;
    for (let i = 0; i < list.length; i++) total += list[i];
    return total / list.length;
  }

  /* Sample standard deviation (divides by n-1). With one reading
     there is no spread to speak of, so it returns null rather
     than a misleading zero. */
  function stdev(list) {
    if (list.length < 2) return null;
    const m = mean(list);
    let sum = 0;
    for (let i = 0; i < list.length; i++) sum += (list[i] - m) * (list[i] - m);
    return Math.sqrt(sum / (list.length - 1));
  }

  function median(list) {
    if (!list.length) return null;
    const s = list.slice().sort(function (a, b) { return a - b; });
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }

  function sum(list) {
    let t = 0;
    for (let i = 0; i < list.length; i++) t += list[i];
    return t;
  }


  /* ==========================================================
     FORMATTING
     ==========================================================
     Shared by the charts, the dashboard and the CSV, so a
     duration is written the same way everywhere.
     ========================================================== */

  /* 95000 -> "1:35". Durations and clock readings both use this,
     because on a line the clock IS the elapsed time. */
  function clock(ms) {
    if (!isNum(ms)) return "—";
    const negative = ms < 0;
    const totalSec = Math.round(Math.abs(ms) / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return (negative ? "-" : "") + mins + ":" + (secs < 10 ? "0" : "") + secs;
  }

  /* 5000 -> "5.0s", 95000 -> "95s", 282000 -> "4:42".
     ------------------------------------------------------------
     A station cycle is naturally read in seconds — "32s" is
     immediately meaningful and "0:32" is not. A lead time of
     282 seconds is the opposite: nobody converts that in their
     head, and "4:42" is instantly a length of time.

     So the unit changes with the size, at a hundred seconds,
     which is about where the eye stops counting in seconds. */
  function secs(ms) {
    if (!isNum(ms)) return "—";
    const s = ms / 1000;
    if (Math.abs(s) < 10) return s.toFixed(1) + "s";
    if (Math.abs(s) < 100) return Math.round(s) + "s";
    return clock(ms);
  }

  function pct(fraction, digits) {
    if (!isNum(fraction)) return "—";
    return (fraction * 100).toFixed(digits === undefined ? 0 : digits) + "%";
  }


  /* ==========================================================
     THE ANALYSIS
     ==========================================================
     round = {
       stations:  [{key,name,colour}, ...]   in flow order
       itemCount: 20
       exits:     [ [ms, ms, ...], ... ]     one array per station,
                                             elapsed ms from the
                                             round's zero, in item
                                             order. Holes are null.
       verdicts:  { 3: {verdict:"reject", cause:1}, ... }
       taktMs:    90000 or null
     }

     Everything below copes with a round that is still running —
     the dashboard calls it every few seconds while the class
     works, so a half-finished line must produce half an answer
     rather than an error.
     ========================================================== */

  function analyse(round) {
    const stations = round.stations || [];
    const S = stations.length;
    const N = round.itemCount || 0;
    const exits = round.exits || [];

    /* --------------------------------------------------------
       STEP 1 — read the raw grid
       -------------------------------------------------------- */
    function exitAt(s, i) {
      const row = exits[s];
      if (!row) return null;
      const v = row[i];
      return isNum(v) ? v : null;
    }

    /* --------------------------------------------------------
       STEP 2 — derive the starts, and from them everything else
       --------------------------------------------------------
       See the note at the top of the file. One line of maths,
       and the two kinds of lost time fall out of it.
       -------------------------------------------------------- */
    const start = [];
    const proc = [];
    const queue = [];
    const starve = [];
    const problems = [];

    for (let s = 0; s < S; s++) {
      start[s] = [];
      proc[s] = [];
      queue[s] = [];
      starve[s] = [];

      for (let i = 0; i < N; i++) {
        const myExit = exitAt(s, i);
        start[s][i] = null;
        proc[s][i] = null;
        queue[s][i] = null;
        starve[s][i] = null;

        if (myExit === null) continue;

        // When was I free? At my previous finish; at zero for the
        // first plane, because the round starts with every station
        // empty and waiting.
        const freeAt = (i === 0) ? 0 : exitAt(s, i - 1);

        // When did the plane reach me? At zero for the first
        // station, because the paper is already on the desk.
        const arrivedAt = (s === 0) ? 0 : exitAt(s - 1, i);

        if (freeAt === null || arrivedAt === null) {
          // A hole upstream or a skipped item. We cannot honestly
          // derive a start, so we leave this cell empty and say so.
          problems.push({
            kind: "gap",
            station: s,
            item: i,
            message: stations[s].name + " recorded plane " + (i + 1) +
                     " but an earlier time it depends on is missing.",
          });
          continue;
        }

        const began = Math.max(freeAt, arrivedAt);

        if (myExit < began) {
          /* Physically impossible: the plane left before it could
             have been started. Almost always a mis-tap, or two
             phones whose clocks disagree. Flagged loudly rather
             than quietly producing a negative process time that
             would poison every average on the page. */
          problems.push({
            kind: "impossible",
            station: s,
            item: i,
            message: stations[s].name + " finished plane " + (i + 1) +
                     " at " + clock(myExit) + ", which is before it could " +
                     "have started it (" + clock(began) + "). Check that tap.",
          });
          continue;
        }

        start[s][i] = began;
        proc[s][i] = myExit - began;

        /* The plane's story: how long it sat in a pile in front of
           this station. Zero at the first station — the paper is
           already there. */
        queue[s][i] = (s === 0) ? 0 : began - arrivedAt;

        /* The station's story: how long this student sat with
           nothing to do, waiting for the next plane to arrive.
           Zero at the first station, which is never starved. */
        starve[s][i] = began - freeAt;
      }
    }

    /* --------------------------------------------------------
       STEP 3 — per-station summary
       -------------------------------------------------------- */
    let runWindow = 0;
    for (let s = 0; s < S; s++) {
      for (let i = 0; i < N; i++) {
        const e = exitAt(s, i);
        if (e !== null && e > runWindow) runWindow = e;
      }
    }

    const perStation = [];

    for (let s = 0; s < S; s++) {
      const cycles = [];
      const queues = [];
      const starves = [];

      for (let i = 0; i < N; i++) {
        if (isNum(proc[s][i])) cycles.push(proc[s][i]);
        if (isNum(queue[s][i])) queues.push(queue[s][i]);
        if (isNum(starve[s][i])) starves.push(starve[s][i]);
      }

      const busy = sum(cycles);
      const starved = sum(starves);

      /* A wait shorter than a quarter of a second is rounding, not
         a student standing about. Counting those would report
         "waited 20 times" on a line that never actually waited. */
      const realWaits = starves.filter(function (v) { return v > 250; });

      /* When did this station finally stop? Everything after that
         is time spent watching the rest of the line finish, which
         is idle but is NOT waiting for a plane to arrive. Keeping
         the two apart matters: one is a flow problem, the other is
         just the end of the round. */
      let lastExit = 0;
      for (let i = 0; i < N; i++) {
        const e = exitAt(s, i);
        if (e !== null && e > lastExit) lastExit = e;
      }

      perStation.push({
        index: s,
        key: stations[s].key,
        name: stations[s].name,
        colour: stations[s].colour,
        done: cycles.length,
        cycles: cycles,

        /* The headline the activity was built to produce: how long
           this station takes to process one plane, on average. */
        avgCycle: mean(cycles),
        medianCycle: median(cycles),
        minCycle: cycles.length ? Math.min.apply(null, cycles) : null,
        maxCycle: cycles.length ? Math.max.apply(null, cycles) : null,
        sdCycle: stdev(cycles),
        busyMs: busy,

        /* ----------------------------------------------------
           WAITING FOR THE NEXT PLANE TO ARRIVE — "starving"
           ----------------------------------------------------
           The student is ready, the desk is empty, and there is
           nothing to do but watch the station upstream. On a
           four-station line this is usually the largest single
           block of lost time, and it is invisible to the person
           experiencing it — they just feel like they are fast.
           ---------------------------------------------------- */
        starves: starves,
        totalStarveMs: starved,
        avgStarveMs: mean(starves),
        maxStarveMs: starves.length ? Math.max.apply(null, starves) : null,
        starveCount: realWaits.length,
        /* Of the time this station was "on shift", what share was
           spent waiting for work rather than doing it? */
        starveShare: lastExit > 0 ? starved / lastExit : null,

        /* Idle covers everything not spent folding, including the
           tail end of the round after this station ran out of
           planes to process. starve is the subset of it that is a
           genuine flow problem. */
        idleMs: Math.max(0, runWindow - busy),
        tailIdleMs: Math.max(0, runWindow - lastExit),
        lastExitMs: lastExit,
        utilisation: runWindow > 0 ? busy / runWindow : null,

        /* The same gap seen from the plane's side. */
        avgQueueBefore: mean(queues),
        totalQueueBefore: sum(queues),
      });
    }

    /* --------------------------------------------------------
       STEP 4 — per-item summary
       --------------------------------------------------------
       Lead time is measured from the moment MARKING picked the
       sheet up, not from the round's zero. A sheet that sat in the
       stack for ten minutes was not being worked on and was not
       waiting in the line — it had not entered the line yet.
       -------------------------------------------------------- */
    const perItem = [];
    const lastS = S - 1;

    for (let i = 0; i < N; i++) {
      const entered = start[0] ? start[0][i] : null;
      const left = exitAt(lastS, i);

      let va = 0;
      let wait = 0;
      let complete = true;
      for (let s = 0; s < S; s++) {
        if (isNum(proc[s][i])) va += proc[s][i]; else complete = false;
        if (isNum(queue[s][i])) wait += queue[s][i];
      }

      const done = complete && isNum(entered) && isNum(left);
      const verdict = (round.verdicts && round.verdicts[i]) || null;

      perItem.push({
        index: i,
        number: i + 1,
        enteredAt: entered,
        leftAt: left,
        done: done,
        leadMs: done ? left - entered : null,
        vaMs: done ? va : null,
        waitMs: done ? wait : null,
        pce: done && (left - entered) > 0 ? va / (left - entered) : null,
        verdict: verdict ? verdict.verdict : null,
        cause: verdict && isNum(verdict.cause) ? verdict.cause : null,
      });
    }

    const finished = perItem.filter(function (it) { return it.done; });
    const leadTimes = finished.map(function (it) { return it.leadMs; });
    const vaTimes = finished.map(function (it) { return it.vaMs; });

    /* --------------------------------------------------------
       STEP 5 — the line as a whole
       -------------------------------------------------------- */

    /* The gap between one finished plane leaving and the next.
       THIS is the line's real output rate, and comparing it with
       the bottleneck's average cycle time is the punchline of the
       whole activity: they are nearly the same number. A line
       runs at the speed of its slowest station, no matter how
       fast everybody else is. */
    const exitGaps = [];
    const lastRow = [];
    for (let i = 0; i < N; i++) {
      const e = exitAt(lastS, i);
      if (e !== null) lastRow.push(e);
    }
    /* Only between planes that are actually NEXT TO each other.
       lastRow is the surviving taps with the holes squeezed out,
       so differencing it blindly measures the gap across a
       missing plane and calls it one cycle — inflating the line's
       apparent cycle time by a whole plane every time a tap goes
       astray, on the very number the activity builds to. */
    for (let i = 1; i < N; i++) {
      const here = exitAt(lastS, i);
      const prev = exitAt(lastS, i - 1);
      if (here === null || prev === null) continue;
      exitGaps.push(here - prev);
    }

    const avgCycles = perStation.map(function (p) { return p.avgCycle; })
                                .filter(isNum);
    const bottleneckCycle = avgCycles.length ? Math.max.apply(null, avgCycles) : null;

    let bottleneck = null;
    if (bottleneckCycle !== null) {
      bottleneck = perStation.filter(function (p) {
        return p.avgCycle === bottleneckCycle;
      })[0] || null;
    }

    const sumAvgCycles = sum(avgCycles);

    const completed = finished.length;

    /* If the line were perfectly steady, the first plane would take
       the sum of all the station times to come out, and every plane
       after it would follow one bottleneck-cycle behind. Anything
       above this figure is variation and waiting — the gap between
       the two is the size of the prize.

       WITHHELD UNTIL THE ROUND IS DONE, because the two sides
       otherwise describe different sets of aeroplanes: this figure
       is sized by the planes that FINISHED, while runWindow — the
       thing it gets compared against — covers every tap recorded,
       including the planes still in the line. Mid-round that makes
       the "a steady line would have finished sooner" claim compare
       twelve planes' ideal against twenty planes' clock, and the
       saving it reports is mostly just the planes not out yet. */
    const roundComplete = (completed === N && completed > 0);

    const theoreticalMin =
      (roundComplete && avgCycles.length === S && bottleneckCycle !== null)
        ? sumAvgCycles + Math.max(0, completed - 1) * bottleneckCycle
        : null;
    const rejects = finished.filter(function (it) { return it.verdict === "reject"; }).length;
    const goodUnits = completed - rejects;

    /* Time-weighted work in progress: at every moment, how many
       planes were somewhere in the line? Little's Law says the
       average of that should equal throughput x lead time, and on
       real class data it does, which is a satisfying thing to show
       students who assume the formulas are made up. */
    const wipSeries = buildWipSeries(perItem, runWindow);

    const throughputPerMs = runWindow > 0 ? completed / runWindow : null;
    const avgLead = mean(leadTimes);

    const causeCounts = [];
    for (let s = 0; s < S; s++) causeCounts.push(0);
    let uncaused = 0;
    finished.forEach(function (it) {
      if (it.verdict !== "reject") return;
      if (isNum(it.cause) && it.cause >= 0 && it.cause < S) causeCounts[it.cause]++;
      else uncaused++;
    });

    const wastedVa = finished
      .filter(function (it) { return it.verdict === "reject"; })
      .reduce(function (a, it) { return a + (it.vaMs || 0); }, 0);

    /* The whole team's waiting, added up. Four students idle for
       thirty seconds each is two minutes of a class's time, and
       putting it in those terms lands harder than four separate
       percentages. */
    const totalStarve = sum(perStation.map(function (p) { return p.totalStarveMs; }));
    const worstStarver = perStation
      .filter(function (p) { return p.index > 0; })
      .sort(function (x, y) { return y.totalStarveMs - x.totalStarveMs; })[0] || null;

    const line = {
      runWindowMs: runWindow,
      started: perItem.filter(function (it) { return isNum(it.enteredAt); }).length,
      completed: completed,
      itemCount: N,

      /* ----------------------------------------------------
         THE TWO AVERAGES THE ACTIVITY WAS BUILT TO PRODUCE
         ----------------------------------------------------
         Students mix these two up constantly, and the whole
         lesson lives in the gap between them:

         avgStationCycleMs  how long ONE STATION spends on ONE
                            plane, averaged over the stations.
                            Around 17s on a typical round.

         avgLeadMs          how long ONE PLANE takes from being
                            picked up at Marking to leaving
                            Quality Check. Around 4 minutes.

         The second is many times the first, and the difference
         is not work — it is the plane sitting in a pile. Put
         them side by side on screen and the question asks
         itself.
         ---------------------------------------------------- */
      avgLeadMs: avgLead,
      avgStationCycleMs: mean(avgCycles),
      avgStationCycles: perStation.map(function (p) { return p.avgCycle; }),

      medianLeadMs: median(leadTimes),
      minLeadMs: leadTimes.length ? Math.min.apply(null, leadTimes) : null,
      maxLeadMs: leadTimes.length ? Math.max.apply(null, leadTimes) : null,
      avgVaMs: mean(vaTimes),
      avgWaitMs: mean(finished.map(function (it) { return it.waitMs; })),

      /* Process Cycle Efficiency: of all the time a plane spent in
         the line, how much of it was somebody actually working on
         it? Classes are routinely shocked by this number. */
      pce: (function () {
        const totalLead = sum(leadTimes);
        const totalVa = sum(vaTimes);
        return totalLead > 0 ? totalVa / totalLead : null;
      })(),

      lineCycleMs: mean(exitGaps),
      exitGaps: exitGaps,
      throughputPerMin: throughputPerMs !== null ? throughputPerMs * 60000 : null,
      goodPerMin: runWindow > 0 ? (goodUnits / runWindow) * 60000 : null,

      /* Waiting for work, across the whole team. */
      totalStarveMs: totalStarve,
      teamIdleShare: (runWindow > 0 && S > 0) ? totalStarve / (runWindow * S) : null,
      worstStarver: worstStarver,

      taktMs: isNum(round.taktMs) ? round.taktMs : null,
      /* A station whose average is above takt cannot keep up with
         the customer, however hard it tries. */
      overTakt: isNum(round.taktMs)
        ? perStation.filter(function (p) { return isNum(p.avgCycle) && p.avgCycle > round.taktMs; })
        : [],

      bottleneck: bottleneck,
      bottleneckCycleMs: bottleneckCycle,

      /* How evenly the work is shared out. 100% means every station
         takes exactly as long as the slowest one and nobody waits.
         Below about 85% there is a visible pile somewhere. */
      balanceEfficiency: (avgCycles.length === S && bottleneckCycle > 0)
        ? sumAvgCycles / (S * bottleneckCycle)
        : null,
      sumAvgCycleMs: avgCycles.length === S ? sumAvgCycles : null,
      theoreticalMinMs: theoreticalMin,

      avgWip: wipSeries.average,
      wipSeries: wipSeries.points,
      maxWip: wipSeries.max,
      /* Little's Law, computed the other way round, as a check. */
      littleLawWip: (throughputPerMs !== null && isNum(avgLead))
        ? throughputPerMs * avgLead
        : null,

      roundComplete: roundComplete,

      /* Has every plane that entered the line also left it?
         ----------------------------------------------------
         Little's Law only balances on a DRAINED line. While
         planes are still in flight they are counted in the
         measured WIP but contribute no lead time to the other
         side of the equation, so the two figures legitimately
         disagree — and claiming on screen that they are "the
         same number" while they visibly differ teaches a class
         that the formula does not work. */
      drained: perItem.filter(function (it) {
        return isNum(it.enteredAt);
      }).length === completed,

      rejects: rejects,
      goodUnits: goodUnits,
      fpy: completed > 0 ? goodUnits / completed : null,
      causeCounts: causeCounts,
      uncausedRejects: uncaused,
      wastedVaMs: wastedVa,

      problems: problems,
    };

    return {
      stations: stations,
      itemCount: N,
      start: start,
      exits: exits,
      proc: proc,
      queue: queue,
      starve: starve,
      perStation: perStation,
      perItem: perItem,
      line: line,
    };
  }


  /* ----------------------------------------------------------
     WORK IN PROGRESS OVER TIME
     ----------------------------------------------------------
     A plane joins the count when Marking picks it up and leaves
     when QC finishes it. Between those two moments it is WIP —
     work already paid for and not yet delivered.

     Built as a step series: sort every arrival and departure,
     walk through them in order, and keep a running count. The
     average is time-weighted, because a WIP of 6 that lasted ten
     seconds should not count as much as a WIP of 2 that lasted
     five minutes.
     ---------------------------------------------------------- */
  function buildWipSeries(perItem, runWindow) {
    const events = [];

    /* ------------------------------------------------------
       NOTHING MAY LEAVE THAT DID NOT ARRIVE
       ------------------------------------------------------
       These two moments are NOT known on the same terms, and
       treating them as if they were put a negative number of
       physical aeroplanes on the projector.

       An arrival is start[0][i] — DERIVED, and therefore absent
       whenever Marking's tap is missing or was rejected as
       impossible. A departure is Quality Check's raw tap, which
       needs nothing from Marking at all. In team mode each phone
       has its own outbox, so Marking dropping off the wifi while
       the other three keep uploading produces exactly that: a
       run of departures with no matching arrivals, a count that
       walks below zero, and a chart drawn far outside its own
       viewBox where nothing is visible.

       So: a plane that never arrived is skipped entirely — the
       missing tap is already reported through problems. A plane
       that arrived and has not left yet keeps its +1 and stays
       counted to the end of the window, which is correct: it is
       still sitting in the line.
       ------------------------------------------------------ */
    perItem.forEach(function (it) {
      if (!isNum(it.enteredAt)) return;
      events.push({ t: it.enteredAt, d: +1 });
      if (isNum(it.leftAt)) events.push({ t: it.leftAt, d: -1 });
    });

    if (!events.length) return { points: [], average: null, max: 0 };

    events.sort(function (a, b) {
      // A departure at the same instant as an arrival is processed
      // first, so a clean handover does not show a phantom spike.
      if (a.t !== b.t) return a.t - b.t;
      return a.d - b.d;
    });

    const points = [];
    let count = 0;
    let last = 0;
    let area = 0;
    let max = 0;

    events.forEach(function (ev) {
      area += count * (ev.t - last);
      last = ev.t;
      count += ev.d;
      if (count > max) max = count;
      points.push({ t: ev.t, wip: count });
    });

    if (runWindow > last) {
      area += count * (runWindow - last);
      points.push({ t: runWindow, wip: count });
    }

    const span = Math.max(runWindow, last);
    return {
      points: points,
      average: span > 0 ? area / span : null,
      max: max,
    };
  }


  /* ==========================================================
     COMPARING TWO ROUNDS
     ==========================================================
     The point of the second round. Everything is expressed as
     "did it get better", because "lead time fell by 18%" is a
     sentence a student can repeat, and "142000 -> 116000" is not.
     ========================================================== */
  function compare(before, after) {
    function delta(a, b, lowerIsBetter) {
      if (!isNum(a) || !isNum(b) || a === 0) return null;
      const change = (b - a) / Math.abs(a);
      return {
        from: a,
        to: b,
        change: change,
        better: lowerIsBetter ? b < a : b > a,
        same: b === a,
      };
    }

    return {
      leadTime:    delta(before.line.avgLeadMs,        after.line.avgLeadMs,        true),
      lineCycle:   delta(before.line.lineCycleMs,      after.line.lineCycleMs,      true),
      throughput:  delta(before.line.throughputPerMin, after.line.throughputPerMin, false),
      runWindow:   delta(before.line.runWindowMs,      after.line.runWindowMs,      true),
      wip:         delta(before.line.avgWip,           after.line.avgWip,           true),
      pce:         delta(before.line.pce,              after.line.pce,              false),
      balance:     delta(before.line.balanceEfficiency, after.line.balanceEfficiency, false),
      fpy:         delta(before.line.fpy,              after.line.fpy,              false),
      waiting:     delta(before.line.avgWaitMs,        after.line.avgWaitMs,        true),
      starve:      delta(before.line.totalStarveMs,    after.line.totalStarveMs,    true),
      bottleneckBefore: before.line.bottleneck,
      bottleneckAfter:  after.line.bottleneck,
      bottleneckMoved:
        !!(before.line.bottleneck && after.line.bottleneck &&
           before.line.bottleneck.index !== after.line.bottleneck.index),
      stations: before.perStation.map(function (p, i) {
        const q = after.perStation[i];
        return {
          name: p.name,
          colour: p.colour,
          before: p.avgCycle,
          after: q ? q.avgCycle : null,
          delta: delta(p.avgCycle, q ? q.avgCycle : null, true),
          starveBefore: p.totalStarveMs,
          starveAfter: q ? q.totalStarveMs : null,
        };
      }),
    };
  }


  /* ==========================================================
     PLAIN-ENGLISH FINDINGS
     ==========================================================
     The dashboard can draw a beautiful chart and still leave a
     seventeen-year-old none the wiser. These sentences are the
     bridge: each one names a number, says what it means, and
     points at what to do about it.

     They are ordered so the most useful one is first.
     ========================================================== */
  function findings(a) {
    const out = [];
    const L = a.line;
    const S = a.stations.length;

    if (L.completed < 2) {
      out.push({
        tone: "info",
        title: "Not enough planes yet",
        body: "Finish a few more and the analysis fills in.",
      });
      return out;
    }

    /* ========================================================
       A NOTE ON THE WORDING BELOW
       ========================================================
       These sentences are read off a projector by first-semester
       students, most of whom have never seen a factory. So each
       one says the plain thing FIRST — what happened, in words
       anyone uses — and only then gives the proper name for it.

       The names still appear, because the students are examined
       on them and "bottleneck", "takt time" and "first pass
       yield" are the vocabulary of the subject. But a student
       who reads only the first sentence should already have
       understood the point. The term is a label for something
       they have just understood, not a hurdle in front of it.

       Short sentences. No word used that a seventeen-year-old
       would not say out loud.
       ======================================================== */

    /* 1. The slowest station. */
    if (L.bottleneck && isNum(L.bottleneckCycleMs)) {
      const others = a.perStation
        .filter(function (p) { return p.index !== L.bottleneck.index && isNum(p.avgCycle); })
        .map(function (p) { return p.avgCycle; });
      const nextSlowest = others.length ? Math.max.apply(null, others) : null;
      const lead = isNum(nextSlowest) ? L.bottleneckCycleMs - nextSlowest : null;

      out.push({
        tone: "bad",
        title: L.bottleneck.name + " is your slowest station",
        body: "It takes " + secs(L.bottleneckCycleMs) + " to do one plane" +
              (isNum(lead) && lead > 0
                ? ", which is " + secs(lead) + " longer than anyone else"
                : "") +
              ". And look what happens: a finished plane comes out of the line " +
              "every " + secs(L.lineCycleMs) + " — almost the same number. " +
              "The line can only go as fast as its slowest person. " +
              "So telling the other three to hurry up will change nothing at all. " +
              "Only " + L.bottleneck.name + " matters. " +
              "The slowest station has a name in this subject: the bottleneck.",
      });
    }

    /* 2. Waiting for work. */
    if (isNum(L.totalStarveMs) && L.totalStarveMs > 5000) {
      const worst = L.worstStarver;
      out.push({
        tone: L.teamIdleShare > 0.3 ? "bad" : "warn",
        title: "Your team stood doing nothing for " + clock(L.totalStarveMs),
        body: (worst && worst.totalStarveMs > 0
                ? worst.name + " waited the longest: " + clock(worst.totalStarveMs) +
                  ", which is " + pct(worst.starveShare) + " of their time. "
                : "") +
              "Add up everyone's waiting and it comes to " + pct(L.teamIdleShare) +
              " of the whole team's time. Nobody was being lazy. They had nothing " +
              "to work on, because the plane had not reached them yet. " +
              "This is the waste you can see with your own eyes — someone sitting " +
              "there with an empty desk while a pile builds up further back.",
      });
    }

    /* 3. Can we meet the order? */
    if (isNum(L.taktMs)) {
      if (L.overTakt.length) {
        out.push({
          tone: "bad",
          title: L.overTakt.length === 1
            ? L.overTakt[0].name + " is too slow for the order"
            : L.overTakt.length + " stations are too slow for the order",
          body: "The customer wants all " + L.itemCount + " planes in the time you " +
                "were given. That works out at one finished plane every " +
                secs(L.taktMs) + ". But " +
                L.overTakt.map(function (p) {
                  return p.name + " needs " + secs(p.avgCycle);
                }).join(", and ") + ". " +
                (L.overTakt.length === 1 ? "That station" : "Those stations") +
                " cannot go fast enough, no matter how hard they try. " +
                "You must give some of their job to someone else, or put a second " +
                "person on it. " +
                "That target time — one plane every " + secs(L.taktMs) + " — is " +
                "called takt time.",
        });
      } else {
        out.push({
          tone: "good",
          title: "You can meet the customer's order",
          body: "To finish all " + L.itemCount + " planes in time, one has to come " +
                "out every " + secs(L.taktMs) + ". Your slowest station takes " +
                secs(L.bottleneckCycleMs) + ", which is quicker than that, so the " +
                "line can keep up. " +
                "That target — one plane every " + secs(L.taktMs) + " — is called " +
                "takt time.",
        });
      }
    }

    /* 4. Working time versus waiting time. The heart of it. */
    if (isNum(L.pce)) {
      out.push({
        tone: L.pce < 0.4 ? "bad" : (L.pce < 0.7 ? "warn" : "good"),
        title: "A plane spent only " + pct(L.pce) + " of its time being worked on",
        body: "Follow one plane through. It was in the line for " +
              secs(L.avgLeadMs) + ". But somebody was actually touching it for " +
              "only " + secs(L.avgVaMs) + " of that. " +
              "The other " + secs(L.avgWaitMs) + " it just sat in a pile, waiting " +
              "its turn. " +
              "Think about what that means: getting rid of the waiting costs nobody " +
              "any extra effort. Nobody has to work harder or faster. That is why " +
              "you fix the waiting first.",
      });
    }

    /* 5. Is the work shared out fairly? */
    if (isNum(L.balanceEfficiency)) {
      out.push({
        tone: L.balanceEfficiency < 0.7 ? "bad" : (L.balanceEfficiency < 0.85 ? "warn" : "good"),
        title: L.balanceEfficiency >= 0.85
          ? "The work is shared out fairly evenly"
          : "The work is shared out unevenly",
        body: L.balanceEfficiency >= 0.85
          ? "Everyone's job takes roughly the same time, so nobody is left standing " +
            "about waiting for the person before them. There is not much left to " +
            "gain by moving jobs around. " +
            "The score for this is called line balance, and yours is " +
            pct(L.balanceEfficiency) + "."
          : "One person is doing far more than another. Your score is " +
            pct(L.balanceEfficiency) + ", where 100% would mean everybody's job " +
            "takes exactly the same time and nobody ever waits. " +
            "The fix is not to work harder. It is to take one small step of the job " +
            "away from " + (L.bottleneck ? L.bottleneck.name : "the busiest station") +
            " and give it to somebody who is sitting idle. " +
            "This score is called line balance.",
      });
    }

    /* 6. The idle station, which the class always misreads. */
    const idlest = a.perStation
      .filter(function (p) { return isNum(p.utilisation) && p.index > 0; })
      .sort(function (x, y) { return x.utilisation - y.utilisation; })[0];
    if (idlest && isNum(idlest.utilisation) && idlest.utilisation < 0.6) {
      out.push({
        tone: "warn",
        title: idlest.name + " was only working " + pct(idlest.utilisation) + " of the time",
        body: "Do not tell them off. This is not their fault and it is not laziness. " +
              "They were sitting there ready, with nothing to do, because the plane " +
              "had not arrived yet. " +
              "An idle person at the end of a line is a clue about the slowest " +
              "station, not a second problem. " +
              "The answer is to give " + idlest.name + " more of the job to do — " +
              "not to tell them to speed up.",
      });
    }

    /* 7. The pile. */
    if (isNum(L.avgWip) && L.avgWip > 1.5) {
      out.push({
        tone: "warn",
        title: "About " + L.avgWip.toFixed(1) + " planes were stuck in the line at any moment",
        /* No formula here on purpose.
           --------------------------------------------------
           This used to finish with the Little's Law identity —
           throughput times lead time gives the same figure —
           which is true, and which line.drained exists to keep
           honest. It is still computed and still tested; the
           lecturer can read it off the analysis. But a first
           semester class does not need a second formula at the
           end of a paragraph about a pile of paper, and the
           sentence was the one that made this finding feel like
           homework. */
        body: "At the busiest point there were " + L.maxWip + ". " +
              "Every one of those is a plane you have already paid people to work " +
              "on, sitting there earning nothing until it comes out the other end. " +
              "In a real factory that is money on the table doing nothing. " +
              "Half-finished work like this is called work in progress, or WIP.",
      });
    }

    /* 8. Quality. */
    if (isNum(L.fpy)) {
      if (L.rejects === 0) {
        out.push({
          tone: "good",
          title: "Every single plane passed the check",
          body: "Not one had to be thrown away, so no effort was wasted. " +
                "When every item passes first time, that is 100% first pass yield.",
        });
      } else {
        let worst = null;
        for (let s = 0; s < S; s++) {
          if (L.causeCounts[s] > 0 && (worst === null || L.causeCounts[s] > L.causeCounts[worst])) worst = s;
        }
        out.push({
          tone: L.fpy < 0.9 ? "bad" : "warn",
          title: L.rejects + " of your " + L.completed + " planes were rejected",
          body: (worst !== null
                  ? "Most of the faults were made at " + a.stations[worst].name + ". "
                  : "") +
                "Those planes used up " + secs(L.wastedVaMs) + " of your team's work " +
                "and gave you nothing back. " +
                "And notice where the fault was found: at the very end. By then " +
                "every station had already spent time on it. " +
                "It is far cheaper to spot a mistake at the station that made it " +
                "than to find it at the end. " +
                "The share that passed first time — " + pct(L.fpy) + " here — is " +
                "called first pass yield.",
        });
      }
    }

    /* 9. The prize. */
    if (isNum(L.theoreticalMinMs) && L.runWindowMs > L.theoreticalMinMs) {
      const saving = L.runWindowMs - L.theoreticalMinMs;
      if (saving > 5000) {
        out.push({
          tone: "info",
          title: "You could have finished " + secs(saving) + " earlier",
          body: "Same people, working at exactly the same speed, but with no stops " +
                "and no uneven patches: you would have finished in " +
                clock(L.theoreticalMinMs) + " instead of " + clock(L.runWindowMs) + ". " +
                "That difference is not about effort. Nobody needed to work harder. " +
                "It is the stopping and starting.",
        });
      }
    }

    return out;
  }


  root.LineAnalytics = {
    analyse: analyse,
    compare: compare,
    findings: findings,
    fmt: { clock: clock, secs: secs, pct: pct },
    stats: { mean: mean, median: median, stdev: stdev, sum: sum },
  };

})(typeof window !== "undefined" ? window : globalThis);
