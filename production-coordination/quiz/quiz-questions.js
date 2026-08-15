/* ============================================================
   quiz-questions.js — THE QUESTION BANK
   ============================================================
   Every question here was written from ONE source only:

     Chapter3_Corrective_Action_Process_C.pptx
     "Corrective Action and Process Improvement"

   Nothing was added from the internet, from textbooks, or from
   general knowledge. If a fact is not on a slide, there is no
   question about it.

   ------------------------------------------------------------
   WHY 50, AND WHICH 50
   ------------------------------------------------------------
   This bank was cut from 224 down to 50 in August 2026. The rule
   for what stayed: a question has to test a CONCEPT the student
   must carry out of the chapter — what a tool is for, what a step
   means, how a sequence runs.

   What was removed was every question that only tested recall of
   a worked EXAMPLE from a slide: the 145 °C die temperature, the
   45 delamination defects in the Pareto activity, the 14 July
   night shift, the resin trolley that saved 40 minutes. Those
   illustrate the ideas well in a lecture, but knowing the number
   is not knowing the topic.

   The removed questions are still in the project's git history if
   any of them is ever wanted back.

   ------------------------------------------------------------
   HOW TO READ A QUESTION OBJECT
   ------------------------------------------------------------
     id            never reuse an id, even after editing — old
                   rows in quiz_attempts still refer to them
     type          single-choice | true-false | multiple-select
                   | image-choice | sequence-choice
     question      the words the student reads
     options       [{ id, text }]  — id is stable, text is shown
     correctAnswer option id, or an ARRAY of ids for
                   multiple-select
     image         optional file inside ../quiz-images/
     imageAlt      required whenever image is set
     sourceSlide   DEVELOPER ONLY — which slide proves the answer.
                   Never rendered in the student interface. It is
                   here so the lecturer can re-check the question
                   against the teaching material later.

   ------------------------------------------------------------
   THE FIRST OPTION IS ALWAYS THE CORRECT ONE
   ------------------------------------------------------------
   That makes the bank quick to proofread. Students never see this
   order: the engine shuffles the options on every question of
   every attempt, and the correct answer is tracked by a stable
   option id, never by position. See quiz-engine.js ->
   shuffleOptions().

   ------------------------------------------------------------
   IF YOU REMOVE MORE QUESTIONS
   ------------------------------------------------------------
   Two floors must hold, and quiz-tests.js checks both:
     - at least 30 questions in total, or an attempt cannot be
       built at all
     - enough of each type to meet TYPE_QUOTAS in quiz-engine.js
       (image-choice 3, true-false 4, sequence-choice 2,
       multiple-select 2)
   ============================================================ */

"use strict";

