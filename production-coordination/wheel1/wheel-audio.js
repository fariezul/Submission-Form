/* ============================================================
   wheel-audio.js — THE DRUMROLL, THE TICKS AND THE TA-DA
   ============================================================
   Every sound is made live in the browser with the Web Audio
   API, the same way Activity 3's quiz does it. There are no
   .mp3 files: nothing to host, nothing to wait for, and no
   licence to worry about.

   THREE SOUNDS
     tick()        one click of a peg on the pointer. The page
                   calls it every time a segment boundary passes
                   the pointer, so the clicks slow down with the
                   wheel on their own.
     drumroll(s)   a snare roll that swells for s seconds — the
                   length of the spin — and stops dead as the
                   wheel stops.
     fanfare()     cymbal crash and a brass "ta-da" as the name
                   appears.

   ONE AUDIO CONTEXT, CREATED ON A TAP
   Browsers keep audio switched off until someone interacts with
   the page, and iPhones and iPads go further: a context created
   outside a tap stays silent for good, even after later taps.
   (CompoSkill XR lost its background music that way.) So the
   single context is made inside the first SPIN tap and reused
   for everything afterwards.

   If sound cannot start, lastError() says why, and the page
   prints it rather than just going quiet.
   ============================================================ */

"use strict";

(function (root) {

  let ctx = null;
  let master = null;
  let noise = null;          // one second of white noise, reused by every hit
  let enabled = true;
  let error = "";
  let rollNodes = [];

  const MASTER_VOLUME = 0.9;

  function supported() {
    return typeof (root.AudioContext || root.webkitAudioContext) === "function";
  }

  /* Call from inside a click or key press. Safe to call often. */
  function unlock() {
    if (!supported()) {
      error = "This browser has no Web Audio support.";
      return false;
    }
    try {
      /* Newer iPhones and iPads: treat this as media playback, so
         the ring/silent switch does not mute the wheel. Older
         ones ignore this line, and there the switch still wins. */
      if (root.navigator && root.navigator.audioSession) {
        try { root.navigator.audioSession.type = "playback"; } catch (e) { /* optional */ }
      }

      if (ctx === null) {
        const Ctor = root.AudioContext || root.webkitAudioContext;
        ctx = new Ctor();
        master = ctx.createGain();
        master.gain.value = enabled ? MASTER_VOLUME : 0;
        master.connect(ctx.destination);
        noise = makeNoise(1.0);
      }
      if (ctx.state === "suspended" && typeof ctx.resume === "function") {
        ctx.resume().catch(function (e) {
          error = "The browser would not start sound: " + (e && e.message ? e.message : e);
        });
      }
      error = "";
      return true;
    } catch (e) {
      error = "Sound could not start: " + (e && e.message ? e.message : e);
      return false;
    }
  }

  function ready() {
    return ctx !== null && ctx.state === "running";
  }

  /* Good enough for sounds booked ahead on the audio clock. On the
     very first tap the context can still be "suspended" for a few
     milliseconds while resume() completes. A drumroll booked in
     that gap plays as soon as the context wakes, so it is allowed.
     A tick is not, because a pile of ticks booked while suspended
     would all fire at once. */
  function usable() {
    return ctx !== null && ctx.state !== "closed";
  }

  function makeNoise(seconds) {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }


  /* ----------------------------------------------------------
     TWO BUILDING BLOCKS
     ---------------------------------------------------------- */

  /* A burst of filtered noise with a sharp attack and a fast
     decay. A snare, a peg click and a cymbal are all this, with
     different filters and lengths. */
  function hitAt(t, opts) {
    const src = ctx.createBufferSource();
    src.buffer = noise;

    const filter = ctx.createBiquadFilter();
    filter.type = opts.type || "bandpass";
    filter.frequency.value = opts.freq || 2000;
    filter.Q.value = opts.q == null ? 0.8 : opts.q;

    const gain = ctx.createGain();
    const dur = opts.dur || 0.08;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(opts.vol, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    // Start somewhere random inside the noise so no two hits are
    // identical — identical hits sound like a machine gun.
    src.start(t, Math.random() * 0.8, dur + 0.05);
    return src;
  }

  /* A pitched note. "brass" runs a sawtooth through a filter that
     opens as the note starts, which is the cheap and cheerful way
     to get a trumpet-ish "bwah". */
  function noteAt(t, freq, dur, vol, wave, brass) {
    const osc = ctx.createOscillator();
    osc.type = wave || "sawtooth";
    osc.frequency.setValueAtTime(freq, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    gain.gain.setValueAtTime(vol, t + Math.max(0.03, dur - 0.12));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    let last = osc;
    if (brass) {
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(700, t);
      lp.frequency.exponentialRampToValueAtTime(3200, t + 0.06);
      lp.frequency.exponentialRampToValueAtTime(1600, t + dur);
      osc.connect(lp);
      last = lp;
    }
    last.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
    return osc;
  }


  /* ----------------------------------------------------------
     THE SOUNDS
     ---------------------------------------------------------- */

  /* A peg clicking on the pointer: a very short, bright noise
     burst with a little wooden "tok" under it. Kept quiet — at
     the start of a spin it fires twenty times a second. */
  function tick() {
    if (!enabled || !ready()) return;
    const t = ctx.currentTime;
    hitAt(t, { freq: 3800, q: 1.2, dur: 0.018, vol: 0.22 });
    noteAt(t, 1250, 0.03, 0.05, "triangle", false);
  }

  /* A snare roll for "seconds", getting steadily louder, with a
     low rumble underneath. Every stroke is booked on the audio
     clock up front, so a busy page cannot make the roll stutter,
     and it ends exactly when the wheel does. */
  function drumroll(seconds) {
    stopDrumroll();
    if (!enabled || !usable()) return;

    const start = ctx.currentTime + 0.02;
    const end = start + seconds;
    const STROKES_PER_SECOND = 26;
    const gap = 1 / STROKES_PER_SECOND;

    for (let t = start, n = 0; t < end; t += gap, n++) {
      const p = (t - start) / seconds;            // 0 → 1 across the roll
      const swell = 0.05 + 0.2 * p * p;           // quiet to loud, mostly at the end
      // Alternate hands: every other stroke a touch softer.
      const hand = n % 2 === 0 ? 1 : 0.72;
      const wobble = 0.85 + Math.random() * 0.3;
      rollNodes.push(hitAt(t + (Math.random() - 0.5) * 0.004, {
        freq: 2400, q: 0.6, dur: 0.07, vol: swell * hand * wobble,
      }));
    }

    // The rumble: low noise that swells with the roll.
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 160;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.35, end - 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, end + 0.05);
    src.connect(lp); lp.connect(g); g.connect(master);
    src.start(start);
    src.stop(end + 0.1);
    rollNodes.push(src);
  }

  function stopDrumroll() {
    rollNodes.forEach(function (n) {
      try { n.stop(); } catch (e) { /* already finished */ }
    });
    rollNodes = [];
  }

  /* The moment the name appears: a kick and a cymbal crash, a
     short "ta" and a long "daaa" in C major, and a sparkle of
     high notes on top. */
  function fanfare() {
    if (!enabled || !usable()) return;
    const t = ctx.currentTime + 0.01;

    // Kick: a sine that drops in pitch fast.
    const k = ctx.createOscillator();
    const kg = ctx.createGain();
    k.type = "sine";
    k.frequency.setValueAtTime(140, t);
    k.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    kg.gain.setValueAtTime(0.0001, t);
    kg.gain.exponentialRampToValueAtTime(0.7, t + 0.006);
    kg.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    k.connect(kg); kg.connect(master);
    k.start(t); k.stop(t + 0.3);

    // Crash cymbal: long, bright, decaying noise.
    hitAt(t, { type: "highpass", freq: 5200, q: 0.5, dur: 1.9, vol: 0.28 });
    hitAt(t, { type: "bandpass", freq: 9000, q: 0.7, dur: 1.2, vol: 0.12 });

    // "Ta" — short.
    [523.25, 659.25, 783.99].forEach(function (f) {
      noteAt(t, f, 0.13, 0.075, "sawtooth", true);
    });
    // "Daaa" — held, an octave on top.
    [523.25, 659.25, 783.99, 1046.5].forEach(function (f) {
      noteAt(t + 0.17, f, 1.25, 0.07, "sawtooth", true);
    });
    // Bass under it.
    noteAt(t + 0.17, 130.81, 1.25, 0.12, "triangle", false);

    // Sparkle.
    [1568, 2093, 2637, 3136].forEach(function (f, i) {
      noteAt(t + 0.3 + i * 0.07, f, 0.22, 0.035, "triangle", false);
    });
  }

  /* The group maker (Activity 2) uses these two, plus fanfare().

     deal(step) — a card flicked onto the table as one student
     lands in a group: a quick swoosh of noise with a small "tok",
     rising gently in pitch with each card so the deal builds. */
  function deal(step) {
    if (!enabled || !ready()) return;
    const t = ctx.currentTime;
    hitAt(t, { type: "bandpass", freq: 1800 + Math.random() * 900, q: 0.9, dur: 0.06, vol: 0.2 });
    const rise = Math.min(1, (step || 0) / 40);
    noteAt(t + 0.01, 520 + rise * 420, 0.05, 0.05, "triangle", false);
  }

  /* sparkle() — the leaders being chosen: a quick run of bells. */
  function sparkle() {
    if (!enabled || !usable()) return;
    const t = ctx.currentTime + 0.01;
    [1319, 1568, 2093, 2637].forEach(function (f, i) {
      noteAt(t + i * 0.06, f, 0.25, 0.05, "triangle", false);
    });
  }

  function setEnabled(on) {
    enabled = !!on;
    if (!enabled) stopDrumroll();
    if (master && ctx) {
      master.gain.setTargetAtTime(enabled ? MASTER_VOLUME : 0, ctx.currentTime, 0.02);
    }
  }

  root.WheelAudio = {
    supported: supported,
    unlock: unlock,
    tick: tick,
    drumroll: drumroll,
    stopDrumroll: stopDrumroll,
    fanfare: fanfare,
    deal: deal,
    sparkle: sparkle,
    setEnabled: setEnabled,
    isEnabled: function () { return enabled; },
    lastError: function () { return error; },
    state: function () { return ctx ? ctx.state : "not started"; },
  };

})(typeof window !== "undefined" ? window : globalThis);
