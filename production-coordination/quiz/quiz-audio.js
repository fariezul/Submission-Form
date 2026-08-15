/* ============================================================
   quiz-audio.js — ARCADE SOUND, GENERATED IN THE BROWSER
   ============================================================
   Every sound here is synthesised live with the Web Audio API.
   There are no .mp3 files, which means:

     - nothing extra to host or download
     - no licensing question at all, since no recording is used
     - the sounds start instantly, with no loading delay

   Browsers refuse to play audio until the user has interacted
   with the page, so nothing is created until the first tap. See
   unlock() below.
   ============================================================ */

"use strict";

(function (root) {

  let ctx = null;          // the AudioContext — made on first use
  let masterGain = null;   // one volume knob for everything
  let musicNodes = [];     // the looping background parts
  let musicOn = false;
  let enabled = true;      // the 🔊 / 🔇 toggle

  /* Background music sits well below the effects so it never
     competes with reading the question. */
  const MUSIC_VOLUME = 0.045;
  const EFFECT_VOLUME = 0.16;


  /* ----------------------------------------------------------
     SET-UP
     ---------------------------------------------------------- */

  function supported() {
    return typeof (root.AudioContext || root.webkitAudioContext) === "function";
  }

  /* Called from the first real user gesture (tapping START, or
     any answer). Safe to call repeatedly. */
  function unlock() {
    if (!supported()) return false;

    if (ctx === null) {
      const Ctor = root.AudioContext || root.webkitAudioContext;
      ctx = new Ctor();
      masterGain = ctx.createGain();
      masterGain.gain.value = enabled ? 1 : 0;
      masterGain.connect(ctx.destination);
    }

    // Safari and Chrome park the context until a gesture happens.
    if (ctx.state === "suspended" && typeof ctx.resume === "function") {
      ctx.resume().catch(function () { /* not fatal — stay silent */ });
    }
    return true;
  }

  function ready() {
    return enabled && ctx !== null && ctx.state === "running";
  }


  /* ----------------------------------------------------------
     ONE BUILDING BLOCK: A SINGLE TONE
     ----------------------------------------------------------
     An oscillator makes the pitch; a gain node shapes how it
     fades in and out. Without that shaping a tone starts and
     stops with an audible click.
     ---------------------------------------------------------- */
  /* Schedule a tone relative to "now". Used by the sound effects,
     which always fire in response to something the student just
     did. */
  function tone(opts) {
    if (!ready()) return;
    return toneAt(ctx.currentTime + (opts.delay || 0), opts);
  }

  /* Schedule a tone at an ABSOLUTE moment on the audio clock.
     The music sequencer needs this: notes have to be placed on an
     exact grid, worked out in advance, or the rhythm audibly
     stumbles every time the browser is busy. */
  function toneAt(startAt, opts) {
    if (!ready()) return;

    const duration = opts.duration || 0.12;
    const volume = (opts.volume == null ? EFFECT_VOLUME : opts.volume);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = opts.wave || "square";     // square = classic arcade
    osc.frequency.setValueAtTime(opts.freq, startAt);

    // A glide to a second pitch, used for the celebration whoops.
    if (opts.toFreq) {
      osc.frequency.exponentialRampToValueAtTime(opts.toFreq, startAt + duration);
    }

    // Quick attack, smooth decay.
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(startAt);
    osc.stop(startAt + duration + 0.02);
    return osc;
  }

  /* A short burst of filtered noise — used for the confetti
     "pop" on a perfect score, and for the hi-hat in the music. */
  function noiseBurst(delay, duration, volume, highpass) {
    if (!ready()) return;
    return noiseAt(ctx.currentTime + (delay || 0), duration, volume, highpass);
  }

  function noiseAt(startAt, duration, volume, highpass) {
    if (!ready()) return;

    const length = Math.floor(ctx.sampleRate * (duration || 0.2));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // White noise that fades out across the buffer.
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    // Higher cutoff = thinner, more "tss" — that is what makes a
    // hi-hat sound like a hi-hat rather than a burst of static.
    filter.frequency.value = highpass || 1200;

    const gain = ctx.createGain();
    gain.gain.value = volume == null ? 0.12 : volume;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    source.start(startAt);
    return source;
  }


  /* ----------------------------------------------------------
     THE SOUND EFFECTS
     ---------------------------------------------------------- */

  /* A soft tick under the finger. Deliberately quiet — it fires
     often. */
  function tap() {
    tone({ freq: 320, duration: 0.05, volume: 0.05, wave: "triangle" });
  }

  function select() {
    tone({ freq: 520, duration: 0.06, volume: 0.07, wave: "triangle" });
  }

  /* Rising major arpeggio — reads as "yes" almost universally. */
  function correct() {
    tone({ freq: 660, duration: 0.10, delay: 0.00 });   // E5
    tone({ freq: 880, duration: 0.10, delay: 0.09 });   // A5
    tone({ freq: 1320, duration: 0.16, delay: 0.18 });  // E6
  }

  /* Two falling notes on a saw wave — clearly negative, but
     short and not harsh. It says "no" without saying what the
     right answer was. */
  function wrong() {
    tone({ freq: 200, duration: 0.16, volume: 0.13, wave: "sawtooth" });
    tone({ freq: 150, duration: 0.24, volume: 0.13, wave: "sawtooth", delay: 0.13 });
  }

  /* Plays once when the clock drops under a minute, and again
     under twenty seconds. */
  function warning() {
    tone({ freq: 880, duration: 0.09, volume: 0.10 });
    tone({ freq: 880, duration: 0.09, volume: 0.10, delay: 0.16 });
  }

  /* The consolation sting on a failed attempt. */
  function fail() {
    tone({ freq: 392, duration: 0.18, volume: 0.11, wave: "triangle" });
    tone({ freq: 330, duration: 0.18, volume: 0.11, wave: "triangle", delay: 0.16 });
    tone({ freq: 262, duration: 0.34, volume: 0.11, wave: "triangle", delay: 0.32 });
  }

  /* The 30/30 fanfare: a rising run, a held chord, then pops. */
  function celebrate() {
    const run = [523, 659, 784, 1047, 1319];              // C E G C E
    run.forEach(function (f, i) {
      tone({ freq: f, duration: 0.14, delay: i * 0.10, volume: 0.15 });
    });

    // Held triad on top of the run.
    [784, 1047, 1319].forEach(function (f) {
      tone({ freq: f, duration: 0.9, delay: 0.55, volume: 0.10, wave: "triangle" });
    });

    // Two upward whoops.
    tone({ freq: 400, toFreq: 1600, duration: 0.35, delay: 0.75, volume: 0.10, wave: "sawtooth" });
    tone({ freq: 500, toFreq: 2000, duration: 0.35, delay: 1.05, volume: 0.09, wave: "sawtooth" });

    noiseBurst(0.60, 0.30, 0.10);
    noiseBurst(0.95, 0.30, 0.09);
    noiseBurst(1.30, 0.35, 0.08);
  }


  /* ----------------------------------------------------------
     BACKGROUND MUSIC — a game-show loop
     ----------------------------------------------------------
     The first version of this was a slow pad holding one chord
     per bar. It was inoffensive and completely forgettable, which
     is the wrong thing for a timed challenge: what carries energy
     is RHYTHM, not harmony. So this is a proper little sequencer
     instead — a driving bassline, a syncopated arpeggio hook, a
     kick and an off-beat hat, over a four-bar chord progression
     at 128 BPM.

     Two things make it work:

     1. A STEP GRID. The loop is 4 bars of 16 sixteenth-notes.
        Each instrument is just a list of steps it plays on, which
        makes the groove easy to read and easy to change.

     2. LOOKAHEAD SCHEDULING. setInterval is far too imprecise for
        music — every busy frame would push a note late and the
        beat would audibly stumble. So a coarse timer wakes up
        often and books notes onto the audio clock a fraction of a
        second AHEAD, at exact times. The timer can drift as much
        as it likes; the notes still land on the grid.

     It stays quiet enough to read over, and the 🔇 toggle silences
     it completely.
     ---------------------------------------------------------- */

  const BPM = 128;
  const STEPS_PER_BAR = 16;                       // sixteenth notes
  const STEP_SECONDS = 60 / BPM / 4;              // ≈ 0.117 s
  const BARS = 4;
  const TOTAL_STEPS = STEPS_PER_BAR * BARS;

  /* Am – F – C – G. A well-worn progression, and well-worn for a
     reason: it sounds upbeat and resolves cleanly, so it can loop
     for ten minutes without grating. */
  const PROGRESSION = [
    { root: 110.00, triad: [440.00, 523.25, 659.25] },  // Am
    { root:  87.31, triad: [349.23, 440.00, 523.25] },  // F
    { root: 130.81, triad: [523.25, 659.25, 783.99] },  // C
    { root:  98.00, triad: [392.00, 493.88, 587.33] },  // G
  ];

  /* Which sixteenths each part plays on, within a bar. */
  const BASS_STEPS  = [0, 2, 4, 6, 8, 10, 12, 14];  // straight eighths — the drive
  const ARP_STEPS   = [0, 3, 6, 8, 11, 14];         // syncopated — the hook
  const KICK_STEPS  = [0, 8];                       // beats 1 and 3
  const SNARE_STEPS = [4, 12];                      // beats 2 and 4 — the backbeat
  const HAT_STEPS   = [2, 6, 10, 14];               // the eighths between

  /* Balance. Kick and bass carry the pulse, the snare gives it a
     backbeat to nod along to, and the arp is the part you
     actually hum — so it sits just under them. Everything is
     scaled from MUSIC_VOLUME, which is deliberately far below the
     sound effects: this plays for ten minutes under a page people
     are trying to read. */
  const BASS_VOLUME  = MUSIC_VOLUME * 1.15;
  const ARP_VOLUME   = MUSIC_VOLUME * 0.72;
  const KICK_VOLUME  = MUSIC_VOLUME * 1.65;
  const SNARE_VOLUME = MUSIC_VOLUME * 0.55;
  const HAT_VOLUME   = MUSIC_VOLUME * 0.22;

  const SCHEDULE_AHEAD = 0.25;   // seconds of music booked in advance
  const TICK_MS = 60;            // how often we top that booking up

  let musicTimer = null;
  let currentStep = 0;
  let nextStepTime = 0;

  /* A kick drum: a sine whose pitch drops fast. The drop is what
     the ear reads as "thump" rather than "beep". */
  function kickAt(startAt) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(150, startAt);
    osc.frequency.exponentialRampToValueAtTime(45, startAt + 0.11);

    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(KICK_VOLUME, startAt + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.16);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(startAt);
    osc.stop(startAt + 0.2);
    musicNodes.push(osc);
  }

  /* Book one sixteenth-note of the loop. */
  function scheduleStep(step, time) {
    const bar = Math.floor(step / STEPS_PER_BAR);
    const inBar = step % STEPS_PER_BAR;
    const chord = PROGRESSION[bar % PROGRESSION.length];
    const isLastBar = bar === BARS - 1;

    // --- bass ---
    if (BASS_STEPS.indexOf(inBar) !== -1) {
      // Accent the downbeats so the bar has a shape.
      const accent = (inBar % 8 === 0) ? 1 : 0.66;
      const osc = toneAt(time, {
        freq: chord.root,
        duration: 0.10,
        volume: BASS_VOLUME * accent,
        wave: "sawtooth",
      });
      if (osc) musicNodes.push(osc);
    }

    // --- arpeggio ---
    const arpIndex = ARP_STEPS.indexOf(inBar);
    if (arpIndex !== -1) {
      const osc = toneAt(time, {
        // Walk up the triad, and drop an octave on the last note
        // so the phrase turns around instead of climbing forever.
        freq: chord.triad[arpIndex % 3] / (arpIndex === 5 ? 2 : 1),
        duration: 0.13,
        volume: ARP_VOLUME,
        wave: "square",
      });
      if (osc) musicNodes.push(osc);
    }

    // --- kick ---
    if (KICK_STEPS.indexOf(inBar) !== -1) kickAt(time);

    /* --- snare, on beats 2 and 4 ---
       This is the one that turns a pulse into a groove. Without a
       backbeat the loop just ticks along; with it, there is
       something to nod to. Lower cutoff than the hat so it reads
       as a "crack" rather than a "tss". */
    if (SNARE_STEPS.indexOf(inBar) !== -1) {
      const src = noiseAt(time, 0.09, SNARE_VOLUME, 2200);
      if (src) musicNodes.push(src);
    }

    // --- hat ---
    if (HAT_STEPS.indexOf(inBar) !== -1) {
      const src = noiseAt(time, 0.035, HAT_VOLUME, 7000);
      if (src) musicNodes.push(src);
    }

    /* A one-bar fill at the end of the loop. Without it, four bars
       of the same pattern start to feel like a stuck record; with
       it, the loop sounds like it goes somewhere and comes back. */
    if (isLastBar && inBar === 14) kickAt(time);
    if (isLastBar && (inBar === 13 || inBar === 15)) {
      const src = noiseAt(time, 0.03, HAT_VOLUME * 1.3, 7000);
      if (src) musicNodes.push(src);
    }
  }

  /* The lookahead loop. It only ever asks "is the next step due
     soon?" — the audio clock does the precise timing. */
  function scheduler() {
    if (!ready() || !musicOn) return;

    while (nextStepTime < ctx.currentTime + SCHEDULE_AHEAD) {
      scheduleStep(currentStep, nextStepTime);
      nextStepTime += STEP_SECONDS;
      currentStep = (currentStep + 1) % TOTAL_STEPS;
    }

    // Nodes finish on their own; this list exists only so
    // stopMusic can silence anything already booked. Keep it
    // short — a ten-minute game would otherwise collect thousands.
    if (musicNodes.length > 120) musicNodes = musicNodes.slice(-40);
  }

  function startMusic() {
    if (!supported() || musicOn) return;
    unlock();
    if (!ready()) return;

    musicOn = true;
    currentStep = 0;
    // A beat of breathing room so the first notes are not booked
    // in the past on a slow device.
    nextStepTime = ctx.currentTime + 0.08;

    scheduler();
    musicTimer = root.setInterval(scheduler, TICK_MS);
  }

  function stopMusic() {
    musicOn = false;
    if (musicTimer !== null) {
      root.clearInterval(musicTimer);
      musicTimer = null;
    }
    // Silence the quarter-second that was already booked, so the
    // music stops when the student expects it to.
    musicNodes.forEach(function (n) {
      try { n.stop(); } catch (e) { /* already finished */ }
    });
    musicNodes = [];
  }


  /* ----------------------------------------------------------
     THE MUTE TOGGLE
     ----------------------------------------------------------
     Muting drops the master gain to zero rather than tearing the
     audio graph down, so unmuting is instant. The preference is
     kept in sessionStorage: it survives moving between screens
     but is forgotten when the tab closes.
     ---------------------------------------------------------- */
  const STORAGE_KEY = "zdr-sound";

  function loadPreference() {
    try {
      const saved = root.sessionStorage.getItem(STORAGE_KEY);
      if (saved !== null) enabled = saved === "on";
    } catch (e) {
      // Private mode can block storage. The default (on) is fine.
    }
    return enabled;
  }

  function savePreference() {
    try {
      root.sessionStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
    } catch (e) { /* ignore */ }
  }

  function setEnabled(value) {
    enabled = !!value;
    savePreference();
    if (masterGain && ctx) {
      // A 60 ms ramp instead of a jump, to avoid a click.
      masterGain.gain.setTargetAtTime(enabled ? 1 : 0, ctx.currentTime, 0.02);
    }
    return enabled;
  }

  function isEnabled() {
    return enabled;
  }


  root.QuizAudio = {
    supported: supported,
    unlock: unlock,
    loadPreference: loadPreference,
    setEnabled: setEnabled,
    isEnabled: isEnabled,
    startMusic: startMusic,
    stopMusic: stopMusic,
    tap: tap,
    select: select,
    correct: correct,
    wrong: wrong,
    warning: warning,
    fail: fail,
    celebrate: celebrate,
  };

})(typeof window !== "undefined" ? window : globalThis);
