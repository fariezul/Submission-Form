/* ============================================================
   wheel-app.js — THE PAGE: DRAWING, SPINNING, THE POP-UP
   ============================================================
   Needs, loaded before it:
     wheel-config.js     WHEEL_CONFIG
     wheel-math.js       WheelMath     (who wins, where to stop)
     wheel-audio.js      WheelAudio    (drumroll, ticks, ta-da)
     wheel-confetti.js   WheelConfetti

   HOW A SPIN GOES
     1. SPIN is pressed (button, the middle of the wheel, or the
        Space bar).
     2. WheelMath picks the winner at random, and works out a
        stopping angle that puts that name under the pointer
        after six to eight full turns.
     3. The wheel is animated to that angle over six or seven
        seconds, with a drumroll under it and a tick every time a
        segment passes the pointer.
     4. It stops, the cymbal crashes, and the pop-up shows the
        name with confetti. Remove (the default) takes the name
        off the wheel; Keep leaves it on.

   HOW THE WHEEL IS DRAWN
   The coloured segments and the names are painted ONCE onto a
   hidden canvas whenever the list or the size changes. Each
   animation frame then only has to rotate and stamp that
   picture, plus the rim lights — so even sixty names spin
   smoothly on a school laptop.

   WHAT IS SAVED
   The list, who has been picked, and the sound setting are kept
   in this browser's localStorage, so a lecturer can close the
   laptop mid-class and carry on. Nothing is sent anywhere.
   ============================================================ */

"use strict";

