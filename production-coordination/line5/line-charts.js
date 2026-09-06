/* ============================================================
   line-charts.js — DRAWING THE NUMBERS
   ============================================================
   Seven charts, all hand-drawn as SVG. No charting library.

   That is a deliberate choice, not stubbornness. A library would
   be another file to fetch, and this page has to work on a
   classroom projector with the wifi struggling under thirty
   phones. SVG built as a string costs nothing, renders instantly,
   scales to any screen without blurring, and prints properly when
   a student wants the analysis in their report.

   ------------------------------------------------------------
   HOW THEY ARE SIZED
   ------------------------------------------------------------
   Every chart is drawn into a fixed viewBox and then told to fill
   whatever width it is given. The browser scales it. That is why
   the font sizes below look large — at 900 units wide displayed
   in a 450px column, a 16-unit label renders at 8px. They are
   tuned to stay readable when the dashboard is on a television
   across a workshop.

   Colours come from the CSS, through classes, so the palette
   lives in one place. The two exceptions — the station colours
   from line-config.js, and the four literals in PAINT below —
   are explained where they are defined.
   ============================================================ */

"use strict";

(function (root) {

  const A = root.LineAnalytics;
  const fmt = A.fmt;

  /* ==========================================================
     THE FEW COLOURS THAT CANNOT LIVE IN THE STYLESHEET
     ==========================================================
     Everything in these charts is coloured by a CSS class, with
     two exceptions: the station colours, which come from
     line-config.js, and the handful below, which have to be
     written straight onto an element because only SOME instances
     of a shape get them — a rejected plane's outline, say.

     They are written as literal hex, and must stay that way.
     A CSS custom property works in a stylesheet but is NOT
     resolved inside an SVG presentation attribute. In a
     stylesheet rule this is fine:

         .lc-takt { stroke: var(--fl-reject); }

     Written onto the element it is not — the value is invalid
     and the whole attribute is thrown away:

         <rect stroke="var(--fl-reject)" />

     An ignored attribute does not warn; the shape simply renders
     in the default black, which on a white page looks close
     enough to deliberate that nobody notices the red outline
     around the rejected planes never appeared.

     Keep these in step with line.css by hand. There are four.
     ========================================================== */
  const PAINT = {
    reject: "#dc2626",   /* --fl-reject */
    wait:   "#c2680a",   /* --fl-wait   */
    soft:   "#4b5768",   /* --fl-ink-soft  */
    faint:  "#78849a",   /* --fl-ink-faint */
  };

  /* ==========================================================
     SMALL DRAWING HELPERS
     ========================================================== */

  function esc(s) {
    return String(s === null || s === undefined ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function isNum(v) { return typeof v === "number" && isFinite(v); }

  function svg(w, h, body, label) {
    return '<svg class="lc" viewBox="0 0 ' + w + ' ' + h + '" ' +
           'preserveAspectRatio="xMidYMid meet" role="img" ' +
           'aria-label="' + esc(label || "") + '">' + body + '</svg>';
  }

  function empty(w, h, message) {
    return svg(w, h,
      '<text class="lc-empty" x="' + (w / 2) + '" y="' + (h / 2) +
      '" text-anchor="middle">' + esc(message) + '</text>', message);
  }

  function rect(x, y, w, h, cls, extra) {
    return '<rect x="' + r(x) + '" y="' + r(y) + '" width="' + r(Math.max(0, w)) +
           '" height="' + r(Math.max(0, h)) + '" ' +
           (cls ? 'class="' + cls + '" ' : "") + (extra || "") + "/>";
  }

  function text(x, y, str, cls, anchor) {
    return '<text x="' + r(x) + '" y="' + r(y) + '"' +
           (cls ? ' class="' + cls + '"' : "") +
           (anchor ? ' text-anchor="' + anchor + '"' : "") +
           ">" + esc(str) + "</text>";
  }

  function line(x1, y1, x2, y2, cls) {
    return '<line x1="' + r(x1) + '" y1="' + r(y1) + '" x2="' + r(x2) +
           '" y2="' + r(y2) + '"' + (cls ? ' class="' + cls + '"' : "") + "/>";
  }

  /* Two decimals is plenty for a coordinate and keeps the markup
     from doubling in size on long rounds. */
  function r(n) {
    return Math.round(n * 100) / 100;
  }

  /* Sensible round numbers for a time axis: 15s, 30s, 1min, 2min,
     5min... whichever gives roughly six or seven gridlines. */
  function timeStep(spanMs) {
    const candidates = [5000, 10000, 15000, 30000, 60000, 120000,
                        300000, 600000, 900000, 1800000];
    for (let i = 0; i < candidates.length; i++) {
      if (spanMs / candidates[i] <= 8) return candidates[i];
    }
    return 3600000;
  }

  function timeAxis(x0, x1, y, spanMs, scale) {
    if (spanMs <= 0) return "";
    const step = timeStep(spanMs);
    let out = "";
    for (let t = 0; t <= spanMs; t += step) {
      const x = scale(t);
      out += line(x, y - 6, x, y, "lc-tick");
      out += text(x, y + 22, fmt.clock(t), "lc-axis", "middle");
    }
    return out;
  }


  /* ==========================================================
     1. THE FLOW CHART (GANTT), BY STATION
     ==========================================================
     The chart that explains the whole activity in one look. Each
     row is a student. Each block is a plane they were working on.

     THE GAPS ARE THE POINT. A row full of blocks is a station
     that never stopped. A row with white space between blocks is
     a student standing there waiting for work to arrive — which
     is exactly the waiting time the analysis reports, drawn to
     scale so it cannot be argued with.
     ========================================================== */
  function flowByStation(a) {
    const W = 960;
    const rowH = 56;
    const padT = 34;
    const padB = 46;
    const padL = 150;
    const padR = 24;
    const S = a.stations.length;
    const H = padT + S * rowH + padB;
    const span = a.line.runWindowMs;

    if (!span) return empty(W, 200, "Waiting for the first plane");

    const plotW = W - padL - padR;
    const scale = function (ms) { return padL + (ms / span) * plotW; };

    let body = "";

    // Minute gridlines behind everything.
    const step = timeStep(span);
    for (let t = step; t <= span; t += step) {
      body += line(scale(t), padT - 8, scale(t), padT + S * rowH, "lc-grid");
    }

    for (let s = 0; s < S; s++) {
      const y = padT + s * rowH;
      const st = a.stations[s];
      const ps = a.perStation[s];

      // The empty track. Anything not covered by a block is idle.
      body += rect(padL, y + 8, plotW, rowH - 22, "lc-track");

      body += text(padL - 12, y + rowH / 2 - 2, st.key + " · " + st.name,
                   "lc-rowlabel", "end");
      body += text(padL - 12, y + rowH / 2 + 16,
                   isNum(ps.avgCycle) ? "avg " + fmt.secs(ps.avgCycle) : "—",
                   "lc-rowsub", "end");

      for (let i = 0; i < a.itemCount; i++) {
        const from = a.start[s][i];
        const to = a.exits[s][i];
        if (!isNum(from) || !isNum(to)) continue;

        const x = scale(from);
        const w = Math.max(2, scale(to) - x);
        const rejected = a.perItem[i] && a.perItem[i].verdict === "reject";

        body += rect(x, y + 8, w, rowH - 22, "lc-block",
          'fill="' + st.colour + '" rx="3"' +
          (rejected ? ' stroke="' + PAINT.reject + '" stroke-width="2"' : ""));

        // Only label a block wide enough to hold the number.
        if (w > 22) {
          body += text(x + w / 2, y + rowH / 2 + 3, String(i + 1),
                       "lc-blocklabel", "middle");
        }
      }
    }

    body += timeAxis(padL, W - padR, padT + S * rowH + 12, span, scale);
    body += text(padL, 18, "Each block is one plane being worked on. " +
                 "Gaps are waiting.", "lc-caption");

    return svg(W, H, body, "Flow chart of the line by station");
  }


  /* ==========================================================
     2. THE FLOW CHART, BY PLANE
     ==========================================================
     The same data told from the plane's side. One row per plane,
     coloured segments for the four stations, and a hatched gap
     wherever it sat in a pile waiting to be picked up.

     Students find their own plane in this one, which is what
     makes lead time stop being an abstraction.
     ========================================================== */
  function flowByItem(a) {
    const W = 960;
    const rowH = 26;
    const padT = 34;
    const padB = 46;
    const padL = 70;
    const padR = 24;
    const shown = a.perItem.filter(function (it) { return isNum(it.enteredAt); });
    const H = padT + Math.max(1, shown.length) * rowH + padB;
    const span = a.line.runWindowMs;

    if (!span || !shown.length) return empty(W, 200, "Waiting for the first plane");

    const plotW = W - padL - padR;
    const scale = function (ms) { return padL + (ms / span) * plotW; };

    let body = "";
    const step = timeStep(span);
    for (let t = step; t <= span; t += step) {
      body += line(scale(t), padT - 8, scale(t), padT + shown.length * rowH, "lc-grid");
    }

    shown.forEach(function (it, n) {
      const y = padT + n * rowH;
      const i = it.index;

      body += text(padL - 10, y + rowH / 2 + 4, "#" + (i + 1), "lc-rowsub", "end");

      // The waiting, drawn first so the work sits on top of it.
      if (isNum(it.enteredAt) && isNum(it.leftAt)) {
        body += rect(scale(it.enteredAt), y + 5,
                     scale(it.leftAt) - scale(it.enteredAt), rowH - 10,
                     "lc-wait", 'rx="2"');
      }

      for (let s = 0; s < a.stations.length; s++) {
        const from = a.start[s][i];
        const to = a.exits[s][i];
        if (!isNum(from) || !isNum(to)) continue;
        body += rect(scale(from), y + 5, Math.max(1.5, scale(to) - scale(from)),
                     rowH - 10, "lc-block",
                     'fill="' + a.stations[s].colour + '" rx="2"');
      }

      if (it.verdict === "reject") {
        body += text(scale(it.leftAt) + 8, y + rowH / 2 + 4, "✕", "lc-reject-mark");
      }
    });

    body += timeAxis(padL, W - padR, padT + shown.length * rowH + 12, span, scale);
    body += text(padL, 18, "Solid = being worked on.  Shaded = sitting in a pile.",
                 "lc-caption");

    return svg(W, H, body, "Flow chart of the line by plane");
  }


  /* ==========================================================
     3. LINE BALANCE (YAMAZUMI)
     ==========================================================
     One bar per station against the takt line. The classic lean
     picture: any bar poking above the red line is a station that
     cannot keep up with the customer, and the white space under
     the short bars is the work the line could absorb if it were
     shared out differently.
     ========================================================== */
  function balance(a) {
    const W = 560;
    const H = 320;
    const padT = 46;
    const padB = 68;
    const padL = 54;
    const padR = 20;
    const S = a.stations.length;

    const cycles = a.perStation.map(function (p) { return p.avgCycle; });
    if (!cycles.some(isNum)) return empty(W, 220, "No completed planes yet");

    const takt = a.line.taktMs;

    /* The ceiling has to clear the WHISKERS, not just the bars.
       Sized from the averages alone, a single slow aeroplane — a
       dropped one, a re-fold — draws its whisker cap above the
       plot and straight out of the viewBox, where the SVG clips
       it away. The chart then shows a spread that stops dead at
       the top edge, which reads as a measurement rather than as
       something missing. */
    const spreads = a.perStation
      .map(function (p) { return p.maxCycle; })
      .filter(isNum);

    const top = Math.max(
      Math.max.apply(null, cycles.filter(isNum)),
      spreads.length ? Math.max.apply(null, spreads) : 0,
      isNum(takt) ? takt : 0
    ) * 1.12;

    const plotH = H - padT - padB;
    const plotW = W - padL - padR;
    const bandW = plotW / S;
    const barW = Math.min(78, bandW * 0.62);
    const y = function (ms) { return padT + plotH - (ms / top) * plotH; };

    let body = "";

    // Value gridlines.
    const gstep = timeStep(top);
    for (let t = 0; t <= top; t += gstep) {
      body += line(padL, y(t), W - padR, y(t), "lc-grid");
      body += text(padL - 8, y(t) + 5, fmt.clock(t), "lc-axis", "end");
    }

    a.perStation.forEach(function (p, s) {
      const cx = padL + bandW * s + bandW / 2;
      if (!isNum(p.avgCycle)) return;

      const isBottleneck = a.line.bottleneck && a.line.bottleneck.index === s;
      const overTakt = isNum(takt) && p.avgCycle > takt;

      body += rect(cx - barW / 2, y(p.avgCycle), barW, padT + plotH - y(p.avgCycle),
                   "lc-bar",
                   'fill="' + p.colour + '" rx="4"' +
                   (overTakt ? ' stroke="' + PAINT.reject + '" stroke-width="2.5"' : ""));

      // The spread, drawn as a whisker. A tall whisker means the
      // station is inconsistent, which is its own kind of problem.
      if (isNum(p.minCycle) && isNum(p.maxCycle) && p.maxCycle > p.minCycle) {
        body += line(cx, y(p.minCycle), cx, y(p.maxCycle), "lc-whisker");
        body += line(cx - 9, y(p.maxCycle), cx + 9, y(p.maxCycle), "lc-whisker");
        body += line(cx - 9, y(p.minCycle), cx + 9, y(p.minCycle), "lc-whisker");
      }

      body += text(cx, y(p.avgCycle) - 10, fmt.secs(p.avgCycle), "lc-barvalue", "middle");
      body += text(cx, H - padB + 22, p.key, "lc-barlabel", "middle");
      body += text(cx, H - padB + 42, p.name, "lc-barsub", "middle");
      if (isBottleneck) {
        body += text(cx, H - padB + 60, "bottleneck", "lc-bottleneck-tag", "middle");
      }
    });

    if (isNum(takt)) {
      body += line(padL, y(takt), W - padR, y(takt), "lc-takt");
      body += text(W - padR, y(takt) - 8, "TAKT " + fmt.secs(takt), "lc-takt-label", "end");
    }

    body += text(padL, 20, "Average time per plane, against the customer's drumbeat",
                 "lc-caption");

    return svg(W, H, body, "Line balance against takt time");
  }


  /* ==========================================================
     4. WORKING vs WAITING
     ==========================================================
     Where each student's round actually went. Three parts, and
     the middle one is the one the class came for: time spent
     waiting for the next plane to arrive.
     ========================================================== */
  function workVsWait(a) {
    const W = 560;
    const H = 300;
    const padT = 46;
    const padB = 62;
    const padL = 152;
    const padR = 96;
    const S = a.stations.length;
    const span = a.line.runWindowMs;

    if (!span) return empty(W, 200, "No completed planes yet");

    const rowH = (H - padT - padB) / S;
    const plotW = W - padL - padR;
    const scale = function (ms) { return (ms / span) * plotW; };

    let body = "";
    let anyUnrecorded = false;

    a.perStation.forEach(function (p, s) {
      const y = padT + s * rowH;
      const barH = Math.min(30, rowH * 0.56);
      const yb = y + (rowH - barH) / 2;

      body += text(padL - 12, yb + barH / 2 + 5, p.key + " · " + p.name,
                   "lc-rowlabel", "end");

      let x = padL;

      // Busy.
      body += rect(x, yb, scale(p.busyMs), barH, "lc-bar",
                   'fill="' + p.colour + '"');
      x += scale(p.busyMs);

      // Waiting for the next plane — the headline.
      body += rect(x, yb, scale(p.totalStarveMs), barH, "lc-starve");
      x += scale(p.totalStarveMs);

      /* On a clean round, working + waiting comes to exactly this
         station's last finish, and the rest of the window is the
         tail — time spent watching the others finish. Which means
         any DIFFERENCE between the two is time the log cannot
         account for: a dropped tap, or a reading thrown out as
         impossible.

         That difference used to be folded into the tail, where it
         was invisible. A missing reading therefore made the bar
         look like a station that had finished early, and quietly
         shrank the amber block — understating the exact waste
         this chart exists to show. It gets its own segment. */
      const tail = Math.max(0, p.tailIdleMs);
      const unrecorded = Math.max(0, span - p.busyMs - p.totalStarveMs - tail);

      if (unrecorded > 0) {
        anyUnrecorded = true;
        body += rect(x, yb, scale(unrecorded), barH, "lc-unrecorded");
        x += scale(unrecorded);
      }

      body += rect(x, yb, scale(tail), barH, "lc-tail");

      body += text(W - padR + 10, yb + barH / 2 + 5,
                   fmt.pct(p.utilisation) + " busy", "lc-rowsub");
    });

    /* Legend, laid out left to right from the edge rather than
       from padL — the row labels need that space now, and a
       fourth key would have run off the right-hand side. Widths
       are estimated from the character count at the 12px legend
       size, which is close enough for a single row of short
       words and costs no measurement. */
    const ly = H - 20;
    let lx = 14;

    function key(cls, label, fill) {
      const out = rect(lx, ly - 10, 13, 12, cls, fill ? 'fill="' + fill + '"' : "") +
                  text(lx + 18, ly, label, "lc-legend");
      lx += 18 + label.length * 6.1 + 18;
      return out;
    }

    body += key("lc-swatch", "working", PAINT.soft);
    body += key("lc-starve", "waiting for a plane");
    if (anyUnrecorded) body += key("lc-unrecorded", "not recorded");
    body += key("lc-tail", "round finished");

    body += text(14, 20, "How each student's round was spent", "lc-caption");

    return svg(W, H, body, "Working versus waiting, per station");
  }


  /* ==========================================================
     5. RUN CHART — DID THEY GET FASTER?
     ==========================================================
     Cycle time against plane number, one line per station. On a
     first round these slope downward as the students learn the
     fold, which is the learning curve made visible. A single
     spike is usually a dropped plane or a mis-tap, and is worth
     asking about.
     ========================================================== */
  function runChart(a) {
    const W = 640;
    const H = 300;
    const padT = 42;
    const padB = 52;
    const padL = 54;
    const padR = 24;

    const all = [];
    a.perStation.forEach(function (p) {
      p.cycles.forEach(function (c) { all.push(c); });
    });
    if (all.length < 2) return empty(W, 200, "Not enough planes yet");

    const top = Math.max.apply(null, all) * 1.15;
    const plotH = H - padT - padB;
    const plotW = W - padL - padR;
    const N = a.itemCount;

    const x = function (i) { return padL + (N <= 1 ? 0 : (i / (N - 1)) * plotW); };
    const y = function (ms) { return padT + plotH - (ms / top) * plotH; };

    let body = "";

    const gstep = timeStep(top);
    for (let t = 0; t <= top; t += gstep) {
      body += line(padL, y(t), W - padR, y(t), "lc-grid");
      body += text(padL - 8, y(t) + 5, fmt.clock(t), "lc-axis", "end");
    }

    if (isNum(a.line.taktMs) && a.line.taktMs < top) {
      body += line(padL, y(a.line.taktMs), W - padR, y(a.line.taktMs), "lc-takt");
      body += text(W - padR, y(a.line.taktMs) - 7, "takt", "lc-takt-label", "end");
    }

    a.perStation.forEach(function (p, s) {
      let path = "";
      let dots = "";
      let started = false;

      for (let i = 0; i < N; i++) {
        const v = a.proc[s][i];
        if (!isNum(v)) continue;
        path += (started ? " L " : "M ") + r(x(i)) + " " + r(y(v));
        started = true;
        dots += '<circle cx="' + r(x(i)) + '" cy="' + r(y(v)) +
                '" r="3" fill="' + p.colour + '" />';
      }

      if (path) {
        body += '<path d="' + path + '" class="lc-line" stroke="' + p.colour + '" />';
        body += dots;
      }
    });

    // Plane numbers along the bottom, thinned out so they do not
    // collide on a twenty-plane round.
    const every = N > 12 ? 2 : 1;
    for (let i = 0; i < N; i += every) {
      body += text(x(i), H - padB + 22, String(i + 1), "lc-axis", "middle");
    }
    body += text(W / 2, H - 10, "plane number", "lc-axis-title", "middle");
    body += text(padL, 20, "Time per plane as the round went on", "lc-caption");

    return svg(W, H, body, "Cycle time per plane, per station");
  }


  /* ==========================================================
     6. WORK IN PROGRESS OVER TIME
     ==========================================================
     How many planes were stuck in the line at each moment. A
     staircase that only climbs is the signature of a line
     feeding a bottleneck — the pile in front of the slow station
     never comes down, and everything in it is finished work
     nobody has been paid for yet.
     ========================================================== */
  function wipChart(a) {
    const W = 640;
    const H = 250;
    const padT = 40;
    const padB = 50;
    const padL = 44;
    const padR = 24;

    const pts = a.line.wipSeries;
    const span = a.line.runWindowMs;
    if (!pts || pts.length < 2 || !span) return empty(W, 180, "Not enough planes yet");

    const top = Math.max(2, a.line.maxWip + 1);
    const plotH = H - padT - padB;
    const plotW = W - padL - padR;
    const x = function (t) { return padL + (t / span) * plotW; };
    const y = function (n) { return padT + plotH - (n / top) * plotH; };

    let body = "";

    for (let n = 0; n <= top; n += (top > 8 ? 2 : 1)) {
      body += line(padL, y(n), W - padR, y(n), "lc-grid");
      body += text(padL - 8, y(n) + 5, String(n), "lc-axis", "end");
    }

    // A step path, because WIP changes in whole planes at an
    // instant — drawing it as a smooth slope would be a lie.
    let path = "M " + r(padL) + " " + r(y(0));
    let prev = 0;
    pts.forEach(function (p) {
      path += " L " + r(x(p.t)) + " " + r(y(prev));
      path += " L " + r(x(p.t)) + " " + r(y(p.wip));
      prev = p.wip;
    });
    path += " L " + r(x(span)) + " " + r(y(prev));

    body += '<path d="' + path + ' L ' + r(x(span)) + ' ' + r(y(0)) +
            ' L ' + r(padL) + ' ' + r(y(0)) + ' Z" class="lc-area" />';
    body += '<path d="' + path + '" class="lc-step" />';

    if (isNum(a.line.avgWip)) {
      body += line(padL, y(a.line.avgWip), W - padR, y(a.line.avgWip), "lc-mean");
      body += text(W - padR, y(a.line.avgWip) - 7,
                   "average " + a.line.avgWip.toFixed(1), "lc-mean-label", "end");
    }

    body += timeAxis(padL, W - padR, padT + plotH, span, x);
    body += text(padL, 18, "Planes stuck in the line, moment by moment", "lc-caption");

    return svg(W, H, body, "Work in progress over time");
  }


  /* ==========================================================
     7. LEAD TIME PER PLANE — WORK vs WAIT
     ==========================================================
     One bar per plane, split into the part somebody was working
     on it and the part it spent in a pile. On most first rounds
     the waiting half grows steadily across the chart, because the
     queue in front of the bottleneck is still building.
     ========================================================== */
  function leadTimes(a) {
    const W = 640;
    const H = 280;
    const padT = 42;
    const padB = 54;
    const padL = 54;
    const padR = 24;

    const done = a.perItem.filter(function (it) { return it.done; });
    if (!done.length) return empty(W, 180, "No planes have finished yet");

    const top = Math.max.apply(null, done.map(function (it) { return it.leadMs; })) * 1.12;
    const plotH = H - padT - padB;
    const plotW = W - padL - padR;
    const bandW = plotW / a.itemCount;
    const barW = Math.min(26, bandW * 0.72);
    const y = function (ms) { return padT + plotH - (ms / top) * plotH; };

    let body = "";

    const gstep = timeStep(top);
    for (let t = 0; t <= top; t += gstep) {
      body += line(padL, y(t), W - padR, y(t), "lc-grid");
      body += text(padL - 8, y(t) + 5, fmt.clock(t), "lc-axis", "end");
    }

    done.forEach(function (it) {
      const cx = padL + bandW * it.index + bandW / 2;
      const yTop = y(it.leadMs);
      const full = padT + plotH - yTop;
      const workH = it.leadMs > 0 ? full * (it.vaMs / it.leadMs) : 0;

      // Waiting on top, work underneath — the plane is worked on
      // in bursts, but stacking it this way keeps the coloured
      // part on the baseline where the eye can compare it.
      body += rect(cx - barW / 2, yTop, barW, full - workH, "lc-wait-bar", 'rx="2"');
      body += rect(cx - barW / 2, yTop + (full - workH), barW, workH, "lc-work-bar",
                   'rx="2"' + (it.verdict === "reject"
                     ? ' stroke="' + PAINT.reject + '" stroke-width="2"' : ""));
    });

    if (isNum(a.line.avgLeadMs)) {
      body += line(padL, y(a.line.avgLeadMs), W - padR, y(a.line.avgLeadMs), "lc-mean");
      body += text(W - padR, y(a.line.avgLeadMs) - 7,
                   "average " + fmt.secs(a.line.avgLeadMs), "lc-mean-label", "end");
    }

    const every = a.itemCount > 12 ? 2 : 1;
    for (let i = 0; i < a.itemCount; i += every) {
      body += text(padL + bandW * i + bandW / 2, H - padB + 22, String(i + 1),
                   "lc-axis", "middle");
    }

    const ly = H - 12;
    body += rect(padL, ly - 10, 14, 12, "lc-work-bar");
    body += text(padL + 20, ly, "being worked on", "lc-legend");
    body += rect(padL + 150, ly - 10, 14, 12, "lc-wait-bar");
    body += text(padL + 170, ly, "waiting in a pile", "lc-legend");

    body += text(padL, 18, "How long each plane took, end to end", "lc-caption");

    return svg(W, H, body, "Lead time per plane");
  }


  /* ==========================================================
     8. WHERE THE FAULTS CAME FROM (PARETO)
     ==========================================================
     Rejects grouped by the station that caused them, tallest
     first, with the running total across the top. The point
     Pareto always makes: a small number of causes account for
     most of the damage, so fix those first.
     ========================================================== */
  function rejectPareto(a) {
    const W = 560;
    const H = 260;
    const padT = 42;
    const padB = 66;
    const padL = 44;
    const padR = 48;

    const total = a.line.rejects;
    if (!total) return empty(W, 160, "No rejects — nothing to explain");

    const bars = a.stations.map(function (st, s) {
      return { name: st.name, key: st.key, colour: st.colour, n: a.line.causeCounts[s] };
    }).filter(function (b) { return b.n > 0; })
      .sort(function (x, y) { return y.n - x.n; });

    if (a.line.uncausedRejects > 0) {
      bars.push({
        name: "not recorded", key: "?",
        colour: PAINT.faint, n: a.line.uncausedRejects,
      });
    }
    if (!bars.length) return empty(W, 160, "No causes recorded");

    const top = Math.max.apply(null, bars.map(function (b) { return b.n; }));
    const plotH = H - padT - padB;
    const plotW = W - padL - padR;
    const bandW = plotW / bars.length;
    const barW = Math.min(72, bandW * 0.6);
    const y = function (n) { return padT + plotH - (n / (top * 1.15)) * plotH; };
    const yPct = function (f) { return padT + plotH - f * plotH; };

    let body = "";

    for (let n = 0; n <= top; n++) {
      body += line(padL, y(n), W - padR, y(n), "lc-grid");
      body += text(padL - 8, y(n) + 5, String(n), "lc-axis", "end");
    }

    let running = 0;
    let cumPath = "";

    bars.forEach(function (b, i) {
      const cx = padL + bandW * i + bandW / 2;
      body += rect(cx - barW / 2, y(b.n), barW, padT + plotH - y(b.n), "lc-bar",
                   'fill="' + b.colour + '" rx="3"');
      body += text(cx, y(b.n) - 9, String(b.n), "lc-barvalue", "middle");
      body += text(cx, H - padB + 22, b.key, "lc-barlabel", "middle");
      body += text(cx, H - padB + 40, b.name, "lc-barsub", "middle");

      running += b.n;
      const f = running / total;
      cumPath += (i === 0 ? "M " : " L ") + r(cx) + " " + r(yPct(f));
      body += '<circle cx="' + r(cx) + '" cy="' + r(yPct(f)) + '" r="3.5" class="lc-cum-dot" />';
      body += text(cx + 12, yPct(f) - 8, fmt.pct(f), "lc-cum-label");
    });

    body += '<path d="' + cumPath + '" class="lc-cum" />';
    body += text(padL, 18, "Which station the faults came from", "lc-caption");

    return svg(W, H, body, "Pareto chart of reject causes");
  }


  /* ==========================================================
     9. ROUND AGAINST ROUND
     ==========================================================
     Paired bars, before and after, per station. The picture the
     second round exists to produce.
     ========================================================== */
  function roundCompare(cmp) {
    const W = 560;
    const H = 280;
    const padT = 46;
    const padB = 64;
    const padL = 54;
    const padR = 20;

    const rows = cmp.stations.filter(function (s) {
      return isNum(s.before) || isNum(s.after);
    });
    if (!rows.length) return empty(W, 180, "Run a second round to compare");

    const values = [];
    rows.forEach(function (s) {
      if (isNum(s.before)) values.push(s.before);
      if (isNum(s.after)) values.push(s.after);
    });
    const top = Math.max.apply(null, values) * 1.2;

    const plotH = H - padT - padB;
    const plotW = W - padL - padR;
    const bandW = plotW / rows.length;
    const barW = Math.min(30, bandW * 0.3);
    const y = function (ms) { return padT + plotH - (ms / top) * plotH; };

    let body = "";

    const gstep = timeStep(top);
    for (let t = 0; t <= top; t += gstep) {
      body += line(padL, y(t), W - padR, y(t), "lc-grid");
      body += text(padL - 8, y(t) + 5, fmt.clock(t), "lc-axis", "end");
    }

    rows.forEach(function (s, i) {
      const cx = padL + bandW * i + bandW / 2;

      if (isNum(s.before)) {
        body += rect(cx - barW - 3, y(s.before), barW, padT + plotH - y(s.before),
                     "lc-bar lc-bar-before", 'fill="' + s.colour + '" rx="3"');
        body += text(cx - barW / 2 - 3, y(s.before) - 8, fmt.secs(s.before),
                     "lc-barvalue-sm", "middle");
      }
      if (isNum(s.after)) {
        body += rect(cx + 3, y(s.after), barW, padT + plotH - y(s.after),
                     "lc-bar", 'fill="' + s.colour + '" rx="3"');
        body += text(cx + barW / 2 + 3, y(s.after) - 8, fmt.secs(s.after),
                     "lc-barvalue-sm", "middle");
      }

      body += text(cx, H - padB + 22, s.name, "lc-barsub", "middle");

      if (s.delta) {
        body += text(cx, H - padB + 42,
                     (s.delta.change > 0 ? "+" : "") + Math.round(s.delta.change * 100) + "%",
                     s.delta.better ? "lc-delta-good" : "lc-delta-bad", "middle");
      }
    });

    const ly = 22;
    body += rect(padL, ly - 11, 13, 12, "lc-bar lc-bar-before", 'fill="' + PAINT.soft + '"');
    body += text(padL + 19, ly, "round 1", "lc-legend");
    body += rect(padL + 92, ly - 11, 13, 12, "lc-bar", 'fill="' + PAINT.soft + '"');
    body += text(padL + 111, ly, "round 2", "lc-legend");

    return svg(W, H, body, "Station times, round against round");
  }


  root.LineCharts = {
    flowByStation: flowByStation,
    flowByItem: flowByItem,
    balance: balance,
    workVsWait: workVsWait,
    runChart: runChart,
    wipChart: wipChart,
    leadTimes: leadTimes,
    rejectPareto: rejectPareto,
    roundCompare: roundCompare,
  };

})(typeof window !== "undefined" ? window : globalThis);