const QUIZ_QUESTIONS = [

  /* ==========================================================
     3.1 — THE 7 QC TOOLS
     ========================================================== */

  /* --- Overview --- */
  {
    id: "q019",
    type: "single-choice",
    question: "How many QC tools are covered in sub-topic 3.1?",
    options: [
      { id: "a", text: "7" },
      { id: "b", text: "5" },
      { id: "c", text: "6" },
      { id: "d", text: "8" },
    ],
    correctAnswer: "a",
    sourceSlide: 5,
  },

  /* --- Tool 1 — Check Sheet --- */
  {
    id: "q022",
    type: "single-choice",
    question: "A Check Sheet is a form used to collect data:",
    options: [
      { id: "a", text: "In real time, at the location where the data is generated" },
      { id: "b", text: "At the end of the month, from memory" },
      { id: "c", text: "Only in the quality office" },
      { id: "d", text: "Only after the part has been scrapped" },
    ],
    correctAnswer: "a",
    sourceSlide: 6,
  },
  {
    id: "q023",
    type: "single-choice",
    question: "A Check Sheet counts using:",
    options: [
      { id: "a", text: "Tally marks" },
      { id: "b", text: "Percentages only" },
      { id: "c", text: "A cumulative line" },
      { id: "d", text: "Control limits" },
    ],
    correctAnswer: "a",
    sourceSlide: 6,
  },

  /* --- Tool 2 — Histogram --- */
  {
    id: "q030",
    type: "single-choice",
    question: "A Histogram is a graphical representation of:",
    options: [
      { id: "a", text: "The distribution of numerical data" },
      { id: "b", text: "The steps of a process" },
      { id: "c", text: "The relationship between two variables" },
      { id: "d", text: "The families of possible causes" },
    ],
    correctAnswer: "a",
    sourceSlide: 7,
  },
  {
    id: "q216",
    type: "true-false",
    question: "A Histogram groups measurements into ranges called bins.",
    options: [
      { id: "t", text: "True" },
      { id: "f", text: "False" },
    ],
    correctAnswer: "t",
    sourceSlide: 7,
  },
  {
    id: "q034",
    type: "image-choice",
    question: "Which of the seven QC tools is shown in this chart?",
    image: "histogram-petal-length.png",
    imageAlt: "A bar chart with frequency on the vertical axis and a measurement grouped into ranges along the horizontal axis",
    options: [
      { id: "a", text: "Histogram" },
      { id: "b", text: "Pareto Chart" },
      { id: "c", text: "Control Chart" },
      { id: "d", text: "Scatter Diagram" },
    ],
    correctAnswer: "a",
    sourceSlide: 8,
  },

  /* --- Tool 3 — Pareto Chart --- */
  {
    id: "q041",
    type: "single-choice",
    question: "A Pareto Chart combines which two elements?",
    options: [
      { id: "a", text: "A bar graph and a cumulative line graph" },
      { id: "b", text: "A bar graph and a scatter plot" },
      { id: "c", text: "A line graph and a pie chart" },
      { id: "d", text: "A tally sheet and a flow chart" },
    ],
    correctAnswer: "a",
    sourceSlide: 11,
  },
  {
    id: "q043",
    type: "single-choice",
    question: "The Pareto principle described in the lecture says that about:",
    options: [
      { id: "a", text: "80% of problems come from 20% of causes" },
      { id: "b", text: "20% of problems come from 80% of causes" },
      { id: "c", text: "50% of problems come from 50% of causes" },
      { id: "d", text: "100% of problems come from 1 cause" },
    ],
    correctAnswer: "a",
    sourceSlide: 11,
  },
  {
    id: "q044",
    type: "single-choice",
    question: "What is the job of a Pareto Chart?",
    options: [
      { id: "a", text: "PRIORITY — deciding what to attack first" },
      { id: "b", text: "Showing the steps of a process" },
      { id: "c", text: "Proving that one variable causes another" },
      { id: "d", text: "Recording defects in real time at the machine" },
    ],
    correctAnswer: "a",
    sourceSlide: 11,
  },
  {
    id: "q046",
    type: "image-choice",
    question: "Identify the QC tool shown here.",
    image: "pareto-casting-defects.png",
    imageAlt: "A chart with bars in descending order and a rising cumulative percentage line, titled Pareto chart of titanium investment casting defects",
    options: [
      { id: "a", text: "Pareto Chart" },
      { id: "b", text: "Histogram" },
      { id: "c", text: "Control Chart" },
      { id: "d", text: "Scatter Diagram" },
    ],
    correctAnswer: "a",
    sourceSlide: 12,
  },

  /* --- Tool 4 — Cause & Effect (Fishbone) --- */
  {
    id: "q053",
    type: "single-choice",
    question: "The Cause & Effect diagram sorts possible causes into how many families?",
    options: [
      { id: "a", text: "Six — the 6M" },
      { id: "b", text: "Four" },
      { id: "c", text: "Seven" },
      { id: "d", text: "Five" },
    ],
    correctAnswer: "a",
    sourceSlide: 14,
  },
  {
    id: "q054",
    type: "single-choice",
    question: "Another name for the Cause & Effect diagram is:",
    options: [
      { id: "a", text: "Ishikawa diagram" },
      { id: "b", text: "Pareto diagram" },
      { id: "c", text: "Gantt diagram" },
      { id: "d", text: "Scatter diagram" },
    ],
    correctAnswer: "a",
    sourceSlide: 14,
  },
  {
    id: "q055",
    type: "single-choice",
    question: "On a Fishbone diagram, where do you write the problem?",
    options: [
      { id: "a", text: "At the fish head" },
      { id: "b", text: "At the fish tail" },
      { id: "c", text: "On the smallest bone" },
      { id: "d", text: "Below the horizontal axis" },
    ],
    correctAnswer: "a",
    sourceSlide: 14,
  },
  {
    id: "q224",
    type: "multiple-select",
    question: "Which of these are 6M families on the Fishbone diagram?",
    options: [
      { id: "a", text: "METHOD" },
      { id: "b", text: "MATERIAL" },
      { id: "c", text: "ENVIRONMENT" },
      { id: "d", text: "MAINTENANCE" },
    ],
    correctAnswer: ["a","b","c"],
    sourceSlide: 15,
  },
  {
    id: "q067",
    type: "image-choice",
    question: "Which of the seven QC tools is shown in this diagram?",
    image: "fishbone-diagram.jpg",
    imageAlt: "A diagram shaped like a fish skeleton, with angled bones each carrying a family of causes leading to an effect at the head",
    options: [
      { id: "a", text: "Cause & Effect (Fishbone)" },
      { id: "b", text: "Flow Chart" },
      { id: "c", text: "Pareto Chart" },
      { id: "d", text: "Histogram" },
    ],
    correctAnswer: "a",
    sourceSlide: 17,
  },

  /* --- Tool 5 — Control Chart --- */
  {
    id: "q068",
    type: "single-choice",
    question: "A Control Chart is a graph used to:",
    options: [
      { id: "a", text: "Monitor a process over time and check whether it is stable or out of control" },
      { id: "b", text: "Sort defects into descending order of frequency" },
      { id: "c", text: "Group measurements into bins" },
      { id: "d", text: "Sort causes into six families" },
    ],
    correctAnswer: "a",
    sourceSlide: 19,
  },
  {
    id: "q072",
    type: "single-choice",
    question: "On a Control Chart, a point outside the limits means you should:",
    options: [
      { id: "a", text: "Investigate" },
      { id: "b", text: "Ignore it as normal variation" },
      { id: "c", text: "Scrap the whole batch immediately" },
      { id: "d", text: "Redraw the chart with wider limits" },
    ],
    correctAnswer: "a",
    sourceSlide: 19,
  },
  {
    id: "q217",
    type: "multiple-select",
    question: "Which of these are the three lines on a Control Chart?",
    options: [
      { id: "a", text: "CL" },
      { id: "b", text: "UCL" },
      { id: "c", text: "LCL" },
      { id: "d", text: "PDCA" },
    ],
    correctAnswer: ["a","b","c"],
    sourceSlide: 19,
  },
  {
    id: "q078",
    type: "image-choice",
    question: "Name the QC tool shown in this chart.",
    image: "control-chart-xbar.png",
    imageAlt: "A chart plotting sample values over time with a centre line and upper and lower limit lines",
    options: [
      { id: "a", text: "Control Chart" },
      { id: "b", text: "Histogram" },
      { id: "c", text: "Pareto Chart" },
      { id: "d", text: "Check Sheet" },
    ],
    correctAnswer: "a",
    sourceSlide: 20,
  },

  /* --- Tool 6 — Scatter Diagram --- */
  {
    id: "q079",
    type: "single-choice",
    question: "A Scatter Diagram displays values for how many variables?",
    options: [
      { id: "a", text: "Two" },
      { id: "b", text: "One" },
      { id: "c", text: "Six" },
      { id: "d", text: "Seven" },
    ],
    correctAnswer: "a",
    sourceSlide: 21,
  },
  {
    id: "q082",
    type: "true-false",
    question: "According to the lecture, a link shown on a Scatter Diagram is proof of cause.",
    options: [
      { id: "t", text: "True" },
      { id: "f", text: "False" },
    ],
    correctAnswer: "f",
    sourceSlide: 21,
  },

  /* --- Tool 7 — Graph & Flow Chart --- */
  {
    id: "q084",
    type: "single-choice",
    question: "In a Flow Chart, which symbol means Start / End?",
    options: [
      { id: "a", text: "Oval" },
      { id: "b", text: "Rectangle" },
      { id: "c", text: "Diamond" },
      { id: "d", text: "Parallelogram" },
    ],
    correctAnswer: "a",
    sourceSlide: 22,
  },
  {
    id: "q090",
    type: "single-choice",
    question: "What does a Flow Chart reveal?",
    options: [
      { id: "a", text: "Extra steps and where defects enter" },
      { id: "b", text: "The spread of measurements" },
      { id: "c", text: "Whether two variables are linked" },
      { id: "d", text: "The process average and its limits" },
    ],
    correctAnswer: "a",
    sourceSlide: 22,
  },
  {
    id: "q218",
    type: "multiple-select",
    question: "Which of these are Flow Chart symbols named in the lecture?",
    options: [
      { id: "a", text: "Oval" },
      { id: "b", text: "Rectangle" },
      { id: "c", text: "Diamond" },
      { id: "d", text: "Fishbone" },
    ],
    correctAnswer: ["a","b","c"],
    sourceSlide: 22,
  },

  /* ==========================================================
     3.2 — PDCA CYCLE
     ========================================================== */
  {
    id: "q092",
    type: "single-choice",
    question: "What does PDCA stand for?",
    options: [
      { id: "a", text: "Plan – Do – Check – Act" },
      { id: "b", text: "Prepare – Deliver – Control – Audit" },
      { id: "c", text: "Plan – Develop – Correct – Approve" },
      { id: "d", text: "Predict – Detect – Contain – Analyse" },
    ],
    correctAnswer: "a",
    sourceSlide: 23,
  },
  {
    id: "q094",
    type: "single-choice",
    question: "In PDCA, what happens in the PLAN step?",
    options: [
      { id: "a", text: "Find the problem and plan a solution" },
      { id: "b", text: "Try it small — one machine, one shift" },
      { id: "c", text: "Measure and compare new data with old" },
      { id: "d", text: "Make it the standard" },
    ],
    correctAnswer: "a",
    sourceSlide: 24,
  },
  {
    id: "q096",
    type: "single-choice",
    question: "In PDCA, what happens in the CHECK step?",
    options: [
      { id: "a", text: "Measure. Compare new data with old." },
      { id: "b", text: "Try it small — one machine, one shift." },
      { id: "c", text: "Find the problem and plan a solution." },
      { id: "d", text: "Update the SOP and brief all shifts." },
    ],
    correctAnswer: "a",
    sourceSlide: 24,
  },
  {
    id: "q097",
    type: "single-choice",
    question: "In PDCA, what happens in the ACT step?",
    options: [
      { id: "a", text: "If it worked, make it the standard" },
      { id: "b", text: "Find the problem and plan a solution" },
      { id: "c", text: "Try it small on one machine" },
      { id: "d", text: "Quarantine the affected parts" },
    ],
    correctAnswer: "a",
    sourceSlide: 24,
  },
  {
    id: "q099",
    type: "sequence-choice",
    question: "Which sequence is the correct PDCA Cycle?",
    options: [
      { id: "a", text: "PLAN → DO → CHECK → ACT" },
      { id: "b", text: "PLAN → CHECK → DO → ACT" },
      { id: "c", text: "DO → PLAN → ACT → CHECK" },
      { id: "d", text: "ACT → CHECK → DO → PLAN" },
    ],
    correctAnswer: "a",
    sourceSlide: 24,
  },
  {
    id: "q102",
    type: "true-false",
    question: "The lecture describes PDCA as a circle that you never stop going round.",
    options: [
      { id: "t", text: "True" },
      { id: "f", text: "False" },
    ],
    correctAnswer: "t",
    sourceSlide: 24,
  },

  /* ==========================================================
     3.3 — 4W1H PROBLEM ANALYSIS
     ========================================================== */
  {
    id: "q109",
    type: "single-choice",
    question: "The 4W1H analysis is made up of which five questions?",
    options: [
      { id: "a", text: "What, Where, When, Who, How" },
      { id: "b", text: "What, Where, When, Why, How" },
      { id: "c", text: "Who, Why, Where, When, How" },
      { id: "d", text: "Plan, Do, Check, Act, Verify" },
    ],
    correctAnswer: "a",
    sourceSlide: 27,
  },
  {
    id: "q110",
    type: "single-choice",
    question: "Which extra question turns 4W1H into the classic 5W1H?",
    options: [
      { id: "a", text: "WHY" },
      { id: "b", text: "WHICH" },
      { id: "c", text: "WHOSE" },
      { id: "d", text: "HOW MUCH" },
    ],
    correctAnswer: "a",
    sourceSlide: 27,
  },
  {
    id: "q111",
    type: "single-choice",
    question: "In 4W1H, the WHO question asks about:",
    options: [
      { id: "a", text: "The role — not blame" },
      { id: "b", text: "Which operator should be punished" },
      { id: "c", text: "Who will pay for the scrap" },
      { id: "d", text: "Who owns the machine" },
    ],
    correctAnswer: "a",
    sourceSlide: 27,
  },
  {
    id: "q116",
    type: "true-false",
    question: "The lecture says you should not start fixing a problem until you can answer all five 4W1H questions.",
    options: [
      { id: "t", text: "True" },
      { id: "f", text: "False" },
    ],
    correctAnswer: "t",
    sourceSlide: 27,
  },

  /* ==========================================================
     3.4 — CORRECTIVE AND PREVENTIVE ACTION
     ========================================================== */

  /* --- Corrective vs Preventive --- */
  {
    id: "q123",
    type: "single-choice",
    question: "Corrective Action deals with a problem that:",
    options: [
      { id: "a", text: "HAS already happened" },
      { id: "b", text: "Has NOT happened yet" },
      { id: "c", text: "Will never happen" },
      { id: "d", text: "Only affects the customer" },
    ],
    correctAnswer: "a",
    sourceSlide: 30,
  },
  {
    id: "q124",
    type: "single-choice",
    question: "Preventive Action deals with a problem that:",
    options: [
      { id: "a", text: "Has NOT happened yet" },
      { id: "b", text: "HAS already happened" },
      { id: "c", text: "Was found by the customer" },
      { id: "d", text: "Was already repaired" },
    ],
    correctAnswer: "a",
    sourceSlide: 30,
  },
  {
    id: "q125",
    type: "single-choice",
    question: "According to the lecture, repairing the part is only:",
    options: [
      { id: "a", text: "Correction" },
      { id: "b", text: "Corrective action" },
      { id: "c", text: "Preventive action" },
      { id: "d", text: "Standardisation" },
    ],
    correctAnswer: "a",
    sourceSlide: 30,
  },
  {
    id: "q126",
    type: "single-choice",
    question: "What triggers a Preventive Action?",
    options: [
      { id: "a", text: "Trends or control-chart drift" },
      { id: "b", text: "A customer complaint" },
      { id: "c", text: "A scrapped part" },
      { id: "d", text: "A completed repair" },
    ],
    correctAnswer: "a",
    sourceSlide: 30,
  },

  /* --- The CAPA process --- */
  {
    id: "q132",
    type: "single-choice",
    question: "How many steps are in the CAPA Process taught in this chapter?",
    options: [
      { id: "a", text: "7" },
      { id: "b", text: "4" },
      { id: "c", text: "5" },
      { id: "d", text: "6" },
    ],
    correctAnswer: "a",
    sourceSlide: 31,
  },
  {
    id: "q134",
    type: "single-choice",
    question: "In the CAPA Process, what does the Contain step mean?",
    options: [
      { id: "a", text: "Quarantine affected parts now" },
      { id: "b", text: "Change the SOP and retrain" },
      { id: "c", text: "Update documents and brief all shifts" },
      { id: "d", text: "Decide the action, owner and date" },
    ],
    correctAnswer: "a",
    sourceSlide: 31,
  },
  {
    id: "q139",
    type: "single-choice",
    question: "What is the final step of the CAPA Process?",
    options: [
      { id: "a", text: "Standardise — update documents, brief all shifts" },
      { id: "b", text: "Verify — prove with data that it stopped" },
      { id: "c", text: "Implement — change the SOP" },
      { id: "d", text: "Contain — quarantine affected parts" },
    ],
    correctAnswer: "a",
    sourceSlide: 31,
  },
  {
    id: "q140",
    type: "sequence-choice",
    question: "Which sequence matches the first four steps of the CAPA Process?",
    options: [
      { id: "a", text: "Identify → Contain → Analyse → Plan" },
      { id: "b", text: "Contain → Identify → Plan → Analyse" },
      { id: "c", text: "Analyse → Identify → Contain → Plan" },
      { id: "d", text: "Identify → Analyse → Contain → Plan" },
    ],
    correctAnswer: "a",
    sourceSlide: 31,
  },

  /* --- The 5 Whys --- */
  {
    id: "q145",
    type: "single-choice",
    question: "In the 5 Whys, how long do you keep asking \"why?\"",
    options: [
      { id: "a", text: "Until the answer is a process" },
      { id: "b", text: "Until an operator is named" },
      { id: "c", text: "Until exactly three answers are found" },
      { id: "d", text: "Until the part is repaired" },
    ],
    correctAnswer: "a",
    sourceSlide: 32,
  },

  /* ==========================================================
     3.5 — LEAN MANUFACTURING
     ========================================================== */
  {
    id: "q153",
    type: "single-choice",
    question: "Lean means doing the job with LESS time, material, effort and space — and with quality that is:",
    options: [
      { id: "a", text: "The same or better" },
      { id: "b", text: "Slightly lower" },
      { id: "c", text: "Not measured" },
      { id: "d", text: "Decided by the customer" },
    ],
    correctAnswer: "a",
    sourceSlide: 34,
  },
  {
    id: "q154",
    type: "single-choice",
    question: "In Lean, what is VALUE?",
    options: [
      { id: "a", text: "What the customer pays for" },
      { id: "b", text: "What the customer would not pay for" },
      { id: "c", text: "Work moving without stopping" },
      { id: "d", text: "Making only what is needed" },
    ],
    correctAnswer: "a",
    sourceSlide: 34,
  },
  {
    id: "q155",
    type: "single-choice",
    question: "In Lean, what is WASTE?",
    options: [
      { id: "a", text: "What the customer would not pay for" },
      { id: "b", text: "What the customer pays for" },
      { id: "c", text: "Work moving without stopping" },
      { id: "d", text: "Making only what is needed" },
    ],
    correctAnswer: "a",
    sourceSlide: 34,
  },
  {
    id: "q158",
    type: "true-false",
    question: "According to the lecture, Lean means working faster.",
    options: [
      { id: "t", text: "True" },
      { id: "f", text: "False" },
    ],
    correctAnswer: "f",
    sourceSlide: 34,
  },
  {
    id: "q177",
    type: "multiple-select",
    question: "Which of these are wastes in the DOWNTIME model?",
    options: [
      { id: "a", text: "Waiting" },
      { id: "b", text: "Inventory" },
      { id: "c", text: "Motion" },
      { id: "d", text: "Measurement" },
    ],
    correctAnswer: ["a","b","c"],
    sourceSlide: 36,
  },
  {
    id: "q178",
    type: "single-choice",
    question: "Kaizen is Japanese for:",
    options: [
      { id: "a", text: "Change for the better" },
      { id: "b", text: "A place for everything" },
      { id: "c", text: "Zero defects" },
      { id: "d", text: "Make only what is needed" },
    ],
    correctAnswer: "a",
    sourceSlide: 37,
  },
  {
    id: "q190",
    type: "sequence-choice",
    question: "Which sequence is the correct order of 5S?",
    options: [
      { id: "a", text: "SORT → SET IN ORDER → SHINE → STANDARDISE → SUSTAIN" },
      { id: "b", text: "SHINE → SORT → SET IN ORDER → SUSTAIN → STANDARDISE" },
      { id: "c", text: "SORT → SHINE → SET IN ORDER → SUSTAIN → STANDARDISE" },
      { id: "d", text: "SET IN ORDER → SORT → STANDARDISE → SHINE → SUSTAIN" },
    ],
    correctAnswer: "a",
    sourceSlide: 38,
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
