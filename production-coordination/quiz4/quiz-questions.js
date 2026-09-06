/* ============================================================
   quiz-questions.js — THE QUESTION BANK (Activity 4)
   ============================================================
   Every question here was written from ONE source only:

     Chapter3_Corrective_Action_Process_ .pptx
     "Corrective Action and Process Improvement"
     56 slides · revised 3 September 2026

   ------------------------------------------------------------
   SCOPE: SLIDES 36 TO 56
   ------------------------------------------------------------
   This is the second half of the deck, picking up exactly where
   Activity 3 stopped. It starts at slide 36 — the Lean
   definition — which is the hinge between the two activities.

   Everything before slide 36 is out of scope: the 7 QC Tools,
   PDCA, 4W1H and CAPA all belong to Activity 3.

   Nothing was added from the internet, a textbook, or general
   knowledge. If a fact is not on slides 36-56, there is no
   question about it.

   ------------------------------------------------------------
   FORTY-SEVEN QUESTIONS — FUNDAMENTALS ONLY
   ------------------------------------------------------------
   The bank was drafted at 75, cut to 50, then to 47. What went,
   and why:

     · The eight shop-floor EXAMPLES of the wastes (the autoclave
       wait, the freezer, the 60 panels, the sanding). They
       illustrate a definition that is already asked; they are
       not knowledge of their own.
     · Duplicates — two questions answerable by knowing the same
       single sentence.
     · Slogans with nothing to test ("waste is everywhere once
       you learn to see it").
     · ALL of slide 53. It recaps 4W1H, check sheets, Pareto,
       Fishbone and CAPA — Activity 3's material, already
       examined there. Three questions survived the first cut and
       the lecturer removed those too, which is the same rule
       applied more strictly: this activity examines Lean, and
       Activity 3 examines the rest.

   What remains is the load-bearing content: what Lean is, VA
   and NVA, all eight wastes, MUDA/MURA/MURI, Jidoka, Andon,
   Kaizen, 5S, and the chapter's own takeaways.

   ------------------------------------------------------------
   THE GAP AT w046
   ------------------------------------------------------------
   Ids run w001-w045 and then w049-w050. Nothing is missing: the
   three slide-53 questions were w046, w047 and w048, and the
   ones after them were NOT renumbered to close the gap.

   That is deliberate. Every attempt writes its question_set —
   the list of ids on that paper — into the Google Sheet. Reusing
   w046 for a different question would silently change what an
   already-saved row means. Ids are cheap; stored data that
   quietly lies is not. New questions take new ids from w051 up.

   ------------------------------------------------------------
   SLIDES THAT PRODUCED NOTHING, AND WHY
   ------------------------------------------------------------
     43, 44  "Benefits of Lean Manufacturing" — the benefits are
             inside the artwork, so there is no wording to quote.
     46, 47, 50, 51  picture-only.
     53      "How it all fits together" — a recap of Activity 3.
     54      The assignment brief. Course admin, not knowledge.

   This is the rule working as intended: where the deck does not
   say it in words, nothing is invented to fill the gap.

   ------------------------------------------------------------
   HOW TO READ A QUESTION OBJECT
   ------------------------------------------------------------
     id            "w" for waste — Activity 3 uses "v", so the
                   two banks can never collide in a spreadsheet
     type          single-choice | true-false | multiple-select
                   | image-choice | sequence-choice
     correctAnswer option id, or an ARRAY for multiple-select
     sourceSlide   DEVELOPER ONLY, never shown to students

   THE FIRST OPTION IS ALWAYS THE CORRECT ONE, which makes the
   bank quick to proofread. Students never see that order — the
   engine shuffles options on every question of every attempt
   and tracks the answer by a stable id, never by position.

   ------------------------------------------------------------
   TYPE COUNTS — read this before deleting anything
   ------------------------------------------------------------
     single-choice     32
     true-false         5
     multiple-select    6
     sequence-choice    3   <-- quota is 2, so two of these three
                                appear on every paper. They are
                                the DOWNTIME halves and the 5S
                                order, which are worth repeating.
     image-choice       1   <-- slide 37 is the ONLY picture in
                                range carrying a testable idea,
                                so TYPE_QUOTAS in quiz-engine.js
                                asks for 1, not Activity 3's 3.

   quiz-tests.js checks these counts against the quotas. If a
   pool ever drops below its quota the attempt is still 20
   questions — the engine tops up from the rest of the bank —
   but the promised mixture quietly stops happening.
   ============================================================ */

