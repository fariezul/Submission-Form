/* ============================================================
   quiz-app.js — ZERO DEFECT RUSH
   ============================================================
   The part that people actually see: which screen is showing,
   what happens when a card is tapped, and how the attempt ends.

   The rules themselves live in quiz-engine.js. This file only
   drives them and paints the result.

   SCREENS
     welcome        name + class
     instructions   the briefing, and the START button
     game           the 30 questions
     result         below 30/30 — try again
     perfect        30/30 — the celebration
     leaderboard    fastest perfect scores
   ============================================================ */

"use strict";

(function () {

  const Engine = window.QuizEngine;
  const Audio = window.QuizAudio;
  const Celebration = window.QuizCelebration;
  const Database = window.QuizDatabase;

  /* How long the correct/wrong flash stays up before the next
     question slides in. Long enough to read, short enough that
     the flashes never eat a meaningful part of the clock. */
  const FEEDBACK_MS = 850;


  /* ----------------------------------------------------------
     STATE
     ----------------------------------------------------------
     One plain object. The quiz is small enough that a state
     library would be more machinery than the problem needs.

     Nothing here is written to localStorage: an interrupted
     attempt is meant to be lost, and the student starts again.
     ---------------------------------------------------------- */
  const state = {
    studentName: "",
    className: "",
    sessionId: null,
    attemptNumber: 0,

    questions: [],
    currentIndex: 0,
    responses: [],
    selected: [],        // multiple-select working set

    timer: null,
    tickHandle: null,
    warned60: false,
    warned20: false,

    locked: false,       // true while feedback is showing
    finished: false,
    lastResult: null,

    /* Every attempt finished in THIS sitting, oldest first. It is
       what the result screens list back to the student, so they
       can see themselves improving across retries.

       Kept in memory on purpose. It covers exactly one session —
       the same span as session_id — and is cleared when the
       student goes back to the welcome screen. Reading it from
       the database instead would need a new read permission on a
       table the public key deliberately cannot see, and would
       show nothing different. */
    history: [],
  };


  /* ----------------------------------------------------------
     ELEMENT LOOKUP
     ---------------------------------------------------------- */
  function $(id) { return document.getElementById(id); }

  const screens = {
    welcome: $("screenWelcome"),
    instructions: $("screenInstructions"),
    game: $("screenGame"),
    result: $("screenResult"),
    perfect: $("screenPerfect"),
    leaderboard: $("screenLeaderboard"),
  };

  function showScreen(name) {
    Object.keys(screens).forEach(function (key) {
      screens[key].hidden = key !== name;
    });

    // The game screen hides the page chrome so the quiz fills
    // the phone; everything else brings it back.
    document.body.classList.toggle("quiz-playing", name === "game");

    if (name !== "perfect") Celebration.stop();

    // Start each screen from the top.
    window.scrollTo(0, 0);
  }


  /* ----------------------------------------------------------
     SOUND TOGGLE
     ---------------------------------------------------------- */
  function paintSoundButtons() {
    const on = Audio.isEnabled();
    document.querySelectorAll("[data-sound-toggle]").forEach(function (btn) {
      btn.textContent = on ? "🔊" : "🔇";
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.setAttribute("aria-label", on ? "Sound on. Tap to mute." : "Sound off. Tap to unmute.");
      btn.title = on ? "Mute sound" : "Turn sound on";
    });
  }

  function wireSoundToggles() {
    Audio.loadPreference();
    paintSoundButtons();

    document.querySelectorAll("[data-sound-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        Audio.unlock();
        const nowOn = Audio.setEnabled(!Audio.isEnabled());
        paintSoundButtons();
        if (nowOn) {
          Audio.tap();
          // Bring the music back if a game is in progress.
          if (!screens.game.hidden) Audio.startMusic();
        } else {
          Audio.stopMusic();
        }
      });
    });
  }


  /* ==========================================================
     SCREEN 1 — WELCOME
     ========================================================== */
  const nameInput = $("studentName");
  const classInput = $("className");
  const nameError = $("studentNameError");
  const classError = $("classNameError");
  const welcomeForm = $("welcomeForm");

  function setFieldError(input, errorEl, message) {
    errorEl.textContent = message;
    errorEl.classList.toggle("is-visible", message !== "");
    input.classList.toggle("input-error", message !== "");
    if (message) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  }

  function validateWelcome() {
    const nameMsg = Engine.validateStudentField("Name", nameInput.value, 80);
    const classMsg = Engine.validateStudentField("Class", classInput.value, 40);

    setFieldError(nameInput, nameError, nameMsg);
    setFieldError(classInput, classError, classMsg);

    return nameMsg === "" && classMsg === "";
  }

  // Clear the red message as soon as the student starts fixing it.
  [[nameInput, nameError], [classInput, classError]].forEach(function (pair) {
    pair[0].addEventListener("input", function () {
      if (pair[1].classList.contains("is-visible")) {
        setFieldError(pair[0], pair[1], "");
      }
    });
  });

  welcomeForm.addEventListener("submit", function (event) {
    event.preventDefault();
    Audio.unlock();

    if (!validateWelcome()) {
      // Put the cursor on the first problem.
      (nameError.classList.contains("is-visible") ? nameInput : classInput).focus();
      return;
    }

    Audio.tap();

    state.studentName = Engine.cleanText(nameInput.value);
    state.className = Engine.cleanText(classInput.value);

    // A new sitting = a new session. Retries reuse this id.
    state.sessionId = Engine.createSessionId();
    state.attemptNumber = 0;

    $("briefingName").textContent = state.studentName;
    $("briefingClass").textContent = state.className;

    showScreen("instructions");
  });


  /* ==========================================================
     SCREEN 2 — INSTRUCTIONS
     ========================================================== */
  $("startChallengeButton").addEventListener("click", function () {
    Audio.unlock();
    Audio.tap();
    startAttempt();
  });

  $("briefingBackButton").addEventListener("click", function () {
    Audio.tap();
    showScreen("welcome");
  });


  /* ==========================================================
     SCREEN 3 — THE GAME
     ========================================================== */

  function startAttempt() {
    state.attemptNumber += 1;
    state.questions = Engine.selectQuestions(window.QUIZ_QUESTIONS);
    state.currentIndex = 0;
    state.responses = [];
    state.selected = [];
    state.locked = false;
    state.finished = false;
    state.warned60 = false;
    state.warned20 = false;

    state.timer = Engine.createTimer();

    showScreen("game");

    // The clock starts HERE — on the tap, not when the briefing
    // was opened.
    state.timer.start();
    startTicking();

    Audio.startMusic();
    renderQuestion();
  }

  /* The on-screen clock. It reads the real elapsed time from the
     timer every 200 ms rather than counting down on its own, so
     a throttled background tab cannot give anyone extra time. */
  function startTicking() {
    stopTicking();
    paintTimer();
    state.tickHandle = window.setInterval(function () {
      paintTimer();
      if (state.timer.hasExpired() && !state.finished) finishAttempt(true);
    }, 200);
  }

  function stopTicking() {
    if (state.tickHandle !== null) {
      window.clearInterval(state.tickHandle);
      state.tickHandle = null;
    }
  }

  const timerEl = $("timerValue");
  const timerBadge = $("timerBadge");

  function paintTimer() {
    const remainingMs = state.timer.remainingMs();
    const seconds = Math.ceil(remainingMs / 1000);
    timerEl.textContent = Engine.formatTime(seconds);

    // Calm above a minute, a slow pulse under it, urgent under 20.
    const urgent = seconds <= 20;
    const warn = seconds <= 60 && !urgent;
    timerBadge.classList.toggle("is-warning", warn);
    timerBadge.classList.toggle("is-urgent", urgent);

    if (warn && !state.warned60) { state.warned60 = true; Audio.warning(); }
    if (urgent && !state.warned20) { state.warned20 = true; Audio.warning(); }
  }


  /* ----------------------------------------------------------
     DRAWING ONE QUESTION
     ---------------------------------------------------------- */
  const questionText = $("questionText");
  const questionMeta = $("questionCounter");
  const progressFill = $("progressFill");
  const answersWrap = $("answerList");
  const imageWrap = $("questionImageWrap");
  const questionImage = $("questionImage");
  const questionCard = $("questionCard");
  const submitWrap = $("multiSubmitWrap");
  const submitButton = $("multiSubmitButton");
  const typeBadge = $("questionTypeBadge");

  /* A shape + letter for each answer slot, so the four cards are
     told apart by more than colour alone. */
  const SLOT_SHAPES = ["▲", "◆", "●", "■"];
  const SLOT_LETTERS = ["A", "B", "C", "D"];

  const TYPE_LABELS = {
    "single-choice": "Choose one",
    "true-false": "True or False",
    "multiple-select": "Choose all that apply",
    "image-choice": "Look at the image",
    "sequence-choice": "Choose the correct order",
  };

  function currentQuestion() {
    return state.questions[state.currentIndex];
  }

  function renderQuestion() {
    const q = currentQuestion();
    state.selected = [];
    state.locked = false;

    const number = state.currentIndex + 1;
    const total = state.questions.length;

    questionMeta.textContent = number + " / " + total;
    progressFill.style.width = ((number - 1) / total) * 100 + "%";
    $("scoreValue").textContent = String(countCorrect());

    typeBadge.textContent = TYPE_LABELS[q.type] || "Choose one";
    questionText.textContent = q.question;

    // Image, if this question has one.
    if (q.image) {
      questionImage.src = "quiz-images/" + q.image;
      questionImage.alt = q.imageAlt || "";
      imageWrap.hidden = false;
      imageWrap.classList.remove("is-failed");
    } else {
      imageWrap.hidden = true;
      questionImage.removeAttribute("src");
    }

    // Multiple-select is the only type with a Submit button.
    const isMulti = q.type === "multiple-select";
    submitWrap.hidden = !isMulti;
    submitButton.disabled = true;

    buildAnswerCards(q, isMulti);

    // Replay the entry animation.
    questionCard.classList.remove("is-entering");
    void questionCard.offsetWidth;          // forces the browser to notice the removal
    questionCard.classList.add("is-entering");
  }

  function buildAnswerCards(q, isMulti) {
    answersWrap.innerHTML = "";
    answersWrap.classList.toggle("answer-list-duo", q.type === "true-false");

    q.options.forEach(function (option, index) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "answer-card answer-slot-" + (index % 4);
      card.dataset.optionId = option.id;

      if (isMulti) {
        card.setAttribute("role", "checkbox");
        card.setAttribute("aria-checked", "false");
      }

      const badge = document.createElement("span");
      badge.className = "answer-badge";
      badge.setAttribute("aria-hidden", "true");
      badge.textContent =
        q.type === "true-false"
          ? (option.id === "t" ? "✔" : "✘")
          : SLOT_SHAPES[index % 4] + " " + SLOT_LETTERS[index % 4];

      const label = document.createElement("span");
      label.className = "answer-text";
      label.textContent = option.text;

      const tick = document.createElement("span");
      tick.className = "answer-tick";
      tick.setAttribute("aria-hidden", "true");
      tick.textContent = "✓";

      card.appendChild(badge);
      card.appendChild(label);
      if (isMulti) card.appendChild(tick);

      card.addEventListener("click", function () {
        if (isMulti) toggleOption(card, option.id);
        else answerQuestion(option.id);
      });

      answersWrap.appendChild(card);
    });
  }

  /* If an image 404s or the connection drops mid-load, say so
     rather than leaving a broken icon — the question text still
     stands on its own. */
  questionImage.addEventListener("error", function () {
    imageWrap.classList.add("is-failed");
  });


  /* ----------------------------------------------------------
     ANSWERING
     ---------------------------------------------------------- */

  function toggleOption(card, optionId) {
    if (state.locked) return;

    const at = state.selected.indexOf(optionId);
    if (at === -1) state.selected.push(optionId);
    else state.selected.splice(at, 1);

    const on = at === -1;
    card.classList.toggle("is-selected", on);
    card.setAttribute("aria-checked", on ? "true" : "false");

    submitButton.disabled = state.selected.length === 0;
    Audio.select();
  }

  submitButton.addEventListener("click", function () {
    if (state.locked || state.selected.length === 0) return;
    answerQuestion(state.selected.slice());
  });

  /* The single path every answer goes through.

     state.locked is the guard against double submission: a
     double-tap, or a tap that lands while the feedback flash is
     still running, is ignored. */
  function answerQuestion(selected) {
    if (state.locked || state.finished) return;
    state.locked = true;

    const q = currentQuestion();

    /* If the clock ran out in the moment between the tap and
       this line, the attempt is already over. Drop the answer
       and let the timeout stand. */
    if (state.timer.hasExpired()) {
      finishAttempt(true);
      return;
    }

    const correct = Engine.isCorrect(q, selected);

    state.responses.push({
      questionId: q.id,
      selected: selected,
      correct: correct,
    });

    showFeedback(correct);

    window.setTimeout(function () {
      if (state.finished) return;

      if (state.timer.hasExpired()) { finishAttempt(true); return; }

      state.currentIndex += 1;
      if (state.currentIndex >= state.questions.length) finishAttempt(false);
      else renderQuestion();
    }, FEEDBACK_MS);
  }

  const feedbackEl = $("feedbackFlash");

  /* Correct and wrong are told apart by an icon and a word, not
     only by colour — the same information reaches someone who
     cannot separate red from green.

     Note what is deliberately absent: the correct answer is
     never shown, highlighted or explained. A student who does
     not know it is meant to go back to the slides. */
  function showFeedback(correct) {
    const CORRECT_WORDS = ["Correct!", "Excellent!", "Nice one!", "Spot on!", "Yes!"];

    feedbackEl.className = "feedback-flash " + (correct ? "is-correct" : "is-wrong");
    feedbackEl.innerHTML = "";

    const icon = document.createElement("span");
    icon.className = "feedback-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = correct ? "✓" : "✕";

    const word = document.createElement("span");
    word.className = "feedback-word";
    word.textContent = correct
      ? CORRECT_WORDS[Engine.randomInt(CORRECT_WORDS.length)]
      : "Not correct";

    feedbackEl.appendChild(icon);
    feedbackEl.appendChild(word);
    feedbackEl.hidden = false;

    // Announce it to a screen reader too.
    feedbackEl.setAttribute("role", "status");

    // Shake the card on a wrong answer.
    questionCard.classList.toggle("is-wrong-shake", !correct);

    if (correct) Audio.correct();
    else Audio.wrong();

    window.setTimeout(function () {
      feedbackEl.hidden = true;
      questionCard.classList.remove("is-wrong-shake");
    }, FEEDBACK_MS - 100);
  }

  function countCorrect() {
    let n = 0;
    for (const r of state.responses) if (r.correct) n++;
    return n;
  }


  /* ==========================================================
     FINISHING
     ========================================================== */

  function finishAttempt(timedOut) {
    if (state.finished) return;
    state.finished = true;
    state.locked = true;

    stopTicking();
    state.timer.stop();
    Audio.stopMusic();
    feedbackEl.hidden = true;

    /* Anything the student never reached counts as incorrect.
       They are NOT written into responses as fake answers —
       the row records only what was actually answered, and the
       score is the number of correct ones out of 30. */
    const marks = Engine.scoreAttempt(state.responses, state.questions.length);

    const durationSeconds = Math.min(
      Math.round(state.timer.elapsedMs() / 1000),
      Math.round(Engine.TIME_LIMIT_MS / 1000)
    );

    const result = {
      score: marks.score,
      totalQuestions: marks.totalQuestions,
      percentage: marks.percentage,
      completed: marks.completed,
      timedOut: !!timedOut,
      durationSeconds: durationSeconds,
      attemptNumber: state.attemptNumber,
    };
    state.lastResult = result;

    // Record it before painting, so the screen can list this
    // attempt along with the ones before it.
    state.history.push(result);

    if (result.completed) showPerfect(result);
    else showFailed(result);

    saveResult(result);
  }


  /* ----------------------------------------------------------
     THE ATTEMPT HISTORY
     ----------------------------------------------------------
     Shown on both result screens. The last row is the attempt
     that just finished, and it is marked so the student can pick
     it out of the list at a glance.

     Note what this does NOT do: it never says which questions
     were missed. It reports scores only, which keeps the rule
     that a wrong answer is never revealed.
     ---------------------------------------------------------- */
  function renderHistory(listEl, summaryEl) {
    if (!listEl) return;

    listEl.innerHTML = "";

    const attempts = state.history;
    const currentIndex = attempts.length - 1;

    attempts.forEach(function (a, index) {
      const row = document.createElement("li");
      row.className = "attempt-row";
      if (index === currentIndex) row.classList.add("is-current");
      if (a.completed) row.classList.add("is-pass");

      const label = document.createElement("span");
      label.className = "attempt-label";
      label.textContent = "Attempt " + a.attemptNumber;

      const score = document.createElement("span");
      score.className = "attempt-score";
      score.textContent = a.score + " / " + a.totalQuestions;

      const pct = document.createElement("span");
      pct.className = "attempt-pct";
      pct.textContent = Math.round(a.percentage) + "%";

      const time = document.createElement("span");
      time.className = "attempt-time";
      // A timed-out attempt is called out, because its time is
      // just the limit and would otherwise look like a real one.
      time.textContent = a.timedOut ? "Time up" : Engine.formatTime(a.durationSeconds);

      const mark = document.createElement("span");
      mark.className = "attempt-mark";
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = a.completed ? "🏆" : "";

      // Screen readers get the outcome in words, not just a colour.
      row.setAttribute(
        "aria-label",
        "Attempt " + a.attemptNumber + ": " + a.score + " out of " + a.totalQuestions +
        ", " + Math.round(a.percentage) + " percent, " +
        (a.completed ? "completed" : "not completed") +
        (index === currentIndex ? ", this attempt" : "")
      );

      row.appendChild(label);
      row.appendChild(score);
      row.appendChild(pct);
      row.appendChild(time);
      row.appendChild(mark);
      listEl.appendChild(row);
    });

    if (summaryEl) {
      const best = attempts.reduce(function (top, a) {
        return a.score > top ? a.score : top;
      }, 0);

      summaryEl.textContent =
        attempts.length === 1
          ? "This is your first attempt in this session."
          : attempts.length + " attempts this session · best so far " +
            best + " / " + Engine.QUESTIONS_PER_ATTEMPT;
    }
  }


  /* ----------------------------------------------------------
     SENDING THE RESULT
     ----------------------------------------------------------
     The result is worked out and shown locally first, so a slow
     or broken connection never stops the student seeing their
     score. The save happens behind it, and the little status
     line reports honestly what happened — it never claims a
     result was recorded when the insert failed.
     ---------------------------------------------------------- */
  const saveStatusEls = [$("resultSaveStatus"), $("perfectSaveStatus")];

  function setSaveStatus(text, kind, showRetry) {
    saveStatusEls.forEach(function (el) {
      if (!el) return;
      el.className = "save-status is-" + kind;
      el.textContent = text;

      if (showRetry) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "save-retry";
        btn.textContent = "Retry saving";
        btn.addEventListener("click", function () {
          Audio.tap();
          if (state.lastResult) saveResult(state.lastResult);
        });
        el.appendChild(document.createTextNode(" "));
        el.appendChild(btn);
      }
    });
  }

  async function saveResult(result) {
    setSaveStatus("Saving your result…", "pending", false);

    const row = {
      session_id: state.sessionId,
      attempt_number: result.attemptNumber,
      student_name: state.studentName,
      class_name: state.className,
      score: result.score,
      total_questions: result.totalQuestions,
      percentage: result.percentage,
      duration_seconds: result.durationSeconds,
      completed: result.completed,
      timed_out: result.timedOut,

      // The 30 ids that made up this paper, in the order shown.
      question_set: state.questions.map(function (q) { return q.id; }),

      // What was picked, and whether it was right. The answer KEY
      // is not sent — it stays in quiz-questions.js.
      responses: state.responses.map(function (r) {
        return { questionId: r.questionId, selected: r.selected, correct: r.correct };
      }),
    };

    const outcome = await Database.saveAttempt(row);

    if (outcome.ok) {
      setSaveStatus("Result saved.", "ok", false);
      // Only now is it safe to say the leaderboard will show it.
      if (result.completed) loadLeaderboard();
    } else if (outcome.retryable) {
      setSaveStatus("Your result could not be saved — check your connection.", "error", true);
    } else {
      setSaveStatus("Your result could not be saved.", "error", true);
      // Worth a look in the console for the lecturer, not the student.
      if (window.console) console.error("[Zero Defect Rush]", outcome.error);
    }
  }


  /* ==========================================================
     SCREEN 4 — BELOW 30/30
     ========================================================== */
  function showFailed(result) {
    $("resultName").textContent = state.studentName;
    $("resultClass").textContent = state.className;
    $("resultScore").textContent = result.score + " / " + result.totalQuestions;
    $("resultPercent").textContent = Math.round(result.percentage) + "%";
    $("resultAttempt").textContent = "Attempt " + result.attemptNumber;

    $("resultHeadline").textContent =
      result.timedOut ? "TIME'S UP!" : "ALMOST THERE!";

    $("resultMessage").textContent = result.timedOut
      ? "The clock beat you this time. Review the lecture slides and give it another try!"
      : "Review the lecture slides and give it another try!";

    // The rule, stated plainly, without revealing a single answer.
    $("resultRule").textContent =
      "You need 30 / 30 to complete this challenge.";

    renderHistory($("resultHistoryList"), $("resultHistorySummary"));

    showScreen("result");
    Audio.fail();
  }

  $("tryAgainButton").addEventListener("click", function () {
    Audio.unlock();
    Audio.tap();
    // Same session, same student, a brand new set of 30.
    startAttempt();
  });

  $("resultHomeButton").addEventListener("click", function () {
    Audio.tap();
    goHome();
  });


  /* ==========================================================
     SCREEN 5 — PERFECT SCORE
     ========================================================== */
  function showPerfect(result) {
    $("perfectName").textContent = state.studentName;
    $("perfectClass").textContent = state.className;
    $("perfectScore").textContent = result.score + " / " + result.totalQuestions;
    $("perfectPercent").textContent = "100%";
    $("perfectTime").textContent = Engine.formatTime(result.durationSeconds);
    $("perfectAttempt").textContent =
      result.attemptNumber === 1
        ? "First attempt"
        : "Attempt " + result.attemptNumber;

    renderHistory($("perfectHistoryList"), $("perfectHistorySummary"));

    showScreen("perfect");
    Celebration.celebrate();
    Audio.celebrate();
  }

  $("perfectHomeButton").addEventListener("click", function () {
    Audio.tap();
    goHome();
  });

  $("perfectLeaderboardButton").addEventListener("click", function () {
    Audio.tap();
    openLeaderboard();
  });

  function goHome() {
    Celebration.stop();
    Audio.stopMusic();
    stopTicking();

    // A fresh sitting next time: new session id, attempt 1, and
    // an empty history — the list covers one session, not one
    // person, so it starts over with the session.
    state.sessionId = null;
    state.attemptNumber = 0;
    state.questions = [];
    state.responses = [];
    state.lastResult = null;
    state.history = [];

    showScreen("welcome");
  }


  /* ==========================================================
     SCREEN 6 — LEADERBOARD
     ========================================================== */
  const boardBody = $("leaderboardBody");
  const boardStatus = $("leaderboardStatus");
  let boardCameFrom = "welcome";

  function openLeaderboard() {
    boardCameFrom = screens.perfect.hidden ? "welcome" : "perfect";
    showScreen("leaderboard");
    loadLeaderboard();
  }

  $("leaderboardButton").addEventListener("click", function () {
    Audio.unlock();
    Audio.tap();
    openLeaderboard();
  });

  $("leaderboardBackButton").addEventListener("click", function () {
    Audio.tap();
    showScreen(boardCameFrom);
    if (boardCameFrom === "perfect") Celebration.confettiBurst();
  });

  $("leaderboardRefreshButton").addEventListener("click", function () {
    Audio.tap();
    loadLeaderboard();
  });

  const MEDALS = ["🥇", "🥈", "🥉"];

  async function loadLeaderboard() {
    boardStatus.className = "board-status is-pending";
    boardStatus.textContent = "Loading…";

    const outcome = await Database.fetchLeaderboard();

    /* A leaderboard that will not load is an inconvenience, not
       a failure of the quiz. It reports the problem here and
       leaves every other screen working. */
    if (!outcome.ok) {
      boardStatus.className = "board-status is-error";
      boardStatus.textContent = "The leaderboard could not be loaded. Tap Refresh to try again.";
      if (window.console) console.error("[Zero Defect Rush]", outcome.error);
      return;
    }

    boardBody.innerHTML = "";

    if (outcome.rows.length === 0) {
      boardStatus.className = "board-status is-empty";
      boardStatus.textContent = "No perfect scores yet. Be the first!";
      return;
    }

    boardStatus.className = "board-status is-ok";
    boardStatus.textContent =
      outcome.rows.length === 1
        ? "1 student has scored 30 / 30."
        : outcome.rows.length + " students have scored 30 / 30.";

    outcome.rows.forEach(function (row, index) {
      const card = document.createElement("li");
      card.className = "board-row" + (index < 3 ? " board-row-top" : "");

      const rank = document.createElement("span");
      rank.className = "board-rank";
      rank.textContent = index < 3 ? MEDALS[index] : String(index + 1);

      const who = document.createElement("span");
      who.className = "board-who";

      const person = document.createElement("span");
      person.className = "board-name";
      person.textContent = row.student_name;

      const klass = document.createElement("span");
      klass.className = "board-class";
      klass.textContent = row.class_name;

      who.appendChild(person);
      who.appendChild(klass);

      const time = document.createElement("span");
      time.className = "board-time";
      time.textContent = Engine.formatTime(row.duration_seconds);

      card.appendChild(rank);
      card.appendChild(who);
      card.appendChild(time);
      boardBody.appendChild(card);
    });
  }


  /* ==========================================================
     START-UP
     ========================================================== */
  wireSoundToggles();
  showScreen("welcome");

  /* Leaving mid-attempt abandons it, by design — there is no
     resume. Stopping the music and the clock here just avoids a
     tab that keeps humming after the student has moved on. */
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) Audio.stopMusic();
    else if (!screens.game.hidden && !state.finished) Audio.startMusic();
  });

})();
