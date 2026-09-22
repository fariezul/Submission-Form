/* ============================================================
   groups-app.js — THE GROUP MAKER PAGE
   ============================================================
   Needs, loaded before it:
     wheel1/wheel-math.js     WheelMath   (fair shuffle, name clean-up)
     shared/class-list.js     ClassList   (the class, shared with the wheel)
     wheel1/wheel-audio.js    WheelAudio  (deal, sparkle, fanfare)
     wheel1/wheel-confetti.js WheelConfetti
     groups2/groups-math.js   GroupsMath  (how the class is split)

   HOW IT GOES
     1. The class is already in the box (shared with the name
        wheel), or the lecturer pastes it.
     2. They choose a number of groups, or people per group. The
        empty group cards show the plan straight away, and every
        group name can be clicked and renamed — now or later.
     3. MAKE GROUPS! splits the class at random. The students are
        dealt into the cards one at a time, like cards from a
        pack, with a flick for each; then the leaders are starred
        and the ta-da plays.
     4. Afterwards a student can be dragged to another group,
        the groups copied as text or printed.

   WHAT IS SAVED
   The settings, the group names and the last set of groups, in
   this browser's localStorage, so the groups survive the laptop
   being closed between the briefing and the practical. Nothing
   is sent anywhere.
   ============================================================ */

"use strict";

