/* ============================================================
   quiz-stats.js — the numbers behind Zero Defect Rush
   ============================================================
   Two jobs:
     1. Sign the lecturer in with Supabase Auth
     2. Call the four stats functions and draw the results

   WHY THERE IS A LOGIN
   ------------------------------------------------------------
   This page reads things students must not see. The four
   functions it calls are granted to "authenticated" only, so the
   public anon key cannot call them — signing in is what makes the
   data readable, not knowing the URL.

   Same approach admin.js already uses for the registration form:
   swap email + password for an access token, then send that token
   instead of the anon key.
   ============================================================ */

"use strict";

(function () {

  const config = window.QUIZ_CONFIG;

  /* The proof-of-login token. Without it, every call below is
     refused by the database. */
  let accessToken = null;

  function $(id) { return document.getElementById(id); }
  function show(el) { el.classList.remove("is-hidden"); }
  function hide(el) { el.classList.add("is-hidden"); }

  function showError(el, message) {
    el.textContent = message;
    show(el);
  }

  const loginCard = $("loginCard");
  const statsCard = $("statsCard");
  const loginError = $("loginError");
  const dataError = $("dataError");


  /* ----------------------------------------------------------
     SIGNING IN
     ---------------------------------------------------------- */
  async function signIn(email, password) {
    const response = await fetch(
      config.SUPABASE_URL + "/auth/v1/token?grant_type=password",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": config.SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email: email, password: password }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      // Supabase has used several field names for this over time.
      throw new Error(
        data.msg || data.error_description || data.message || "Sign in failed."
      );
    }
    return data.access_token;
  }

  $("loginForm").addEventListener("submit", async function (event) {
    event.preventDefault();
    hide(loginError);

    const email = $("adminEmail").value.trim();
    const password = $("adminPassword").value;

    if (email === "" || password === "") {
      showError(loginError, "Please enter both your email and password.");
      return;
    }

    const button = $("loginButton");
    button.disabled = true;
    button.textContent = "Signing in…";

    try {
      accessToken = await signIn(email, password);

      // Tab-scoped: closing the tab signs you out.
      sessionStorage.setItem("quizStatsToken", accessToken);

      $("adminPassword").value = "";   // don't leave it lying around
      hide(loginCard);
      show(statsCard);
      await loadEverything();
    } catch (err) {
      showError(loginError, err.message);
    } finally {
      button.disabled = false;
      button.textContent = "Sign In";
    }
  });

  $("signOutButton").addEventListener("click", function () {
    accessToken = null;
    sessionStorage.removeItem("quizStatsToken");
    hide(statsCard);
    show(loginCard);
  });

  $("refreshButton").addEventListener("click", loadEverything);


  /* ----------------------------------------------------------
     CALLING A STATS FUNCTION
     ----------------------------------------------------------
     Note the Authorization header carries the ACCESS TOKEN, not
     the anon key. That token is what proves we are signed in, and
     it is the only reason the database answers at all.
     ---------------------------------------------------------- */
  async function callRpc(name, args) {
    const response = await fetch(config.SUPABASE_URL + "/rest/v1/rpc/" + name, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": config.SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + accessToken,
      },
      body: JSON.stringify(args || {}),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(name + " failed (" + response.status + "): " + details);
    }
    return response.json();
  }


  /* ----------------------------------------------------------
     DRAWING
     ---------------------------------------------------------- */

  function setText(id, value) {
    $(id).textContent = (value === null || value === undefined) ? "0" : String(value);
  }

  function formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  function renderHeadline(s) {
    setText("statVisits", s.opened_page);
    setText("statStarted", s.started_quiz);
    setText("statAttempts", s.total_attempts);
    setText("statPerfect", s.perfect_scores);
    setText("statStudentsPassed", s.students_passed);
    setText("statAvg", s.avg_score === null ? "—" : s.avg_score);
    setText("statTimedOut", s.timed_out_attempts);
    setText("statToday", s.attempts_today);

    $("activityRange").textContent =
      s.total_attempts > 0
        ? "Activity from " + formatDate(s.first_activity) +
          " to " + formatDate(s.last_activity) +
          " · " + s.visits_today + " visits today"
        : "No attempts recorded yet.";
  }

  /* The funnel.

     EVERY STEP COUNTS PEOPLE, NOT ATTEMPTS. That distinction is
     the whole reason this reads correctly: total_attempts counts
     retries, so one student can produce five of them, and putting
     it in a funnel produced steps of 180% — which is meaningless.
     Attempts belong in the tiles above, not here.

       opened_page      one per page open
       started_quiz     distinct sessions, so one per sitting
       students_passed  distinct students who reached 30/30

     Those are not identical units either — a student who comes
     back on two days is two sessions — but they are all
     people-shaped, so the proportions mean something. */
  function renderFunnel(s) {
    const steps = [
      { label: "Opened the page", value: Number(s.opened_page) },
      { label: "Played the quiz", value: Number(s.started_quiz) },
      { label: "Reached 30 / 30", value: Number(s.students_passed) },
    ];
    const top = Math.max.apply(null, steps.map(function (x) { return x.value; })) || 1;

    const list = $("funnel");
    list.innerHTML = "";
    let sawImpossibleStep = false;

    steps.forEach(function (step, i) {
      const li = document.createElement("li");
      li.className = "funnel-step";

      const label = document.createElement("span");
      label.className = "funnel-label";
      label.textContent = step.label;

      const bar = document.createElement("span");
      bar.className = "funnel-bar";
      const fill = document.createElement("span");
      fill.className = "funnel-fill";
      // Clamped: a step can never draw wider than the widest one.
      fill.style.width = Math.min(100, Math.max(2, (step.value / top) * 100)) + "%";
      bar.appendChild(fill);

      const value = document.createElement("span");
      value.className = "funnel-value";

      const prev = i > 0 ? steps[i - 1].value : null;
      if (prev === null) {
        value.textContent = String(step.value);
      } else {
        const pct = prev > 0 ? Math.round((step.value / prev) * 100) : 0;
        if (pct > 100) sawImpossibleStep = true;
        value.textContent = step.value + "  (" + pct + "%)";
      }

      li.appendChild(label);
      li.appendChild(bar);
      li.appendChild(value);
      list.appendChild(li);
    });

    /* Visit counting was switched on after the quiz had already
       been recording attempts, so for a while there are more
       players than recorded visits. Say so rather than letting
       the reader puzzle over a percentage above 100. */
    const warning = $("funnelWarning");
    if (sawImpossibleStep) {
      warning.textContent =
        "A step reads over 100% because visit counting was switched on " +
        "later than attempt recording. It will settle once a full class " +
        "has used the page.";
      show(warning);
    } else {
      hide(warning);
    }
  }

  function renderTable(bodyId, emptyId, rows, build) {
    const body = $(bodyId);
    body.innerHTML = "";

    const empty = emptyId ? $(emptyId) : null;
    if (rows.length === 0) {
      if (empty) show(empty);
      return;
    }
    if (empty) hide(empty);

    rows.forEach(function (row) {
      const tr = document.createElement("tr");
      build(row).forEach(function (cell) {
        const td = document.createElement("td");
        if (cell && typeof cell === "object") {
          td.textContent = cell.text;
          if (cell.className) td.className = cell.className;
        } else {
          td.textContent = cell;
        }
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
  }

  /* A tiny inline bar, so a column of numbers reads as a shape. */
  function bar(value, max) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return "█".repeat(Math.max(0, Math.round(pct / 10)));
  }


  /* ----------------------------------------------------------
     LOADING
     ----------------------------------------------------------
     Each section is loaded independently. One failing query
     should not blank the whole page.
     ---------------------------------------------------------- */
  async function loadEverything() {
    hide(dataError);
    const problems = [];

    try {
      const stats = await callRpc("quiz_stats");
      const s = Array.isArray(stats) ? stats[0] : stats;
      renderHeadline(s);
      renderFunnel(s);
    } catch (e) {
      problems.push(e.message);
    }

    try {
      const byClass = await callRpc("quiz_stats_by_class");
      renderTable("classBody", "classEmpty", byClass, function (r) {
        return [
          r.class_name,
          r.students,
          r.attempts,
          { text: String(r.passes), className: r.passes > 0 ? "cell-good" : "" },
          r.avg_score === null ? "—" : r.avg_score,
          r.best_score,
        ];
      });
    } catch (e) {
      problems.push(e.message);
    }

    try {
      const hard = await callRpc("quiz_hardest_questions", { row_limit: 12 });
      const worst = hard.length ? Number(hard[0].times_wrong) : 0;
      renderTable("hardBody", "hardEmpty", hard, function (r) {
        return [
          { text: r.question_id, className: "cell-mono" },
          r.times_seen,
          r.times_wrong,
          r.pct_wrong === null ? "—" : r.pct_wrong + "%",
          { text: bar(Number(r.times_wrong), worst), className: "cell-bar" },
        ];
      });
    } catch (e) {
      problems.push(e.message);
    }

    try {
      const daily = await callRpc("quiz_daily_activity", { days: 14 });
      const busiest = daily.reduce(function (m, r) {
        return Math.max(m, Number(r.visits), Number(r.attempts));
      }, 0);
      renderTable("dailyBody", null, daily, function (r) {
        return [
          r.day,
          r.visits,
          r.attempts,
          { text: String(r.perfect_scores), className: r.perfect_scores > 0 ? "cell-good" : "" },
          { text: bar(Number(r.attempts), busiest), className: "cell-bar" },
        ];
      });
    } catch (e) {
      problems.push(e.message);
    }

    if (problems.length > 0) {
      showError(
        dataError,
        problems.length + " of 4 sections could not load. " +
        "If this says the function does not exist, run " +
        "supabase/migrations/20260816_quiz_stats.sql."
      );
      if (window.console) problems.forEach(function (p) { console.error(p); });
    }
  }


  /* ----------------------------------------------------------
     START-UP
     ----------------------------------------------------------
     If this tab already signed in, go straight to the numbers.
     ---------------------------------------------------------- */
  const saved = sessionStorage.getItem("quizStatsToken");
  if (saved) {
    accessToken = saved;
    hide(loginCard);
    show(statsCard);
    loadEverything();
  }

})();