"use strict";

const QUIZ_QUESTIONS = [

  /* ==========================================================
     WHAT LEAN IS  (slides 36-38)
     ========================================================== */
  {
    id: "w001",
    type: "single-choice",
    question: "Lean Manufacturing is defined as a systematic approach to:",
    options: [
      { id: "a", text: "Eliminating waste and increasing value in manufacturing" },
      { id: "b", text: "Increasing the speed of every operator" },
      { id: "c", text: "Replacing workers with machines" },
      { id: "d", text: "Producing as much stock as possible" },
    ],
    correctAnswer: "a",
    sourceSlide: 36,
  },
  {
    id: "w002",
    type: "single-choice",
    question: "In Lean, what is VALUE?",
    options: [
      { id: "a", text: "What the customer pays for" },
      { id: "b", text: "What the customer would not pay for" },
      { id: "c", text: "The cost of the raw material" },
      { id: "d", text: "The time taken to make the part" },
    ],
    correctAnswer: "a",
    sourceSlide: 36,
  },
  {
    id: "w003",
    type: "single-choice",
    question: "In Lean, what is WASTE?",
    options: [
      { id: "a", text: "What the customer would not pay for" },
      { id: "b", text: "What the customer pays for" },
      { id: "c", text: "Anything left in the scrap bin" },
      { id: "d", text: "Any job that takes longer than one shift" },
    ],
    correctAnswer: "a",
    sourceSlide: 36,
  },
  {
    id: "w004",
    type: "true-false",
    question: "According to the lecture, Lean means working faster.",
    options: [
      { id: "t", text: "True" },
      { id: "f", text: "False" },
    ],
    correctAnswer: "f",
    sourceSlide: 36,
  },
  {
    id: "w005",
    type: "single-choice",
    question: "What is the stated GOAL of Lean Manufacturing?",
    options: [
      { id: "a", text: "Deliver more value to customers using fewer resources, time and inventory" },
      { id: "b", text: "Deliver the same value using more inventory" },
      { id: "c", text: "Reduce the number of products offered" },
      { id: "d", text: "Increase the size of every production batch" },
    ],
    correctAnswer: "a",
    sourceSlide: 36,
  },
  {
    id: "w006",
    type: "image-choice",
    question: "This slide sums Lean up as doing which two things at once?",
    image: "lean-value-waste.png",
    imageAlt: "An introduction slide for Lean Manufacturing with a downward arrow labelled minimising waste on the left and an upward arrow labelled maximising value on the right",
    options: [
      { id: "a", text: "Minimising waste and maximising value" },
      { id: "b", text: "Maximising waste and minimising value" },
      { id: "c", text: "Minimising both waste and value" },
      { id: "d", text: "Maximising both waste and value" },
    ],
    correctAnswer: "a",
    sourceSlide: 37,
  },
  {
    id: "w007",
    type: "single-choice",
    question: "What does Value-Added (VA) mean?",
    options: [
      { id: "a", text: "Activities that transform a product or service to meet customer needs" },
      { id: "b", text: "Wasteful actions consuming resources without adding value" },
      { id: "c", text: "Any activity carried out by a supervisor" },
      { id: "d", text: "Any activity that takes less than a minute" },
    ],
    correctAnswer: "a",
    sourceSlide: 38,
  },
  {
    id: "w008",
    type: "single-choice",
    question: "What does Non-Value-Added (NVA) mean?",
    options: [
      { id: "a", text: "Wasteful actions consuming resources without adding value" },
      { id: "b", text: "Activities that transform a product to meet customer needs" },
      { id: "c", text: "Activities the customer has specifically requested" },
      { id: "d", text: "Activities performed only during an audit" },
    ],
    correctAnswer: "a",
    sourceSlide: 38,
  },
  {
    id: "w009",
    type: "single-choice",
    question: "What is the stated Lean Objective?",
    options: [
      { id: "a", text: "Maximise VA and eliminate NVA" },
      { id: "b", text: "Maximise NVA and eliminate VA" },
      { id: "c", text: "Keep VA and NVA in balance" },
      { id: "d", text: "Measure NVA but leave it in place" },
    ],
    correctAnswer: "a",
    sourceSlide: 38,
  },
  {
    id: "w010",
    type: "true-false",
    question: "Non-Value-Added activities consume resources without adding value.",
    options: [
      { id: "t", text: "True" },
      { id: "f", text: "False" },
    ],
    correctAnswer: "t",
    sourceSlide: 38,
  },
  {
    id: "w011",
    type: "multiple-select",
    question: "Which of these terms does the lecture use when separating useful work from waste?",
    options: [
      { id: "a", text: "Value-Added (VA)" },
      { id: "b", text: "Non-Value-Added (NVA)" },
      { id: "c", text: "Value" },
      { id: "d", text: "Value Engineering" },
    ],
    correctAnswer: ["a", "b", "c"],
    sourceSlide: 38,
  },

  /* ==========================================================
     THE 8 WASTES — DOWNTIME  (slides 39-42)
     ========================================================== */
  {
    id: "w012",
    type: "single-choice",
    question: "How many wastes are in the DOWNTIME model?",
    options: [
      { id: "a", text: "8" },
      { id: "b", text: "5" },
      { id: "c", text: "6" },
      { id: "d", text: "7" },
    ],
    correctAnswer: "a",
    sourceSlide: 39,
  },
  {
    id: "w013",
    type: "single-choice",
    question: "In DOWNTIME, what does the letter D stand for?",
    options: [
      { id: "a", text: "Defects" },
      { id: "b", text: "Delay" },
      { id: "c", text: "Downtime" },
      { id: "d", text: "Delamination" },
    ],
    correctAnswer: "a",
    sourceSlide: 39,
  },
  {
    id: "w014",
    type: "single-choice",
    question: "In DOWNTIME, what does the letter O stand for?",
    options: [
      { id: "a", text: "Overproduction" },
      { id: "b", text: "Overtime" },
      { id: "c", text: "Operator error" },
      { id: "d", text: "Order delay" },
    ],
    correctAnswer: "a",
    sourceSlide: 39,
  },
  {
    id: "w015",
    type: "single-choice",
    question: "In DOWNTIME, what does the letter W stand for?",
    options: [
      { id: "a", text: "Waiting" },
      { id: "b", text: "Waste" },
      { id: "c", text: "Walking" },
      { id: "d", text: "Wrinkle" },
    ],
    correctAnswer: "a",
    sourceSlide: 39,
  },
  {
    id: "w016",
    type: "single-choice",
    question: "In DOWNTIME, what does the letter N stand for?",
    options: [
      { id: "a", text: "Non-used talent" },
      { id: "b", text: "No standard" },
      { id: "c", text: "Night shift" },
      { id: "d", text: "New material" },
    ],
    correctAnswer: "a",
    sourceSlide: 39,
  },
  {
    id: "w017",
    type: "single-choice",
    question: "In DOWNTIME, what does the letter T stand for?",
    options: [
      { id: "a", text: "Transport" },
      { id: "b", text: "Talent" },
      { id: "c", text: "Training" },
      { id: "d", text: "Temperature" },
    ],
    correctAnswer: "a",
    sourceSlide: 40,
  },
  {
    id: "w018",
    type: "single-choice",
    question: "In DOWNTIME, what does the letter I stand for?",
    options: [
      { id: "a", text: "Inventory" },
      { id: "b", text: "Inspection" },
      { id: "c", text: "Injury" },
      { id: "d", text: "Idle time" },
    ],
    correctAnswer: "a",
    sourceSlide: 40,
  },
  {
    id: "w019",
    type: "single-choice",
    question: "In DOWNTIME, what does the letter M stand for?",
    options: [
      { id: "a", text: "Motion" },
      { id: "b", text: "Material" },
      { id: "c", text: "Machine" },
      { id: "d", text: "Method" },
    ],
    correctAnswer: "a",
    sourceSlide: 40,
  },
  {
    id: "w020",
    type: "single-choice",
    question: "In DOWNTIME, what does the letter E stand for?",
    options: [
      { id: "a", text: "Extra processing" },
      { id: "b", text: "Environment" },
      { id: "c", text: "Error" },
      { id: "d", text: "Equipment" },
    ],
    correctAnswer: "a",
    sourceSlide: 40,
  },
  {
    id: "w021",
    type: "sequence-choice",
    question: "Which sequence spells out the first four wastes of DOWNTIME in order?",
    options: [
      { id: "a", text: "Defects → Overproduction → Waiting → Non-used talent" },
      { id: "b", text: "Defects → Waiting → Overproduction → Non-used talent" },
      { id: "c", text: "Overproduction → Defects → Non-used talent → Waiting" },
      { id: "d", text: "Waiting → Non-used talent → Defects → Overproduction" },
    ],
    correctAnswer: "a",
    sourceSlide: 39,
  },
  {
    id: "w022",
    type: "sequence-choice",
    question: "Which sequence spells out the last four wastes of DOWNTIME in order?",
    options: [
      { id: "a", text: "Transport → Inventory → Motion → Extra processing" },
      { id: "b", text: "Inventory → Transport → Extra processing → Motion" },
      { id: "c", text: "Transport → Motion → Inventory → Extra processing" },
      { id: "d", text: "Motion → Inventory → Transport → Extra processing" },
    ],
    correctAnswer: "a",
    sourceSlide: 40,
  },
  {
    id: "w023",
    type: "single-choice",
    question: "What is the difference between Transport and Motion as wastes?",
    options: [
      { id: "a", text: "Transport is moving material; Motion is people moving" },
      { id: "b", text: "Transport is people moving; Motion is moving material" },
      { id: "c", text: "They are two names for the same waste" },
      { id: "d", text: "Transport happens indoors; Motion happens outdoors" },
    ],
    correctAnswer: "a",
    sourceSlide: 40,
  },
  {
    id: "w024",
    type: "multiple-select",
    question: "Which of these are wastes in the DOWNTIME model?",
    options: [
      { id: "a", text: "Waiting" },
      { id: "b", text: "Inventory" },
      { id: "c", text: "Motion" },
      { id: "d", text: "Measurement" },
    ],
    correctAnswer: ["a", "b", "c"],
    sourceSlide: 40,
  },
  {
    id: "w025",
    type: "single-choice",
    question: "The 8 types of waste are also known by which Japanese term?",
    options: [
      { id: "a", text: "MUDA" },
      { id: "b", text: "KAIZEN" },
      { id: "c", text: "JIDOKA" },
      { id: "d", text: "ANDON" },
    ],
    correctAnswer: "a",
    sourceSlide: 41,
  },
  {
    id: "w026",
    type: "multiple-select",
    question: "Which three Japanese terms appear together on the waste slide?",
    options: [
      { id: "a", text: "MUDA" },
      { id: "b", text: "MURA" },
      { id: "c", text: "MURI" },
      { id: "d", text: "MIZU" },
    ],
    correctAnswer: ["a", "b", "c"],
    sourceSlide: 42,
  },

  /* ==========================================================
     LEAN TOOLS  (slides 45, 48)
     ========================================================== */
  {
    id: "w027",
    type: "single-choice",
    question: "The lecture describes Lean as:",
    options: [
      { id: "a", text: "A journey, not a destination" },
      { id: "b", text: "A destination, not a journey" },
      { id: "c", text: "A one-off project" },
      { id: "d", text: "An annual audit" },
    ],
    correctAnswer: "a",
    sourceSlide: 45,
  },
  {
    id: "w028",
    type: "single-choice",
    question: "Jidoka is a Lean tool of Japanese origin. What does it translate to?",
    options: [
      { id: "a", text: "Intelligent automation" },
      { id: "b", text: "Change for the better" },
      { id: "c", text: "A tidy workplace" },
      { id: "d", text: "Just in time" },
    ],
    correctAnswer: "a",
    sourceSlide: 48,
  },
  {
    id: "w029",
    type: "single-choice",
    question: "What is Andon?",
    options: [
      { id: "a", text: "A signalling system that alerts operators and managers to production line problems" },
      { id: "b", text: "A method of counting defects on a tally sheet" },
      { id: "c", text: "A Japanese term for continuous improvement" },
      { id: "d", text: "A chart showing the spread of measurements" },
    ],
    correctAnswer: "a",
    sourceSlide: 48,
  },
  {
    id: "w030",
    type: "multiple-select",
    question: "Which colours does an Andon signalling system use?",
    options: [
      { id: "a", text: "Red" },
      { id: "b", text: "Yellow" },
      { id: "c", text: "Green" },
      { id: "d", text: "Blue" },
    ],
    correctAnswer: ["a", "b", "c"],
    sourceSlide: 48,
  },
  {
    id: "w031",
    type: "true-false",
    question: "Andon alerts both operators and managers to production line problems.",
    options: [
      { id: "t", text: "True" },
      { id: "f", text: "False" },
    ],
    correctAnswer: "t",
    sourceSlide: 48,
  },

  /* ==========================================================
     KAIZEN  (slide 49)
     ========================================================== */
  {
    id: "w032",
    type: "single-choice",
    question: "Kaizen is Japanese for:",
    options: [
      { id: "a", text: "Change for the better" },
      { id: "b", text: "Intelligent automation" },
      { id: "c", text: "A place for everything" },
      { id: "d", text: "Zero defects" },
    ],
    correctAnswer: "a",
    sourceSlide: 49,
  },
  {
    id: "w033",
    type: "single-choice",
    question: "Kaizen means small improvements, made by:",
    options: [
      { id: "a", text: "Everyone, every day" },
      { id: "b", text: "The quality manager only" },
      { id: "c", text: "The maintenance team only" },
      { id: "d", text: "An outside consultant once a year" },
    ],
    correctAnswer: "a",
    sourceSlide: 49,
  },
  {
    id: "w034",
    type: "single-choice",
    question: "Under the Kaizen principle \"Everyone helps\", who may suggest an idea?",
    options: [
      { id: "a", text: "Any worker" },
      { id: "b", text: "Only supervisors" },
      { id: "c", text: "Only the quality department" },
      { id: "d", text: "Only engineers" },
    ],
    correctAnswer: "a",
    sourceSlide: 49,
  },
  {
    id: "w035",
    type: "multiple-select",
    question: "Which of these are the Kaizen principles named in the lecture?",
    options: [
      { id: "a", text: "Everyone helps" },
      { id: "b", text: "Cheap wins" },
      { id: "c", text: "Small and steady" },
      { id: "d", text: "Big leaps" },
    ],
    correctAnswer: ["a", "b", "c"],
    sourceSlide: 49,
  },
  {
    id: "w036",
    type: "true-false",
    question: "Kaizen relies on large, occasional changes rather than small, frequent ones.",
    options: [
      { id: "t", text: "True" },
      { id: "f", text: "False" },
    ],
    correctAnswer: "f",
    sourceSlide: 49,
  },

  /* ==========================================================
     5S  (slide 52)
     ========================================================== */
  {
    id: "w037",
    type: "single-choice",
    question: "How many steps are in 5S?",
    options: [
      { id: "a", text: "5" },
      { id: "b", text: "4" },
      { id: "c", text: "6" },
      { id: "d", text: "8" },
    ],
    correctAnswer: "a",
    sourceSlide: 52,
  },
  {
    id: "w038",
    type: "single-choice",
    question: "In 5S, what does SORT mean?",
    options: [
      { id: "a", text: "Throw out what you do not need" },
      { id: "b", text: "Clean the area and the machines" },
      { id: "c", text: "Write the rule down" },
      { id: "d", text: "Audit it — make it a habit" },
    ],
    correctAnswer: "a",
    sourceSlide: 52,
  },
  {
    id: "w039",
    type: "single-choice",
    question: "In 5S, what does SET IN ORDER mean?",
    options: [
      { id: "a", text: "A place for everything, everything in its place" },
      { id: "b", text: "Throw out what you do not need" },
      { id: "c", text: "Clean the area and the machines" },
      { id: "d", text: "Audit it — make it a habit" },
    ],
    correctAnswer: "a",
    sourceSlide: 52,
  },
  {
    id: "w040",
    type: "single-choice",
    question: "In 5S, what does SHINE mean?",
    options: [
      { id: "a", text: "Clean the area and the machines" },
      { id: "b", text: "Throw out what you do not need" },
      { id: "c", text: "Write the rule down so all shifts do the same" },
      { id: "d", text: "Audit it — make it a habit" },
    ],
    correctAnswer: "a",
    sourceSlide: 52,
  },
  {
    id: "w041",
    type: "single-choice",
    question: "In 5S, what does STANDARDISE mean?",
    options: [
      { id: "a", text: "Write the rule down so all shifts do the same" },
      { id: "b", text: "Clean the area and the machines" },
      { id: "c", text: "Throw out what you do not need" },
      { id: "d", text: "A place for everything, everything in its place" },
    ],
    correctAnswer: "a",
    sourceSlide: 52,
  },
  {
    id: "w042",
    type: "single-choice",
    question: "In 5S, what does SUSTAIN mean?",
    options: [
      { id: "a", text: "Audit it — make it a habit" },
      { id: "b", text: "Write the rule down" },
      { id: "c", text: "Clean the area and the machines" },
      { id: "d", text: "Throw out what you do not need" },
    ],
    correctAnswer: "a",
    sourceSlide: 52,
  },
  {
    id: "w043",
    type: "sequence-choice",
    question: "Which sequence is the correct order of 5S?",
    options: [
      { id: "a", text: "SORT → SET IN ORDER → SHINE → STANDARDISE → SUSTAIN" },
      { id: "b", text: "SHINE → SORT → SET IN ORDER → SUSTAIN → STANDARDISE" },
      { id: "c", text: "SORT → SHINE → SET IN ORDER → SUSTAIN → STANDARDISE" },
      { id: "d", text: "SET IN ORDER → SORT → STANDARDISE → SHINE → SUSTAIN" },
    ],
    correctAnswer: "a",
    sourceSlide: 52,
  },
  {
    id: "w044",
    type: "multiple-select",
    question: "Which of these are steps of 5S?",
    options: [
      { id: "a", text: "SORT" },
      { id: "b", text: "SHINE" },
      { id: "c", text: "SUSTAIN" },
      { id: "d", text: "SUPPLY" },
    ],
    correctAnswer: ["a", "b", "c"],
    sourceSlide: 52,
  },
  {
    id: "w045",
    type: "true-false",
    question: "In 5S, SUSTAIN means to throw out what you do not need.",
    options: [
      { id: "t", text: "True" },
      { id: "f", text: "False" },
    ],
    correctAnswer: "f",
    sourceSlide: 52,
  },

  /* ==========================================================
     KEY TAKEAWAYS  (slide 55)
     ==========================================================
     Slide 53 sat here and no longer does. See THE GAP AT w046
     in the header.
     ========================================================== */
  {
    id: "w049",
    type: "single-choice",
    question: "In the key takeaways, Lean is summarised as:",
    options: [
      { id: "a", text: "Remove waste — what the customer would not pay for" },
      { id: "b", text: "Describe the problem before you fix it" },
      { id: "c", text: "Simple charts that turn data into a decision" },
      { id: "d", text: "Plan, Do, Check, Act — then go round again" },
    ],
    correctAnswer: "a",
    sourceSlide: 55,
  },
  {
    id: "w050",
    type: "single-choice",
    question: "The closing quotation says: \"Quality is never an accident. It is the result of ___.\"",
    options: [
      { id: "a", text: "intelligent effort" },
      { id: "b", text: "good luck" },
      { id: "c", text: "expensive machines" },
      { id: "d", text: "strict inspection" },
    ],
    correctAnswer: "a",
    sourceSlide: 55,
  },
];

/* ------------------------------------------------------------
   Make the bank available to the other scripts.
   ------------------------------------------------------------
   These files are loaded with plain <script> tags (no bundler),
   so everything shares one global scope. Attaching to window
   makes the intent explicit rather than relying on that.
   ------------------------------------------------------------ */
window.QUIZ_QUESTIONS = QUIZ_QUESTIONS;
