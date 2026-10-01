/* ============================================================
   quiz-celebration.js — CONFETTI AND FIREWORKS
   ============================================================
   Drawn on a <canvas> with about a hundred lines of plain
   JavaScript, rather than pulling in a library. The effect is
   simple enough that a dependency would cost more (a download,
   a version to keep an eye on) than it saves.

   Two things keep it smooth on a mid-range phone:

     - one canvas and one animation loop, not one element per
       particle
     - a hard particle cap, and the loop stops itself the moment
       the last particle leaves the screen

   If the visitor has asked their device to reduce motion, the
   animation is skipped entirely — the result screen still says
   everything it needs to in words.
   ============================================================ */

"use strict";

(function (root) {

  const COLOURS = [
    "#ffd23f", "#ff6b35", "#f72585", "#4cc9f0",
    "#38b000", "#b5179e", "#ffffff",
  ];

  const MAX_PARTICLES = 220;

  let canvas = null;
  let ctx = null;
  let particles = [];
  let frame = null;
  let running = false;

  function prefersReducedMotion() {
    return (
      typeof root.matchMedia === "function" &&
      root.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  /* Match the canvas to the screen, allowing for high-density
     displays so the shapes are not blurry. */
  function sizeCanvas() {
    if (!canvas) return;
    const dpr = Math.min(root.devicePixelRatio || 1, 2);   // cap at 2 — 3x costs a lot for no visible gain
    canvas.width = Math.floor(root.innerWidth * dpr);
    canvas.height = Math.floor(root.innerHeight * dpr);
    canvas.style.width = root.innerWidth + "px";
    canvas.style.height = root.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function ensureCanvas() {
    if (canvas) return true;

    canvas = root.document.getElementById("celebrationCanvas");
    if (!canvas) return false;

    ctx = canvas.getContext("2d");
    if (!ctx) return false;

    sizeCanvas();
    root.addEventListener("resize", sizeCanvas);
    return true;
  }

  /* One piece of confetti: a small rectangle that falls, drifts
     sideways and tumbles. */
  function makeConfetti(x, y) {
    return {
      kind: "confetti",
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * -9 - 3,
      size: Math.random() * 7 + 4,
      colour: COLOURS[Math.floor(Math.random() * COLOURS.length)],
      spin: (Math.random() - 0.5) * 0.3,
      angle: Math.random() * Math.PI * 2,
      life: 1,
      decay: 0.006 + Math.random() * 0.006,
    };
  }

  /* One firework spark: a dot thrown out from a centre point
     that fades as it slows. */
  function makeSpark(x, y, colour) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 6 + 2;
    return {
      kind: "spark",
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: Math.random() * 3 + 1.5,
      colour: colour,
      life: 1,
      decay: 0.012 + Math.random() * 0.012,
    };
  }

  function add(newOnes) {
    for (const p of newOnes) {
      if (particles.length >= MAX_PARTICLES) break;
      particles.push(p);
    }
    start();
  }

  function step() {
    const w = root.innerWidth;
    const h = root.innerHeight;

    ctx.clearRect(0, 0, w, h);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;

      if (p.kind === "confetti") {
        p.vy += 0.22;          // gravity
        p.vx *= 0.995;         // air resistance
        p.angle += p.spin;
      } else {
        p.vy += 0.08;
        p.vx *= 0.97;
        p.vy *= 0.97;
      }

      // Gone: faded out, or fallen off the bottom.
      if (p.life <= 0 || p.y > h + 40) {
        particles.splice(i, 1);
        continue;
      }

      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.fillStyle = p.colour;

      if (p.kind === "confetti") {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;

    if (particles.length > 0) {
      frame = root.requestAnimationFrame(step);
    } else {
      running = false;
      frame = null;
    }
  }

  function start() {
    if (running || !ctx) return;
    running = true;
    frame = root.requestAnimationFrame(step);
  }

  /* A burst of confetti from the bottom two corners. */
  function confettiBurst() {
    if (!ensureCanvas() || prefersReducedMotion()) return;

    const h = root.innerHeight;
    const w = root.innerWidth;
    const batch = [];

    for (let i = 0; i < 45; i++) batch.push(makeConfetti(w * 0.08, h));
    for (let i = 0; i < 45; i++) batch.push(makeConfetti(w * 0.92, h));

    // Aim the two fountains inwards.
    batch.forEach(function (p, i) {
      p.vx = (i < 45 ? 1 : -1) * (Math.random() * 5 + 1.5);
    });

    add(batch);
  }

  /* A firework at a random point in the upper half. */
  function firework() {
    if (!ensureCanvas() || prefersReducedMotion()) return;

    const x = root.innerWidth * (0.2 + Math.random() * 0.6);
    const y = root.innerHeight * (0.15 + Math.random() * 0.3);
    const colour = COLOURS[Math.floor(Math.random() * COLOURS.length)];

    const batch = [];
    for (let i = 0; i < 34; i++) batch.push(makeSpark(x, y, colour));
    add(batch);
  }

  /* The full 30/30 show: confetti straight away, then fireworks
     arriving over the next few seconds. */
  function celebrate() {
    if (!ensureCanvas() || prefersReducedMotion()) return;

    confettiBurst();

    const timings = [400, 900, 1500, 2100, 2800, 3600];
    timings.forEach(function (ms) { root.setTimeout(firework, ms); });

    root.setTimeout(confettiBurst, 1800);
    root.setTimeout(confettiBurst, 3200);
  }

  /* Called when leaving the results screen, so nothing keeps
     animating in the background. */
  function stop() {
    particles = [];
    if (frame !== null) {
      root.cancelAnimationFrame(frame);
      frame = null;
    }
    running = false;
    if (ctx) ctx.clearRect(0, 0, root.innerWidth, root.innerHeight);
  }


  root.QuizCelebration = {
    celebrate: celebrate,
    confettiBurst: confettiBurst,
    firework: firework,
    stop: stop,
    prefersReducedMotion: prefersReducedMotion,
  };

})(window);
