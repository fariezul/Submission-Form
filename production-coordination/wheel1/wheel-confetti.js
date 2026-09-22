/* ============================================================
   wheel-confetti.js — THE CONFETTI WHEN A NAME IS PICKED
   ============================================================
   Two cannons fire from the bottom corners of the screen and the
   pieces flutter down. One <canvas> and one animation loop, not
   one element per piece, so it stays smooth on a school laptop;
   and the loop stops itself as soon as the last piece has left
   the screen.

   It is drawn behind the winner card, so it never covers the
   name. Anyone who has asked their device to reduce motion gets
   no confetti at all.
   ============================================================ */

"use strict";

(function (root) {

  const MAX = 260;

  let canvas = null;
  let g = null;
  let parts = [];
  let frame = null;
  let colours = ["#f0286e", "#ffc61a", "#1e7bf0", "#ff7a1a", "#8a4dff", "#8ad62a"];

  function reducedMotion() {
    return typeof root.matchMedia === "function" &&
      root.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function attach(el, palette) {
    canvas = el;
    g = canvas.getContext("2d");
    if (palette && palette.length) colours = palette;
    root.addEventListener("resize", size);
  }

  function size() {
    if (!canvas) return;
    const dpr = Math.min(root.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(root.innerWidth * dpr);
    canvas.height = Math.floor(root.innerHeight * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function piece(x, y, angle, speed) {
    return {
      x: x, y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      w: 7 + Math.random() * 8,
      h: 5 + Math.random() * 10,
      spin: Math.random() * Math.PI * 2,
      spinV: (Math.random() - 0.5) * 0.35,
      flip: Math.random() * Math.PI * 2,
      flipV: 0.08 + Math.random() * 0.12,
      round: Math.random() < 0.25,
      colour: colours[Math.floor(Math.random() * colours.length)],
    };
  }

  function burst() {
    if (!canvas || reducedMotion()) return;
    size();
    const W = root.innerWidth, H = root.innerHeight;
    const scale = Math.max(0.7, Math.min(1.4, W / 1400));
    parts = [];
    for (let i = 0; i < MAX; i++) {
      const left = i % 2 === 0;
      // Aim up and in, with plenty of scatter.
      const aim = left ? -Math.PI / 3 : -2 * Math.PI / 3;
      const angle = aim + (Math.random() - 0.5) * 0.9;
      const speed = (11 + Math.random() * 12) * scale;
      parts.push(piece(left ? -10 : W + 10, H * (0.75 + Math.random() * 0.2), angle, speed));
    }
    if (frame === null) frame = root.requestAnimationFrame(step);
  }

  function step() {
    const W = root.innerWidth, H = root.innerHeight;
    g.clearRect(0, 0, W, H);
    let alive = 0;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.y > H + 40) continue;
      alive++;
      p.vy += 0.32;                 // gravity
      p.vx *= 0.985;                // air
      p.vy *= 0.985;
      if (p.vy > 5.5) p.vy = 5.5;   // flutter, don't plummet
      p.x += p.vx + Math.sin(p.flip) * 0.8;
      p.y += p.vy;
      p.spin += p.spinV;
      p.flip += p.flipV;

      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.spin);
      g.scale(1, Math.abs(Math.cos(p.flip)) * 0.8 + 0.2);   // the paper turning over
      g.fillStyle = p.colour;
      if (p.round) {
        g.beginPath();
        g.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        g.fill();
      } else {
        g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      g.restore();
    }
    if (alive > 0) {
      frame = root.requestAnimationFrame(step);
    } else {
      frame = null;
      parts = [];
    }
  }

  function clear() {
    if (frame !== null) root.cancelAnimationFrame(frame);
    frame = null;
    parts = [];
    if (g) g.clearRect(0, 0, root.innerWidth, root.innerHeight);
  }

  root.WheelConfetti = { attach: attach, burst: burst, clear: clear };

})(typeof window !== "undefined" ? window : globalThis);
