/* ============================================================
   groups-math.js — HOW THE CLASS IS SPLIT
   ============================================================
   Pure functions only: no page, no sound. That is what lets
   groups-tests.js check them from Node.

   Needs WheelMath (../wheel1/wheel-math.js) for its secure,
   fair shuffle and random picks — the same randomness the name
   wheel uses.

   THE RULE FOR A CLASS THAT DOES NOT DIVIDE EVENLY
   The spare students are spread out, one per group, so groups
   never differ by more than one person:
     31 students, 6 groups        → 1 group of 6, 5 groups of 5
     31 students, groups of 5     → 6 groups: 1 of 6, 5 of 5
   Which groups get the extra person is chosen at random.
   ============================================================ */

"use strict";

(function (root) {

  const W = root.WheelMath;

  /* The group colours, in order, each with the text colour that
     reads on it and the name a group gets until it is renamed.
     The first eight are the name wheel's colours. */
  const COLOURS = [
    { fill: "#f0286e", ink: "#ffffff", name: "Pink" },
    { fill: "#ffc61a", ink: "#1a2233", name: "Yellow" },
    { fill: "#1e7bf0", ink: "#ffffff", name: "Blue" },
    { fill: "#ff7a1a", ink: "#1a2233", name: "Orange" },
    { fill: "#8a4dff", ink: "#ffffff", name: "Purple" },
    { fill: "#8ad62a", ink: "#1a2233", name: "Green" },
    { fill: "#d62acf", ink: "#ffffff", name: "Magenta" },
    { fill: "#14c4b8", ink: "#1a2233", name: "Teal" },
    { fill: "#1b3a6b", ink: "#ffffff", name: "Navy" },
    { fill: "#5cc8f5", ink: "#1a2233", name: "Sky" },
    { fill: "#9a5b2e", ink: "#ffffff", name: "Brown" },
    { fill: "#b8bec9", ink: "#1a2233", name: "Silver" },
  ];

  const MAX_GROUPS = 24;

  function colour(i) {
    return COLOURS[i % COLOURS.length];
  }

  /* "Team Pink", "Team Yellow" … and after the twelfth colour,
     "Team Pink 2" and so on, so no two defaults are the same. */
  function defaultName(i) {
    const round = Math.floor(i / COLOURS.length);
    return "Team " + colour(i).name + (round > 0 ? " " + (round + 1) : "");
  }

  /* How many groups, from the setting.
       mode "groups": value IS the number of groups
       mode "size":   value is people per group; the spare
                      students are spread out, so it is the
                      number of FULL groups that fit.
     Never more groups than students, never fewer than one. */
  function groupCount(students, mode, value) {
    const v = Math.max(1, Math.floor(value) || 1);
    let g = mode === "size" ? Math.floor(students / v) : v;
    g = Math.min(g, students, MAX_GROUPS);
    return Math.max(1, g);
  }

  /* The size of each group, in group order, before shuffling
     which groups get the extras. */
  function sizes(students, groups) {
    const out = [];
    const base = Math.floor(students / groups);
    const extra = students % groups;
    for (let i = 0; i < groups; i++) out.push(base + (i < extra ? 1 : 0));
    return out;
  }

  /* One line describing the plan: "31 students → 5 groups of 5
     and 1 group of 6". */
  function describe(students, groups) {
    if (students === 0) return "No students yet";
    const s = sizes(students, groups);
    const small = s[s.length - 1];
    const big = s[0];
    const nBig = s.filter(function (x) { return x === big; }).length;
    const nSmall = s.length - nBig;
    const part = function (count, size) {
      return count + (count === 1 ? " group of " : " groups of ") + size;
    };
    const who = students + (students === 1 ? " student" : " students") + " → ";
    if (big === small) return who + part(groups, big);
    return who + part(nSmall, small) + " and " + part(nBig, big);
  }

  /* Split the class. Returns [{ members: [name...], leader }]
     where leader is an index into members, or -1.

     1. shuffle the whole class
     2. shuffle which groups receive the spare students
     3. deal the shuffled class into groups of those sizes
     4. if asked, pick a leader in each group at random */
  function makeGroups(names, groups, withLeader, nextUint32) {
    const rnd = nextUint32 || W.cryptoUint32;
    const order = W.shuffle(names, rnd);
    const plan = W.shuffle(sizes(names.length, groups), rnd);
    const out = [];
    let at = 0;
    plan.forEach(function (size) {
      const members = order.slice(at, at + size);
      at += size;
      out.push({
        members: members,
        leader: withLeader && members.length ? W.pickIndex(members.length, rnd) : -1,
      });
    });
    return out;
  }

  /* The order students are dealt into the cards for the
     animation: round-robin, one card per group at a time, like
     dealing a pack of cards. Returns [[group, member]...]. */
  function dealOrder(result) {
    const out = [];
    const longest = result.reduce(function (m, g) { return Math.max(m, g.members.length); }, 0);
    for (let k = 0; k < longest; k++) {
      for (let g = 0; g < result.length; g++) {
        if (k < result[g].members.length) out.push([g, k]);
      }
    }
    return out;
  }

  /* Move a student from one group to another (drag and drop).
     Returns a NEW result; the old one is left untouched.
     A leader who moves stops being a leader, because the group
     they join may already have one; the group they left gets a
     new leader at random, if leaders are switched on. */
  function move(result, fromGroup, fromIndex, toGroup, withLeader, nextUint32) {
    const rnd = nextUint32 || W.cryptoUint32;
    const next = result.map(function (g) { return { members: g.members.slice(), leader: g.leader }; });
    if (fromGroup === toGroup) return next;
    const src = next[fromGroup];
    const dst = next[toGroup];
    const name = src.members.splice(fromIndex, 1)[0];
    if (name === undefined) return next;
    dst.members.push(name);

    if (src.leader === fromIndex) {
      src.leader = withLeader && src.members.length ? W.pickIndex(src.members.length, rnd) : -1;
    } else if (src.leader > fromIndex) {
      src.leader -= 1;               // the list shifted up by one
    }
    if (withLeader && dst.leader === -1) dst.leader = dst.members.length - 1;
    return next;
  }

  /* The groups as plain text, for pasting into WhatsApp or
     iLearn:
       Team Pink (5)
       1. Fatin Nabilah ★ Leader
       2. ... */
  function asText(result, groupNames, displayName) {
    const show = displayName || function (s) { return s; };
    return result.map(function (g, i) {
      const lines = [(groupNames[i] || defaultName(i)) + " (" + g.members.length + ")"];
      g.members.forEach(function (m, k) {
        lines.push((k + 1) + ". " + show(m) + (k === g.leader ? " ★ Leader" : ""));
      });
      return lines.join("\n");
    }).join("\n\n");
  }

  root.GroupsMath = {
    COLOURS: COLOURS,
    MAX_GROUPS: MAX_GROUPS,
    colour: colour,
    defaultName: defaultName,
    groupCount: groupCount,
    sizes: sizes,
    describe: describe,
    makeGroups: makeGroups,
    dealOrder: dealOrder,
    move: move,
    asText: asText,
  };

})(typeof window !== "undefined" ? window : globalThis);
