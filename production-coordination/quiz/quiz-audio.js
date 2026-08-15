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
  function tone(opts) {
    if (!ready()) return;

    const startAt = ctx.currentTime + (opts.delay || 0);
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
  }

  /* A short burst of filtered noise — used for the confetti
     "pop" on a perfect score. */
  function noiseBurst(delay, duration, volume) {
    if (!ready()) return;

    const startAt = ctx.currentTime + (delay || 0);
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
    filter.frequency.value = 1200;

    const gain = ctx.createGain();
    gain.gain.value = volume == null ? 0.12 : volume;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    source.start(startAt);
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
     BACKGROUND MUSIC
     ----------------------------------------------------------
     A four-chord loop plus a soft pulse on the beat. It is built
     from the same oscillators as the effects, scheduled by a
     repeating timer, and kept very quiet.
     ---------------------------------------------------------- */
  const CHORDS = [
    [220.00, 277.18, 329.63],   // A minor
    [174.61, 220.00, 261.63],   // F major
    [196.00, 246.94, 293.66],   // G major
    [164.81, 207.65, 246.94],   // E minor
  ];
  const BAR_SECONDS = 2.0;
  let musicTimer = null;
  let bar = 0;

  function playBar() {
    if (!ready() || !musicOn) return;

    const chord = CHORDS[bar % CHORDS.length];
    bar++;

    // The pad: three quiet sine notes held for the whole bar.
    chord.forEach(function (freq) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime;

      osc.type = "sine";
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(MUSIC_VOLUME, t + 0.35);
      gain.gain.setValueAtTime(MUSIC_VOLUME, t + BAR_SECONDS - 0.5);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + BAR_SECONDS);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + BAR_SECONDS + 0.05);
      musicNodes.push(osc);
    });

    // A gentle pulse on beats 1 and 3 to keep it moving.
    tone({ freq: chord[0] / 2, duration: 0.10, volume: MUSIC_VOLUME * 1.6, wave: "sine", delay: 0 });
    tone({ freq: chord[0] / 2, duration: 0.10, volume: MUSIC_VOLUME * 1.1, wave: "sine", delay: BAR_SECONDS / 2 });

    // Keep the list from growing all game.
    if (musicNodes.length > 40) musicNodes = musicNodes.slice(-12);
  }

  function startMusic() {
    if (!supported() || musicOn) return;
    unlock();
    if (!ready()) return;

    musicOn = true;
    bar = 0;
    playBar();
    musicTimer = root.setInterval(playBar, BAR_SECONDS * 1000);
  }

  function stopMusic() {
    musicOn = false;
    if (musicTimer !== null) {
      root.clearInterval(musicTimer);
      musicTimer = null;
    }
    musicNodes.forEach(function (n) {
      try { n.stop(); } catch (e) { /* already stopped */ }
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