(function (root) {

  const CFG = root.WHEEL_CONFIG;
  const M = root.WheelMath;
  const Audio = root.WheelAudio;
  const Confetti = root.WheelConfetti;
  const doc = root.document;

  /* ----------------------------------------------------------
     THE PAGE ELEMENTS
     ---------------------------------------------------------- */
  const $ = function (id) { return doc.getElementById(id); };

  const el = {
    stage:      $("wheelStage"),
    area:       $("wheelArea"),
    box:        $("wheelBox"),
    canvas:     $("wheelCanvas"),
    pointer:    $("wheelPointer"),
    hub:        $("hubBtn"),
    spin:       $("spinBtn"),
    count:      $("onWheel"),
    countText:  $("onWheelText"),
    soundBtn:   $("soundBtn"),
    soundLabel: $("soundLabel"),
    fsBtn:      $("fsBtn"),
    fsLabel:    $("fsLabel"),
    msg:        $("wheelMsg"),
    sample:     $("sampleNote"),
    names:      $("namesInput"),
    nameCount:  $("nameCount"),
    shuffle:    $("shuffleBtn"),
    sort:       $("sortBtn"),
    clear:      $("clearBtn"),
    restore:    $("restoreBtn"),
    picked:     $("pickedList"),
    pickedNone: $("pickedNone"),
    pickedCount:$("pickedCount"),
    putBack:    $("putBackBtn"),
    overlay:    $("winner"),
    confetti:   $("confettiCanvas"),
    wName:      $("winnerName"),
    wMeta:      $("winnerMeta"),
    remove:     $("removeBtn"),
    keep:       $("keepBtn"),
    main:       $("wheelMain"),
    live:       $("srLive"),
  };


  /* ----------------------------------------------------------
     SAVED STATE
     ---------------------------------------------------------- */
  let state = load();

  function fresh() {
    return {
      version: CFG.LIST_VERSION,
      names: CFG.CLASS_NAMES.slice(0, CFG.MAX_NAMES),
      picked: [],            // [{ name, removed }], oldest first
      sound: true,
    };
  }

  /* A saved list from an older LIST_VERSION is thrown away: the
     class list in wheel-config.js has changed since. Storage can
     also be missing altogether (a private window, a locked-down
     school browser), in which case the page simply starts fresh
     each time. */
  function load() {
    try {
      const raw = root.localStorage.getItem(CFG.STORAGE_KEY);
      if (!raw) return fresh();
      const s = JSON.parse(raw);
      if (!s || s.version !== CFG.LIST_VERSION || !Array.isArray(s.names) || !Array.isArray(s.picked)) {
        return fresh();
      }
      return {
        version: CFG.LIST_VERSION,
        names: s.names.map(String).slice(0, CFG.MAX_NAMES),
        picked: s.picked.filter(function (p) { return p && typeof p.name === "string"; }),
        sound: s.sound !== false,
      };
    } catch (e) {
      return fresh();
    }
  }

  function save() {
    try { root.localStorage.setItem(CFG.STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { /* not fatal — this session still works */ }
  }


  /* ----------------------------------------------------------
     DRAWING
     ---------------------------------------------------------- */
  const g = el.canvas.getContext("2d");
  let S = 600;               // wheel size in CSS pixels
  let dpr = 1;
  let cache = null;          // the segments and names, painted once
  let rotation = 0;          // degrees, clockwise, never wrapped
  let highlight = -1;        // the winning segment, once stopped
  let lightPhase = 0;        // which rim lights are lit

  const NAVY = "#0b1f3a";
  const RIM_LIGHTS = 28;

  function geometry() {
    const k = S / 600;
    return {
      k: k,
      c: S / 2,
      outer: S * 0.49,       // navy edge
      ring: S * 0.4767,      // white ring
      R: S * 0.4533,         // the segments
      hubR: S * 0.1033,
      lightR: S * 0.465,
    };
  }

  /* Size the wheel to the space it has. On the normal page it
     stays small enough that the SPIN button still shows below it
     without scrolling (but never smaller than 420px on a big
     screen); in full screen it takes all the height there is,
     less room for the button. */
  function layout() {
    const full = doc.body.classList.contains("nw-full");
    const width = el.area.clientWidth;
    const h = root.innerHeight;
    const top = el.area.getBoundingClientRect().top + (root.scrollY || 0);
    const size = full
      ? Math.min(width, h - 180)
      : Math.min(width, 620, Math.max(420, h - top - 135));
    S = Math.max(240, Math.floor(size));
    dpr = Math.min(root.devicePixelRatio || 1, 2);

    el.box.style.width = S + "px";
    el.box.style.height = S + "px";
    el.canvas.width = Math.round(S * dpr);
    el.canvas.height = Math.round(S * dpr);
    el.hub.style.fontSize = Math.round(26 * S / 600) + "px";

    buildCache();
    draw();
  }

  function fontFor(px) {
    return "800 " + px + "px 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
  }

  function buildCache() {
    const G = geometry();
    const n = state.names.length;
    cache = doc.createElement("canvas");
    cache.width = Math.round(S * dpr);
    cache.height = Math.round(S * dpr);
    const c = cache.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    // No names yet: a pale wheel in the same colours.
    if (n === 0) {
      c.globalAlpha = 0.22;
      for (let i = 0; i < 8; i++) {
        wedge(c, G, i, 8);
        c.fillStyle = CFG.PALETTE[i].fill;
        c.fill();
      }
      c.globalAlpha = 1;
      return;
    }

    const seg = 360 / n;
    for (let i = 0; i < n; i++) {
      const col = CFG.PALETTE[M.colourIndex(i, n, CFG.PALETTE.length)];
      wedge(c, G, i, n);
      c.fillStyle = col.fill;
      c.fill();
      if (n > 1) {
        c.lineWidth = Math.max(1, 2 * G.k);
        c.strokeStyle = "#ffffff";
        c.stroke();
      }
    }

    /* The names, reading from the middle outwards and ending just
       inside the rim. The font is as large as the segment's width
       allows, capped so a short list does not look shouty. */
    const pad = 18 * G.k;
    const room = G.R - pad - G.hubR - 10 * G.k;          // length available
    const arc = 2 * Math.PI * (G.R * 0.7) / n;           // segment width near the text
    const size = M.clamp(arc * 0.42, 9, 30 * G.k);

    c.textAlign = "right";
    c.textBaseline = "middle";
    for (let i = 0; i < n; i++) {
      const col = CFG.PALETTE[M.colourIndex(i, n, CFG.PALETTE.length)];
      const mid = (i + 0.5) * seg - 90;
      const fitted = fitLabel(c, state.names[i], size, room);
      c.save();
      c.translate(G.c, G.c);
      c.rotate(mid * Math.PI / 180);
      c.font = fontFor(fitted.size);
      c.fillStyle = col.ink;
      c.fillText(fitted.text, G.R - pad, 0);
      c.restore();
    }
  }

  /* Make a name fit along its segment: shrink it a little first,
     and only if it is still too long, cut it with an ellipsis.
     The pop-up always shows the full name. */
  function fitLabel(c, text, size, room) {
    c.font = fontFor(size);
    let w = c.measureText(text).width;
    if (w <= room) return { text: text, size: size };
    const smaller = Math.max(9, size * 0.75, size * room / w);
    c.font = fontFor(smaller);
    w = c.measureText(text).width;
    if (w <= room) return { text: text, size: smaller };
    let cut = text;
    while (cut.length > 1 && c.measureText(cut + "…").width > room) cut = cut.slice(0, -1);
    return { text: cut.trim() + "…", size: smaller };
  }

  /* One pie slice, in wheel coordinates (segment 0 starting at the
     top), ready to fill or stroke. */
  function wedge(c, G, i, n) {
    const seg = 360 / n;
    const a1 = (i * seg - 90) * Math.PI / 180;
    const a2 = ((i + 1) * seg - 90) * Math.PI / 180;
    c.beginPath();
    c.moveTo(G.c, G.c);
    if (n === 1) {
      c.arc(G.c, G.c, G.R, 0, Math.PI * 2);
    } else {
      c.arc(G.c, G.c, G.R, a1, a2);
    }
    c.closePath();
  }

  function draw() {
    const G = geometry();
    const n = state.names.length;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, S, S);

    // Navy edge and white ring.
    circle(G.c, G.c, G.outer, NAVY);
    circle(G.c, G.c, G.ring, "#ffffff");

    // The segments, turned to the current angle.
    g.save();
    g.translate(G.c, G.c);
    g.rotate(rotation * Math.PI / 180);
    g.translate(-G.c, -G.c);
    g.drawImage(cache, 0, 0, S, S);

    // After a stop, fade every segment except the winner.
    if (highlight >= 0 && highlight < n && n > 1) {
      g.fillStyle = "rgba(255,255,255,0.55)";
      for (let i = 0; i < n; i++) {
        if (i === highlight) continue;
        wedge(g, G, i, n);
        g.fill();
      }
    }
    g.restore();

    // Rim lights. Alternate ones are lit; lightPhase swaps them.
    for (let i = 0; i < RIM_LIGHTS; i++) {
      const a = (i * 360 / RIM_LIGHTS) * Math.PI / 180;
      const lit = (i + lightPhase) % 2 === 0;
      const x = G.c + G.lightR * Math.cos(a);
      const y = G.c + G.lightR * Math.sin(a);
      g.beginPath();
      g.arc(x, y, (lit ? 5.2 : 4.2) * G.k, 0, Math.PI * 2);
      g.fillStyle = lit ? "#ffc61a" : "#ffe9a8";
      g.fill();
      g.lineWidth = Math.max(0.8, G.k);
      g.strokeStyle = "#e0a800";
      g.stroke();
    }
  }

  function circle(x, y, r, fill) {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fillStyle = fill;
    g.fill();
  }


  /* ----------------------------------------------------------
     THE SPIN
     ---------------------------------------------------------- */
  let spinning = null;       // { from, to, start, dur, index, name, n }
  let pointerKick = 0;
  let lastTick = 0;
  let flashUntil = 0;
  let rafId = null;

  function reducedMotion() {
    return typeof root.matchMedia === "function" &&
      root.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function spin() {
    if (spinning || overlayOpen() || state.names.length === 0) return;

    // Sound can only be started from inside a tap or key press,
    // and this is one.
    if (state.sound) {
      Audio.unlock();
      checkSound();
    }

    const n = state.names.length;
    const index = M.pickIndex(n, M.cryptoUint32);
    const reduced = reducedMotion();
    const dur = reduced
      ? CFG.REDUCED_SPIN_MS
      : CFG.SPIN_MS_MIN + M.cryptoUnit() * (CFG.SPIN_MS_MAX - CFG.SPIN_MS_MIN);
    const turns = reduced ? 2 : CFG.MIN_TURNS + M.pickIndex(CFG.EXTRA_TURNS + 1, M.cryptoUint32);
    const to = M.targetRotation(rotation, index, n, turns, M.cryptoUnit());

    spinning = {
      from: rotation, to: to, start: root.performance.now(), dur: dur,
      index: index, name: state.names[index], n: n,
    };
    highlight = -1;
    setBusy(true);
    say("Spinning…");
    if (state.sound) Audio.drumroll(dur / 1000);
    loop();
  }

  function loop() {
    if (rafId === null) rafId = root.requestAnimationFrame(frame);
  }

  function frame(now) {
    rafId = null;
    let again = false;

    if (spinning) {
      const s = spinning;
      const t = Math.min(1, (now - s.start) / s.dur);
      const next = s.from + (s.to - s.from) * M.easeOut(t);
      const seg = 360 / s.n;

      // Did a segment boundary pass the pointer this frame?
      if (Math.floor(next / seg) !== Math.floor(rotation / seg)) {
        pointerKick = 1;
        // Twenty-five a second is as fast as a tick can usefully
        // go; at the start of a spin boundaries pass faster.
        if (now - lastTick > 40) {
          if (state.sound) Audio.tick();
          lastTick = now;
        }
      }
      rotation = next;
      lightPhase = Math.floor(now / 110) % 2;

      if (t >= 1) {
        rotation = s.to;
        spinning = null;
        landed(s);
      }
      again = true;
    }

    // After a stop the rim lights chase quickly for a moment.
    if (now < flashUntil) {
      lightPhase = Math.floor(now / 80) % 2;
      again = true;
    }

    // The pointer is knocked sideways by each peg and swings back.
    pointerKick *= 0.8;
    if (pointerKick < 0.01) pointerKick = 0; else again = true;
    el.pointer.style.transform = "translateX(-50%) rotate(" + (-24 * pointerKick).toFixed(2) + "deg)";

    draw();
    if (again) loop();
  }

  function landed(s) {
    // The pointer must be over the name that was picked. It always
    // is — wheel-tests.js checks it for every class size — but if
    // it were ever not, the picked name is the one that counts, and
    // the mismatch is printed so it can be reported.
    const under = M.segmentAt(rotation, s.n);
    if (under !== s.index) {
      showMsg("Please report: the wheel stopped on segment " + under +
        " but picked " + s.index + ". The name shown is the one picked.", "mismatch");
    }

    highlight = s.index;
    flashUntil = root.performance.now() + 1800;
    if (state.sound) {
      Audio.stopDrumroll();
      Audio.fanfare();
    }
    setBusy(false);
    openWinner(s.index);
    loop();
  }

  function setBusy(busy) {
    el.stage.classList.toggle("is-spinning", busy);
    [el.spin, el.hub, el.shuffle, el.sort, el.clear, el.restore, el.putBack].forEach(function (b) {
      b.disabled = busy || (b === el.spin || b === el.hub ? state.names.length === 0 : false);
    });
    el.names.readOnly = busy;
    if (!busy) refreshControls();
  }


  /* ----------------------------------------------------------
     THE POP-UP
     ---------------------------------------------------------- */
  let pending = -1;          // index of the name on show

  function overlayOpen() {
    return !el.overlay.hidden;
  }

  function openWinner(index) {
    const n = state.names.length;
    const name = state.names[index];
    const col = CFG.PALETTE[M.colourIndex(index, n, CFG.PALETTE.length)];
    pending = index;

    el.wName.textContent = name;
    el.wName.style.background = col.fill;
    el.wName.style.color = col.ink;
    el.wMeta.innerHTML = "Pick <b>#" + (state.picked.length + 1) + "</b> &nbsp;·&nbsp; <b>" +
      n + "</b> " + (n === 1 ? "name" : "names") + " on the wheel";

    el.overlay.hidden = false;
    el.main.inert = true;
    fitName();
    Confetti.burst();
    el.remove.focus();
    say("The wheel picked " + name + ".");
  }

  /* Shrink the name until it fits on one line. A very long full
     name ("... bin ...") is allowed to wrap onto two lines rather
     than become too small to read. */
  function fitName() {
    const nm = el.wName;
    nm.style.whiteSpace = "nowrap";
    let size = Math.min(112, Math.max(44, root.innerWidth * 0.075));
    nm.style.fontSize = size + "px";
    while (nm.scrollWidth > nm.clientWidth && size > 40) {
      size -= 4;
      nm.style.fontSize = size + "px";
    }
    if (nm.scrollWidth > nm.clientWidth) nm.style.whiteSpace = "normal";
  }

  function closeWinner(remove) {
    if (!overlayOpen()) return;
    const i = pending;
    const name = state.names[i];
    if (i >= 0 && name !== undefined) {
      state.picked.push({ name: name, removed: !!remove });
      if (remove) state.names.splice(i, 1);
    }
    pending = -1;
    highlight = -1;
    el.overlay.hidden = true;
    el.main.inert = false;
    Confetti.clear();
    save();
    syncNamesBox();
    rebuild();
    el.spin.focus();
  }


  /* ----------------------------------------------------------
     THE NAMES BOX AND THE HISTORY
     ---------------------------------------------------------- */
  let typingTimer = null;

  function syncNamesBox() {
    el.names.value = state.names.join("\n");
  }

  function onType() {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(function () {
      let list = M.parseNames(el.names.value);
      if (list.length > CFG.MAX_NAMES) list = list.slice(0, CFG.MAX_NAMES);
      state.names = list;
      highlight = -1;
      save();
      rebuild();
    }, 250);
  }

  function rebuild() {
    buildCache();
    draw();
    refreshControls();
  }

  function refreshControls() {
    const n = state.names.length;
    el.count.textContent = n;
    el.countText.textContent = n === 0 ? "names yet — type some in the box" :
      (n === 1 ? "name on the wheel" : "names on the wheel");
    el.nameCount.textContent = n;
    el.canvas.setAttribute("aria-label", "A wheel of " + n + (n === 1 ? " name" : " names"));

    if (!spinning) {
      el.spin.disabled = n === 0;
      el.hub.disabled = n === 0;
    }

    // Sample names still showing?
    const sample = CFG.SAMPLE && n > 0 && state.names.every(function (x) {
      return CFG.CLASS_NAMES.indexOf(x) !== -1;
    });
    el.sample.hidden = !sample;

    if (n > CFG.COMFORT_NAMES) {
      showMsg(n + " names is a lot for one wheel — the names get small." +
        (n >= CFG.MAX_NAMES ? " Only the first " + CFG.MAX_NAMES + " are used." : ""), "size");
    } else {
      clearMsg("size");
    }

    renderPicked();
  }

  function renderPicked() {
    const list = state.picked;
    el.pickedCount.textContent = list.length;
    el.pickedNone.hidden = list.length > 0;
    el.putBack.hidden = list.length === 0;
    el.picked.innerHTML = "";
    list.forEach(function (p, i) {
      const col = CFG.PALETTE[i % CFG.PALETTE.length];
      const chip = doc.createElement("li");
      chip.className = "nw-chip" + (p.removed ? "" : " is-kept");
      if (!p.removed) chip.title = "Kept on the wheel";
      const num = doc.createElement("span");
      num.className = "nw-chip-num";
      num.style.background = col.fill;
      num.style.color = col.ink;
      num.textContent = i + 1;
      chip.appendChild(num);
      chip.appendChild(doc.createTextNode(p.name));
      if (!p.removed) {
        const k = doc.createElement("span");
        k.className = "nw-chip-kept";
        k.textContent = "kept";
        chip.appendChild(k);
      }
      el.picked.appendChild(chip);
    });
  }

  function putEveryoneBack() {
    const back = state.picked.filter(function (p) { return p.removed; }).map(function (p) { return p.name; });
    state.names = state.names.concat(back).slice(0, CFG.MAX_NAMES);
    state.picked = [];
    highlight = -1;
    save();
    syncNamesBox();
    rebuild();
    say("Everyone is back on the wheel.");
  }


  /* ----------------------------------------------------------
     SOUND AND FULL SCREEN BUTTONS
     ---------------------------------------------------------- */
  function renderSound() {
    el.soundBtn.setAttribute("aria-pressed", state.sound ? "true" : "false");
    el.soundLabel.textContent = state.sound ? "Sound on" : "Sound off";
    el.soundBtn.classList.toggle("is-off", !state.sound);
  }

  /* If sound was asked for but will not start, say so on the page
     with the browser's own reason, rather than just being quiet. */
  function checkSound() {
    const err = Audio.lastError();
    if (err) { showMsg(err, "sound"); return; }
    setTimeout(function () {
      if (!state.sound) return;
      const st = Audio.state();
      if (st !== "running") {
        showMsg("Sound is not playing (the browser reports \"" + st + "\"). " +
          "Check the volume, or on an iPhone the silent switch." +
          (Audio.lastError() ? " " + Audio.lastError() : ""), "sound");
      } else {
        clearMsg("sound");
      }
    }, 900);
  }

  let fsByApi = false;

  function toggleFull() {
    const on = !doc.body.classList.contains("nw-full");
    if (on) {
      doc.body.classList.add("nw-full");
      const d = doc.documentElement;
      const req = d.requestFullscreen || d.webkitRequestFullscreen;
      if (req) {
        try {
          const p = req.call(d);
          fsByApi = true;
          if (p && typeof p.catch === "function") p.catch(function () { fsByApi = false; });
        } catch (e) { fsByApi = false; }
      }
    } else {
      doc.body.classList.remove("nw-full");
      const exit = doc.exitFullscreen || doc.webkitExitFullscreen;
      if (fsElement() && exit) exit.call(doc);
      fsByApi = false;
    }
    renderFull();
    layout();
  }

  function fsElement() {
    return doc.fullscreenElement || doc.webkitFullscreenElement || null;
  }

  /* Esc in real full screen is handled by the browser itself —
     the page only hears that full screen ended, and follows. */
  function onFsChange() {
    if (!fsElement() && fsByApi) {
      fsByApi = false;
      doc.body.classList.remove("nw-full");
      renderFull();
      layout();
    }
  }

  function renderFull() {
    const on = doc.body.classList.contains("nw-full");
    el.fsLabel.textContent = on ? "Exit full screen" : "Full screen";
    el.fsBtn.setAttribute("aria-pressed", on ? "true" : "false");
  }


  /* ----------------------------------------------------------
     SMALL HELPERS
     ---------------------------------------------------------- */
  /* One message line under the wheel. "kind" lets a later check
     clear only its own message — the size warning must not wipe
     out a sound error, or the other way round. */
  function showMsg(text, kind) {
    el.msg.textContent = text;
    el.msg.hidden = !text;
    el.msg.dataset.kind = text ? (kind || "other") : "";
  }

  function clearMsg(kind) {
    if (el.msg.dataset.kind === kind) showMsg("");
  }

  function say(text) {
    el.live.textContent = text;
  }

  function isTyping(t) {
    return t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.isContentEditable);
  }


  /* ----------------------------------------------------------
     WIRING
     ---------------------------------------------------------- */
  function wire() {
    el.spin.addEventListener("click", spin);
    el.hub.addEventListener("click", spin);

    el.remove.addEventListener("click", function () { closeWinner(true); });
    el.keep.addEventListener("click", function () { closeWinner(false); });

    el.names.addEventListener("input", onType);

    el.shuffle.addEventListener("click", function () {
      state.names = M.shuffle(state.names);
      highlight = -1; save(); syncNamesBox(); rebuild();
    });
    el.sort.addEventListener("click", function () {
      state.names = state.names.slice().sort(function (a, b) {
        return a.localeCompare(b, undefined, { sensitivity: "base" });
      });
      highlight = -1; save(); syncNamesBox(); rebuild();
    });
    el.clear.addEventListener("click", function () {
      if (state.names.length === 0) return;
      if (!root.confirm("Take every name off the wheel?")) return;
      state.names = [];
      highlight = -1; save(); syncNamesBox(); rebuild();
      el.names.focus();
    });
    el.restore.addEventListener("click", function () {
      if (!root.confirm("Replace the names with the saved class list, and clear who has been picked?")) return;
      const s = fresh();
      state.names = s.names;
      state.picked = [];
      highlight = -1; save(); syncNamesBox(); rebuild();
    });
    el.putBack.addEventListener("click", putEveryoneBack);

    el.soundBtn.addEventListener("click", function () {
      state.sound = !state.sound;
      Audio.setEnabled(state.sound);
      if (state.sound) { Audio.unlock(); checkSound(); }
      else clearMsg("sound");
      save();
      renderSound();
    });
    el.fsBtn.addEventListener("click", toggleFull);
    doc.addEventListener("fullscreenchange", onFsChange);
    doc.addEventListener("webkitfullscreenchange", onFsChange);

    doc.addEventListener("keydown", function (e) {
      if (overlayOpen()) {
        if (e.key === "Escape") { e.preventDefault(); closeWinner(false); }
        // Enter removes — unless Keep has been tabbed to. Handled
        // here rather than left to the focused button, so it works
        // even if focus has wandered off the buttons.
        if (e.key === "Enter") {
          e.preventDefault();
          closeWinner(doc.activeElement !== el.keep);
        }
        // Keep Tab inside the pop-up.
        if (e.key === "Tab") {
          e.preventDefault();
          (doc.activeElement === el.remove ? el.keep : el.remove).focus();
        }
        return;
      }
      if (isTyping(e.target)) return;
      // A focused button already answers Space and Enter itself.
      if (e.target && e.target.tagName === "BUTTON") return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        spin();
      }
    });

    let resizeTimer = null;
    root.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        layout();
        if (overlayOpen()) fitName();
      }, 120);
    });
  }

  function start() {
    Audio.setEnabled(state.sound);
    Confetti.attach(el.confetti, CFG.PALETTE.map(function (p) { return p.fill; }));
    renderSound();
    renderFull();
    syncNamesBox();
    wire();
    layout();
    refreshControls();
    save();
  }

  /* If anything goes wrong while starting, print the actual error
     on the page. A blank wheel with no explanation costs a whole
     round of guessing. */
  try {
    start();
  } catch (e) {
    const box = $("wheelMsg");
    if (box) {
      box.hidden = false;
      box.textContent = "The wheel could not start: " + (e && e.message ? e.message : e);
    }
    throw e;
  }

})(window);