(function (root) {

  const W = root.WheelMath;
  const G = root.GroupsMath;
  const Audio = root.WheelAudio;
  const Confetti = root.WheelConfetti;
  const doc = root.document;

  const KEY = "groups2.state";
  const VERSION = 1;

  const $ = function (id) { return doc.getElementById(id); };

  const el = {
    main:        $("groupsMain"),
    stage:       $("stage"),
    names:       $("namesInput"),
    studentCount:$("studentCount"),
    sample:      $("sampleNote"),
    sort:        $("sortBtn"),
    clear:       $("clearBtn"),
    sampleBtn:   $("sampleBtn"),
    modeGroups:  $("modeGroups"),
    modeSize:    $("modeSize"),
    minus:       $("minusBtn"),
    plus:        $("plusBtn"),
    countValue:  $("countValue"),
    countUnit:   $("countUnit"),
    plan:        $("planText"),
    leader:      $("leaderBtn"),
    make:        $("makeBtn"),
    soundBtn:    $("soundBtn"),
    soundLabel:  $("soundLabel"),
    copy:        $("copyBtn"),
    print:       $("printBtn"),
    fsBtn:       $("fsBtn"),
    fsLabel:     $("fsLabel"),
    msg:         $("gmMsg"),
    printTitle:  $("printTitle"),
    groups:      $("groups"),
    hint:        $("hint"),
    confetti:    $("confettiCanvas"),
    toast:       $("toast"),
    live:        $("srLive"),
    spot:        $("spotlight"),
    spotCount:   $("spotCount"),
    spotName:    $("spotName"),
    spotGroup:   $("spotGroup"),
    speedDramatic: $("speedDramatic"),
    speedNormal: $("speedNormal"),
    speedQuick:  $("speedQuick"),
  };


  /* ----------------------------------------------------------
     STATE
     ---------------------------------------------------------- */
  let classList = root.ClassList.load();
  let state = load();
  let busy = false;          // true while the cards are being dealt

  function fresh() {
    return {
      version: VERSION,
      mode: "groups",        // "groups" or "size"
      value: 6,
      leader: false,         // off unless the lecturer switches it on
      speed: "dramatic",     // "dramatic", "normal" or "quick" — the reveal
      sound: true,
      groupNames: [],        // renamed groups, by position; blank = default
      result: null,          // [{ members, leader }] once made
      resultStamp: 0,        // which class the result was made from
    };
  }

  function load() {
    try {
      const s = JSON.parse(root.localStorage.getItem(KEY) || "null");
      if (!s || s.version !== VERSION) return fresh();
      const f = fresh();
      f.mode = s.mode === "size" ? "size" : "groups";
      f.value = Math.max(1, Math.floor(s.value) || 6);
      f.leader = s.leader === true;
      f.speed = ["dramatic", "normal", "quick"].indexOf(s.speed) !== -1 ? s.speed : "dramatic";
      f.sound = s.sound !== false;
      f.groupNames = Array.isArray(s.groupNames) ? s.groupNames.map(function (x) { return x ? String(x) : ""; }) : [];
      if (Array.isArray(s.result)) {
        f.result = s.result
          .filter(function (g) { return g && Array.isArray(g.members); })
          .map(function (g) {
            const members = g.members.map(String);
            const lead = Number.isInteger(g.leader) && g.leader < members.length ? g.leader : -1;
            return { members: members, leader: lead };
          });
        if (!f.result.length) f.result = null;
        f.resultStamp = s.resultStamp || 0;
      }
      return f;
    } catch (e) {
      return fresh();
    }
  }

  function save() {
    try { root.localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { /* not fatal */ }
  }

  function names() { return classList.names; }

  function plannedGroups() {
    return G.groupCount(names().length, state.mode, state.value);
  }

  function groupName(i) {
    return state.groupNames[i] || G.defaultName(i);
  }


  /* ----------------------------------------------------------
     THE GROUP CARDS
     ----------------------------------------------------------
     Rebuilt whenever the groups change. The name boxes are NOT
     rebuilt while someone is typing in one — that would throw
     away their cursor — because typing only saves the name. */
  function renderGroups(hidden) {
    const result = state.result;
    const count = result ? result.length : plannedGroups();
    const planSizes = result ? null : G.sizes(Math.max(names().length, count), count);
    el.groups.innerHTML = "";
    el.groups.classList.toggle("is-many", count > 9);
    /* In full screen every group has to fit on the projector at
       once, so the number of columns follows the number of groups
       rather than the width: 6 groups are 3 × 2, 8 are 4 × 2. */
    const cols = count <= 3 ? count : count <= 4 ? 2 : count <= 6 ? 3 : count <= 8 ? 4 : count <= 10 ? 5 : 6;
    el.groups.style.setProperty("--gm-cols", cols);

    for (let i = 0; i < count; i++) {
      const c = G.colour(i);
      const card = doc.createElement("section");
      card.className = "gm-group";
      card.dataset.group = i;
      card.style.setProperty("--g-fill", c.fill);
      card.style.setProperty("--g-ink", c.ink);

      const head = doc.createElement("div");
      head.className = "gm-ghead";

      const input = doc.createElement("input");
      input.className = "gm-gname";
      input.type = "text";
      input.maxLength = 40;
      input.value = groupName(i);
      input.setAttribute("aria-label", "Name of group " + (i + 1));
      input.spellcheck = false;
      input.addEventListener("input", function () {
        const v = input.value.trim();
        state.groupNames[i] = v && v !== G.defaultName(i) ? v : "";
        save();
      });
      input.addEventListener("blur", function () {
        if (!input.value.trim()) input.value = G.defaultName(i);
      });
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === "Escape") { e.preventDefault(); input.blur(); }
      });

      const badge = doc.createElement("span");
      badge.className = "gm-gcount";
      badge.textContent = result ? result[i].members.length : 0;
      badge.setAttribute("aria-label", (result ? result[i].members.length : 0) + " students");

      const pencil = doc.createElement("button");
      pencil.type = "button";
      pencil.className = "gm-pencil";
      pencil.setAttribute("aria-label", "Rename " + groupName(i));
      pencil.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
      pencil.addEventListener("click", function () { input.focus(); input.select(); });

      head.appendChild(input);
      head.appendChild(badge);
      head.appendChild(pencil);
      card.appendChild(head);

      const list = doc.createElement("ol");
      list.className = "gm-members";
      if (result) {
        result[i].members.forEach(function (m, k) {
          list.appendChild(memberItem(i, k, m, result[i].leader === k, hidden));
        });
        if (!result[i].members.length) {
          const li = doc.createElement("li");
          li.className = "gm-empty";
          li.textContent = "drop a name here";
          list.appendChild(li);
        }
      } else {
        for (let k = 0; k < planSizes[i]; k++) {
          const li = doc.createElement("li");
          li.className = "gm-empty";
          li.innerHTML = k === 0 ? "waiting for members…" : "&nbsp;";
          list.appendChild(li);
        }
      }
      card.appendChild(list);
      el.groups.appendChild(card);
    }
  }

  function memberItem(g, k, name, isLeader, hidden) {
    const li = doc.createElement("li");
    li.className = "gm-member" + (isLeader && !hidden ? " is-leader" : "") + (hidden ? " is-waiting" : "");
    li.dataset.group = g;
    li.dataset.index = k;
    const dot = doc.createElement("span");
    dot.className = "gm-dot";
    dot.setAttribute("aria-hidden", "true");
    li.appendChild(dot);
    const text = doc.createElement("span");
    text.className = "gm-mname";
    text.textContent = W.displayName(name);
    li.appendChild(text);
    const star = doc.createElement("span");
    star.className = "gm-star";
    star.textContent = "★ LEADER";
    li.appendChild(star);
    li.addEventListener("pointerdown", startDrag);
    return li;
  }


  /* ----------------------------------------------------------
     THE CONTROLS
     ---------------------------------------------------------- */
  function renderControls() {
    const n = names().length;
    el.studentCount.textContent = n;
    el.sample.hidden = !root.ClassList.isSample(names());

    el.modeGroups.setAttribute("aria-checked", state.mode === "groups" ? "true" : "false");
    el.modeSize.setAttribute("aria-checked", state.mode === "size" ? "true" : "false");
    el.countValue.textContent = state.value;
    el.countUnit.textContent = state.mode === "groups"
      ? (state.value === 1 ? "group" : "groups")
      : (state.value === 1 ? "person per group" : "people per group");
    el.plan.innerHTML = n === 0 ? "Paste the class to start" :
      G.describe(n, plannedGroups()).replace(/(\d+ groups? of \d+)/g, "<b>$1</b>");

    el.leader.setAttribute("aria-checked", state.leader ? "true" : "false");
    el.make.textContent = busy ? "SKIP ▸▸" : state.result ? "SHUFFLE AGAIN" : "MAKE GROUPS!";
    el.make.classList.toggle("is-skip", busy);
    el.make.disabled = !busy && n === 0;
    [["dramatic", el.speedDramatic], ["normal", el.speedNormal], ["quick", el.speedQuick]].forEach(function (p) {
      p[1].setAttribute("aria-checked", state.speed === p[0] ? "true" : "false");
      p[1].disabled = busy;
    });
    el.minus.disabled = busy || state.value <= 1;
    el.plus.disabled = busy || state.value >= maxValue();
    [el.modeGroups, el.modeSize, el.leader, el.sort, el.clear, el.sampleBtn].forEach(function (b) { b.disabled = busy; });
    el.names.readOnly = busy;
    el.copy.disabled = busy;
    el.print.disabled = busy;

    // The hint under the cards says what to do next.
    let hint;
    if (!state.result) {
      hint = "Rename the groups now or later — click a name to edit it · then press <b>MAKE GROUPS!</b>";
    } else if (state.resultStamp !== classList.stamp) {
      hint = "<b>The class list has changed</b> since these groups were made — press SHUFFLE AGAIN to use it.";
    } else if (plannedGroups() !== state.result.length) {
      hint = "<b>The setting has changed</b> — press SHUFFLE AGAIN to make " + plannedGroups() + " groups.";
    } else {
      hint = "Click a group name to rename it · <b>drag a name</b> to move someone to another group · SHUFFLE AGAIN for new groups";
    }
    el.hint.innerHTML = hint;
    fitFull();
  }

  function maxValue() {
    const n = Math.max(1, names().length);
    return state.mode === "groups" ? Math.min(G.MAX_GROUPS, n) : n;
  }

  function setMode(mode) {
    if (mode === state.mode) return;
    const n = names().length;
    const groups = plannedGroups();
    state.mode = mode;
    // Keep roughly the same plan when switching between the two.
    state.value = mode === "size" ? Math.max(1, Math.floor(n / groups) || 1) : groups;
    state.value = Math.min(state.value, maxValue());
    save();
    refresh();
  }

  function step(delta) {
    state.value = M_clamp(state.value + delta, 1, maxValue());
    save();
    refresh();
  }

  function M_clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function toggleLeader() {
    state.leader = !state.leader;
    // Apply to the groups already on screen straight away.
    if (state.result) {
      state.result.forEach(function (g) {
        if (!state.leader) g.leader = -1;
        else if (g.leader === -1 && g.members.length) g.leader = W.pickIndex(g.members.length, W.cryptoUint32);
      });
      if (state.leader && state.sound) { Audio.unlock(); Audio.sparkle(); }
    }
    save();
    renderGroups(false);
    renderControls();
  }

  /* After anything that changes the plan: the empty cards follow
     the plan until groups have been made; after that the groups
     stay put until SHUFFLE AGAIN. */
  function refresh() {
    if (!state.result) renderGroups(false);
    renderControls();
    fitFull();
  }


  /* ----------------------------------------------------------
     MAKING THE GROUPS
     ---------------------------------------------------------- */
  function reducedMotion() {
    return typeof root.matchMedia === "function" &&
      root.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /* THE REVEAL
     How long each student's reveal takes, by the "Reveal speed"
     setting. Dramatic is the default: one student at a time in the
     spotlight while the group names roll past like a slot machine,
     slowing down until it stops on their group. About 1.7 seconds
     each, so a class of 30 takes under a minute; SKIP finishes it
     at any moment.
       steps  how many group names roll past before it stops
       first  the gap between the first two (ms)
       last   the gap before the final one — the slow-down
       hold   how long the answer sits in the spotlight
       fly    how long the name takes to fly into its card */
  const SPEEDS = {
    dramatic: { steps: 10, first: 55, last: 210, hold: 260, fly: 420 },
    normal:   { steps: 5,  first: 45, last: 120, hold: 120, fly: 300 },
  };

  let skipping = false;

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function make() {
    // During the reveal the big button is SKIP.
    if (busy) { skipping = true; return; }
    if (names().length === 0) return;
    if (state.sound) { Audio.unlock(); checkSound(); }

    state.result = G.makeGroups(names(), plannedGroups(), state.leader);
    state.resultStamp = classList.stamp;
    save();

    if (reducedMotion()) {
      renderGroups(false);
      renderControls();
      finish();
      return;
    }

    busy = true;
    skipping = false;
    renderGroups(true);
    renderControls();
    el.stage.classList.add("is-dealing");
    fitFull();                 // full screen: fit the groups above the banner

    const order = G.dealOrder(state.result);
    const run = state.speed === "quick"
      ? quickDeal(order)
      : spotlightDeal(order, SPEEDS[state.speed] || SPEEDS.dramatic);
    run.then(endDeal, function (e) {
      // Never leave the page stuck mid-reveal: show everything, and
      // print what went wrong.
      showMsg("The reveal stopped early: " + (e && e.message ? e.message : e));
      endDeal();
    });
  }

  function memberLi(pair) {
    return el.groups.querySelector('.gm-member[data-group="' + pair[0] + '"][data-index="' + pair[1] + '"]');
  }

  function land(pair) {
    const li = memberLi(pair);
    if (li && li.classList.contains("is-waiting")) {
      li.classList.remove("is-waiting");
      li.classList.add("is-dealt");
    }
  }

  /* Quick: the whole class dealt in about three seconds. */
  async function quickDeal(order) {
    const gap = M_clamp(Math.round(2800 / Math.max(1, order.length)), 45, 160);
    for (let k = 0; k < order.length; k++) {
      if (skipping) return;
      land(order[k]);
      if (state.sound) Audio.deal(k);
      await wait(gap);
    }
  }

  /* Dramatic and Normal: one student at a time in the spotlight. */
  async function spotlightDeal(order, sp) {
    const spot = el.spot;
    const count = state.result.length;
    spot.hidden = false;
    spot.classList.remove("is-out");

    for (let k = 0; k < order.length; k++) {
      if (skipping) break;
      const pair = order[k];
      const g = pair[0];
      const name = W.displayName(state.result[g].members[pair[1]]);

      el.spotCount.textContent = "Student " + (k + 1) + " of " + order.length;
      el.spotName.textContent = name;
      spot.classList.remove("is-landed");
      restartAnimation(el.spotName, "is-new");

      /* The roll: random groups flick past, the gaps growing from
         "first" to "last", then it stops on the real one. With one
         group there is nothing to roll through. */
      let prev = -1;
      for (let st = 0; count > 1 && st < sp.steps; st++) {
        if (skipping) break;
        let r;
        do { r = W.pickIndex(count, W.cryptoUint32); } while (r === prev);
        prev = r;
        showRoll(r);
        if (state.sound) Audio.tick();
        const t = st / Math.max(1, sp.steps - 1);
        await wait(sp.first + (sp.last - sp.first) * t * t);
      }
      if (skipping) break;

      showRoll(g);
      spot.classList.add("is-landed");
      if (state.sound) Audio.chime();
      const card = el.groups.querySelector('.gm-group[data-group="' + g + '"]');
      if (card) restartAnimation(card, "is-called");
      await wait(sp.hold);
      if (skipping) break;

      await flyToCard(pair, sp.fly);
      land(pair);
      if (state.sound) Audio.deal(k);
      await wait(80);
    }

    spot.classList.add("is-out");
    await wait(skipping ? 0 : 200);
    spot.hidden = true;
    spot.classList.remove("is-out", "is-landed");
  }

  /* Show group r in the rolling pill: its name, in its colour. */
  function showRoll(r) {
    const c = G.colour(r);
    el.spotGroup.textContent = groupName(r);
    el.spotGroup.style.background = c.fill;
    el.spotGroup.style.color = c.ink;
  }

  /* Re-run a one-shot CSS animation by removing and re-adding its
     class (reading offsetWidth in between makes the browser notice). */
  function restartAnimation(node, cls) {
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
  }

  /* The name flies from the spotlight into its place in the card,
     as a name tag the same size as the row it lands in: it starts
     over the spotlight a little larger, and shrinks as it travels.
     The row is already there (hidden), so it can be measured. */
  function flyToCard(pair, ms) {
    const li = memberLi(pair);
    if (!li) return Promise.resolve();
    const from = el.spotName.getBoundingClientRect();
    const to = li.getBoundingClientRect();
    const left = from.left + from.width / 2 - to.width / 2;
    const top = from.top + from.height / 2 - to.height / 2;
    const tag = doc.createElement("div");
    tag.className = "gm-flyer";
    tag.style.setProperty("--g-fill", G.colour(pair[0]).fill);
    tag.style.left = left + "px";
    tag.style.top = top + "px";
    tag.style.width = to.width + "px";
    tag.style.minHeight = to.height + "px";
    tag.style.fontSize = getComputedStyle(li).fontSize;
    const dot = doc.createElement("span");
    dot.className = "gm-dot";
    tag.appendChild(dot);
    tag.appendChild(doc.createTextNode(el.spotName.textContent));
    tag.style.transform = "scale(1.5)";
    doc.body.appendChild(tag);
    void tag.offsetWidth;
    tag.style.transition = "transform " + ms + "ms cubic-bezier(0.5, 0, 0.2, 1)";
    tag.style.transform = "translate(" + (to.left - left) + "px," + (to.top - top) + "px) scale(1)";
    return wait(ms).then(function () { tag.remove(); });
  }

  /* After the last student (or SKIP): everyone still waiting drops
     in at once, the leaders get their stars, and the ta-da plays. */
  function endDeal() {
    let k = 0;
    el.groups.querySelectorAll(".gm-member.is-waiting").forEach(function (li) {
      li.classList.remove("is-waiting");
      li.classList.add("is-dealt");
      k++;
    });
    if (k && state.sound) Audio.deal(40);
    el.spot.hidden = true;
    el.spot.classList.remove("is-out", "is-landed");
    doc.querySelectorAll(".gm-flyer").forEach(function (f) { f.remove(); });

    const done = function () {
      busy = false;
      skipping = false;
      el.stage.classList.remove("is-dealing");
      renderControls();        // (re-fits full screen without the banner)
      finish();
    };
    if (state.leader) {
      setTimeout(function () {
        el.groups.querySelectorAll(".gm-member").forEach(function (li) {
          const g = state.result[+li.dataset.group];
          if (g && g.leader === +li.dataset.index) li.classList.add("is-leader", "is-starred");
        });
        if (state.sound) Audio.sparkle();
        setTimeout(done, 500);
      }, 250);
    } else {
      setTimeout(done, 150);
    }
  }

  function finish() {
    if (state.sound) Audio.fanfare();
    Confetti.burst();
    say(state.result.length + " groups made.");
  }


  /* ----------------------------------------------------------
     DRAGGING A STUDENT TO ANOTHER GROUP
     ----------------------------------------------------------
     Pointer events, so it works the same with a mouse, a
     touchscreen or a pen. A small movement is needed before the
     drag starts, so an ordinary click does nothing. */
  let drag = null;

  function startDrag(e) {
    if (busy || e.button > 0 || !state.result) return;
    const li = e.currentTarget;
    drag = {
      li: li, x: e.clientX, y: e.clientY, moving: false, ghost: null, target: null,
      group: +li.dataset.group, index: +li.dataset.index, pointerId: e.pointerId,
    };
    try { li.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
    li.addEventListener("pointermove", onDragMove);
    li.addEventListener("pointerup", endDrag);
    li.addEventListener("pointercancel", cancelDrag);
  }

  function onDragMove(e) {
    if (!drag) return;
    if (!drag.moving) {
      if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) < 6) return;
      drag.moving = true;
      const r = drag.li.getBoundingClientRect();
      const ghost = drag.li.cloneNode(true);
      ghost.classList.remove("is-dealt", "is-starred", "is-waiting");
      ghost.classList.add("gm-ghost");
      ghost.style.width = r.width + "px";
      ghost.style.setProperty("--g-fill", G.colour(drag.group).fill);
      doc.body.appendChild(ghost);
      drag.ghost = ghost;
      drag.dx = e.clientX - r.left;
      drag.dy = e.clientY - r.top;
      drag.li.classList.add("is-dragging");
      doc.body.classList.add("gm-dragging");
    }
    drag.ghost.style.transform = "translate(" + (e.clientX - drag.dx) + "px," + (e.clientY - drag.dy) + "px) rotate(-3deg)";

    const under = doc.elementFromPoint(e.clientX, e.clientY);
    const card = under && under.closest ? under.closest(".gm-group") : null;
    if (drag.target && drag.target !== card) drag.target.classList.remove("is-drop");
    drag.target = card;
    if (card && +card.dataset.group !== drag.group) card.classList.add("is-drop");
  }

  function endDrag() {
    if (!drag) return;
    const d = drag;
    cleanupDrag();
    if (!d.moving || !d.target) return;
    const to = +d.target.dataset.group;
    if (to === d.group) return;
    const moved = W.displayName(state.result[d.group].members[d.index]);
    state.result = G.move(state.result, d.group, d.index, to, state.leader);
    save();
    renderGroups(false);
    renderControls();
    fitFull();
    if (state.sound) { Audio.unlock(); Audio.deal(10); }
    say(moved + " moved to " + groupName(to) + ".");
  }

  function cancelDrag() { cleanupDrag(); }

  function cleanupDrag() {
    if (!drag) return;
    const d = drag;
    drag = null;
    d.li.removeEventListener("pointermove", onDragMove);
    d.li.removeEventListener("pointerup", endDrag);
    d.li.removeEventListener("pointercancel", cancelDrag);
    try { d.li.releasePointerCapture(d.pointerId); } catch (err) { /* fine */ }
    d.li.classList.remove("is-dragging");
    if (d.ghost) d.ghost.remove();
    if (d.target) d.target.classList.remove("is-drop");
    doc.body.classList.remove("gm-dragging");
  }


  /* ----------------------------------------------------------
     THE CLASS BOX
     ---------------------------------------------------------- */
  let typingTimer = null;

  function syncBox() {
    el.names.value = names().join("\n");
  }

  function setClass(list) {
    classList = root.ClassList.save(list.slice(0, root.ClassList.MAX));
    refresh();
  }

  function onType() {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(function () {
      setClass(W.parseNames(el.names.value));
    }, 300);
  }

  function onPaste() {
    setTimeout(function () {
      clearTimeout(typingTimer);
      setClass(W.parseNames(el.names.value));
      syncBox();
      say(names().length + " students in the class.");
    }, 0);
  }


  /* ----------------------------------------------------------
     COPY, PRINT, SOUND, FULL SCREEN
     ---------------------------------------------------------- */
  function copy() {
    if (!state.result) { toast("Make the groups first."); return; }
    const text = G.asText(state.result, state.result.map(function (g, i) { return groupName(i); }), W.displayName);
    const done = function () { toast("Copied — paste it into WhatsApp or iLearn."); };
    const fallback = function () {
      const t = doc.createElement("textarea");
      t.value = text;
      t.setAttribute("readonly", "");
      t.style.position = "fixed";
      t.style.opacity = "0";
      doc.body.appendChild(t);
      t.select();
      let ok = false;
      try { ok = doc.execCommand("copy"); } catch (e) { ok = false; }
      t.remove();
      if (ok) done(); else toast("Could not copy on this browser — use Print instead.");
    };
    if (root.navigator.clipboard && root.navigator.clipboard.writeText) {
      root.navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
  }

  function print() {
    if (!state.result) { toast("Make the groups first."); return; }
    const d = new Date();
    el.printTitle.textContent = "Groups — " + d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    root.print();
  }

  function renderSound() {
    el.soundBtn.setAttribute("aria-pressed", state.sound ? "true" : "false");
    el.soundLabel.textContent = state.sound ? "Sound on" : "Sound off";
    el.soundBtn.classList.toggle("is-off", !state.sound);
  }

  function checkSound() {
    const err = Audio.lastError();
    if (err) { showMsg(err); return; }
    setTimeout(function () {
      if (state.sound && Audio.state() !== "running") {
        showMsg("Sound is not playing (the browser reports \"" + Audio.state() + "\"). Check the volume" +
          (Audio.lastError() ? ". " + Audio.lastError() : "."));
      } else {
        showMsg("");
      }
    }, 900);
  }

  let fsByApi = false;

  function fsElement() {
    return doc.fullscreenElement || doc.webkitFullscreenElement || null;
  }

  function toggleFull() {
    const on = !doc.body.classList.contains("gm-full");
    if (on) {
      doc.body.classList.add("gm-full");
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
      doc.body.classList.remove("gm-full");
      const exit = doc.exitFullscreen || doc.webkitExitFullscreen;
      if (fsElement() && exit) exit.call(doc);
      fsByApi = false;
    }
    renderFull();
  }

  function onFsChange() {
    if (!fsElement() && fsByApi) {
      fsByApi = false;
      doc.body.classList.remove("gm-full");
      renderFull();
    }
  }

  function renderFull() {
    const on = doc.body.classList.contains("gm-full");
    el.fsLabel.textContent = on ? "Exit full screen" : "Full screen";
    el.fsBtn.setAttribute("aria-pressed", on ? "true" : "false");
    fitFull();
  }

  /* On the projector every group must be visible at once, with no
     scrolling — a 1366 × 768 or even 1024 × 768 projector included.
     Start with large text and step it down until the page fits the
     screen, but never below 11px. Long full names wrap, so this is
     measured, not calculated. */
  function fitFull() {
    const box = el.groups;
    if (!doc.body.classList.contains("gm-full")) {
      box.style.removeProperty("--gm-fs");
      return;
    }
    const fits = function () { return doc.documentElement.scrollHeight <= root.innerHeight + 1; };
    for (let fs = 20; fs >= 11; fs--) {
      box.style.setProperty("--gm-fs", fs + "px");
      if (fits()) return;
    }
  }


  /* ----------------------------------------------------------
     SMALL HELPERS
     ---------------------------------------------------------- */
  function showMsg(text) {
    el.msg.textContent = text;
    el.msg.hidden = !text;
    fitFull();                 // a message takes room: re-fit full screen
  }

  let toastTimer = null;
  function toast(text) {
    el.toast.textContent = text;
    el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.hidden = true; }, 2600);
  }

  function say(text) { el.live.textContent = text; }


  /* ----------------------------------------------------------
     WIRING
     ---------------------------------------------------------- */
  function wire() {
    el.make.addEventListener("click", make);
    el.modeGroups.addEventListener("click", function () { setMode("groups"); });
    el.modeSize.addEventListener("click", function () { setMode("size"); });
    el.minus.addEventListener("click", function () { step(-1); });
    el.plus.addEventListener("click", function () { step(1); });
    el.leader.addEventListener("click", toggleLeader);
    [["dramatic", el.speedDramatic], ["normal", el.speedNormal], ["quick", el.speedQuick]].forEach(function (p) {
      p[1].addEventListener("click", function () { state.speed = p[0]; save(); renderControls(); });
    });

    el.names.addEventListener("input", onType);
    el.names.addEventListener("paste", onPaste);
    el.sort.addEventListener("click", function () {
      setClass(names().slice().sort(function (a, b) {
        return a.localeCompare(b, undefined, { sensitivity: "base" });
      }));
      syncBox();
    });
    el.clear.addEventListener("click", function () {
      if (!names().length) return;
      if (!root.confirm("Clear the whole class list? It is shared with the Name Wheel, so it clears there too. Then paste the new class.")) return;
      setClass([]);
      syncBox();
      el.names.focus();
    });
    el.sampleBtn.addEventListener("click", function () {
      if (!root.confirm("Replace the class list with the sample names?")) return;
      setClass(root.ClassList.SAMPLE);
      syncBox();
    });

    el.copy.addEventListener("click", copy);
    el.print.addEventListener("click", print);
    el.soundBtn.addEventListener("click", function () {
      state.sound = !state.sound;
      Audio.setEnabled(state.sound);
      if (state.sound) { Audio.unlock(); checkSound(); } else { showMsg(""); }
      save();
      renderSound();
    });
    el.fsBtn.addEventListener("click", toggleFull);
    doc.addEventListener("fullscreenchange", onFsChange);
    doc.addEventListener("webkitfullscreenchange", onFsChange);
    let resizeTimer = null;
    root.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(fitFull, 120);
    });

    // The class was replaced in another tab (the name wheel, say).
    root.ClassList.onChange(function (list) {
      classList = list;
      if (doc.activeElement !== el.names) syncBox();
      refresh();
    });
  }

  function start() {
    Audio.setEnabled(state.sound);
    Confetti.attach(el.confetti, G.COLOURS.slice(0, 8).map(function (c) { return c.fill; }));
    state.value = Math.min(state.value, maxValue());
    syncBox();
    renderSound();
    renderFull();
    renderGroups(false);
    renderControls();
    wire();
  }

  // If anything goes wrong while starting, print the actual error.
  try {
    start();
  } catch (e) {
    const box = $("gmMsg");
    if (box) {
      box.hidden = false;
      box.textContent = "The Group Maker could not start: " + (e && e.message ? e.message : e);
    }
    throw e;
  }

})(window);
