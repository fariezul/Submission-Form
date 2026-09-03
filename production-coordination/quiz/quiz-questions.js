/* ============================================================
   quiz-questions.js — THE QUESTION BANK
   ============================================================
   Every question here was written from ONE source only:

     Chapter3_Corrective_Action_Process_ .pptx
     "Corrective Action and Process Improvement"
     56 slides · revised 3 September 2026

   ------------------------------------------------------------
   SCOPE: SLIDES 1-36 ONLY
   ------------------------------------------------------------
   Slide 37 and everything after it is deliberately out of scope,
   at the lecturer's instruction. So there is nothing here on the
   8 Wastes / DOWNTIME, Kaizen, 5S, the closing summary or the
   assignment — even though those slides exist in the deck.

   If you later widen the scope, that is where the next questions
   come from, and 3.5 Lean is the section that would benefit most:
   it currently has only five questions because the cut-off falls
   right after the Lean definition.

   Nothing was added from the internet, a textbook, or general
   knowledge. If a fact is not on slides 1-36, there is no
   question about it.

   ------------------------------------------------------------
   WHAT THIS REPLACED
   ------------------------------------------------------------
   The previous bank was 50 questions built from the earlier
   42-slide deck. The deck was revised, so the bank was rebuilt
   rather than patched. Three changes in scope mattered:

     Slide 11  Pareto is now "combines a bar graph and a
               cumulative line graph".
     Slide 23  A new Flow Chart definition slide.
     Slide 24  A new symbol table, which adds ARROW — the old
               four-symbol list did not have it.
     Slide 36  Lean is now "a systematic approach to eliminating
               waste and increasing value", with a Goal line. The
               old FLOW and PULL bullets are gone, so the two
               questions testing them were dropped rather than
               carried over.

   The old bank is in git history if any question is ever wanted
   back.

   ------------------------------------------------------------
   HOW TO READ A QUESTION OBJECT
   ------------------------------------------------------------
     id            never reuse an id, even after editing — old
                   rows in quiz_attempts still refer to them
     type          single-choice | true-false | multiple-select
                   | image-choice | sequence-choice
     question      the words the student reads
     options       [{ id, text }] — id is stable, text is shown
     correctAnswer option id, or an ARRAY of ids for
                   multiple-select
     image         optional file inside ../quiz-images/
     imageAlt      required whenever image is set
     sourceSlide   DEVELOPER ONLY — the slide in the revised deck
                   that proves the answer. Never shown to
                   students; it is here so the lecturer can
                   re-check a question against the teaching
                   material.

   ------------------------------------------------------------
   THE FIRST OPTION IS ALWAYS THE CORRECT ONE
   ------------------------------------------------------------
   That makes the bank quick to proofread. Students never see
   this order: the engine shuffles the options on every question
   of every attempt, and the correct answer is tracked by a
   stable option id, never by position. See quiz-engine.js ->
   shuffleOptions().

   ------------------------------------------------------------
   IF YOU REMOVE QUESTIONS
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

  /* --- Overview (slide 5) --- */
  {
    id: "v001",
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
  {
    id: "v002",
    type: "single-choice",
    question: "Which QC tool is used to collect the data?",
    options: [
      { id: "a", text: "Check Sheet" },
      { id: "b", text: "Pareto Chart" },
      { id: "c", text: "Control Chart" },
      { id: "d", text: "Scatter Diagram" },
    ],
    correctAnswer: "a",
    sourceSlide: 5,
  },
  {
    id: "v003",
    type: "single-choice",
    question: "Which QC tool is used to find the root cause?",
    options: [
      { id: "a", text: "Cause & Effect" },
      { id: "b", text: "Histogram" },
      { id: "c", text: "Graph / Flow Chart" },
      { id: "d", text: "Check Sheet" },
    ],
    correctAnswer: "a",
    sourceSlide: 5,
  },
  {
    id: "v004",
    type: "single-choice",
    question: "Which QC tool is used to test a relationship?",
    options: [
      { id: "a", text: "Scatter Diagram" },
      { id: "b", text: "Check Sheet" },
      { id: "c", text: "Pareto Chart" },
      { id: "d", text: "Cause & Effect" },
    ],
    correctAnswer: "a",
    sourceSlide: 5,
  },
  {
    id: "v005",
    type: "sequence-choice",
    question: "Which sequence matches the lecture's numbering of tools 1 to 4?",
    options: [
      { id: "a", text: "Check Sheet → Histogram → Pareto Chart → Cause & Effect" },
      { id: "b", text: "Histogram → Check Sheet → Cause & Effect → Pareto Chart" },
      { id: "c", text: "Pareto Chart → Check Sheet → Histogram → Control Chart" },
      { id: "d", text: "Cause & Effect → Pareto Chart → Histogram → Check Sheet" },
    ],
    correctAnswer: "a",
    sourceSlide: 5,
  },

  /* --- Tool 1 · Check Sheet (slide 6) --- */
  {
    id: "v006",
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
    id: "v007",
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
  {
    id: "v008",
    type: "true-false",
    question: "A Check Sheet should be filled in as it happens, not from memory.",
    options: [
      { id: "t", text: "True" },
      { id: "f", text: "False" },
    ],
    correctAnswer: "t",
    sourceSlide: 6,
  },

  /* --- Tool 2 · Histogram (slides 7–8) --- */
  {
    id: "v009",
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
    id: "v010",
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
    id: "v011",
    type: "single-choice",
    question: "On a Histogram, what does a tall centre with short tails indicate?",
    options: [
      { id: "a", text: "A healthy process" },
      { id: "b", text: "A process that is out of control" },
      { id: "c", text: "A negative link between two variables" },
      { id: "d", text: "That 80% of problems come from 20% of causes" },
    ],
    correctAnswer: "a",
    sourceSlide: 7,
  },
  {
    id: "v012",
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

  /* --- Tool 3 · Pareto Chart (slides 11–12) --- */
  {
    id: "v013",
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
    id: "v014",
    type: "single-choice",
    question: "On a Pareto Chart, the bars are arranged:",
    options: [
      { id: "a", text: "In descending order" },
      { id: "b", text: "In ascending order" },
      { id: "c", text: "In alphabetical order" },
      { id: "d", text: "In the order the defects were found" },
    ],
    correctAnswer: "a",
    sourceSlide: 11,
  },
  {
    id: "v015",
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
    id: "v016",
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
    id: "v017",
    type: "image-choice",
    question: "Identify the QC tool shown here.",
    image: "pareto-casting-defects.png",
    imageAlt: "A chart with bars in descending order and a rising cumulative percentage line",
    options: [
      { id: "a", text: "Pareto Chart" },
      { id: "b", text: "Histogram" },
      { id: "c", text: "Control Chart" },
      { id: "d", text: "Scatter Diagram" },
    ],
    correctAnswer: "a",
    sourceSlide: 12,
  },

  /* --- Tool 4 · Cause & Effect (slides 14–17) --- */
  {
    id: "v018",
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
    id: "v019",
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
    id: "v020",
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
    id: "v021",
    type: "single-choice",
    question: "On a Fishbone diagram, what do the smaller arrows do?",
    options: [
      { id: "a", text: "Connect the sub-causes to the major causes" },
      { id: "b", text: "Show the cumulative percentage" },
      { id: "c", text: "Mark the upper and lower control limits" },
      { id: "d", text: "Show the direction of material flow" },
    ],
    correctAnswer: "a",
    sourceSlide: 14,
  },
  {
    id: "v022",
    type: "multiple-select",
    question: "Which of these are 6M families on the Fishbone diagram?",
    options: [
      { id: "a", text: "METHOD" },
      { id: "b", text: "MATERIAL" },
      { id: "c", text: "ENVIRONMENT" },
      { id: "d", text: "MAINTENANCE" },
    ],
    correctAnswer: ["a", "b", "c"],
    sourceSlide: 15,
  },
  {
    id: "v023",
    type: "single-choice",
    question: "\"Faulty gauge, no calibration record\" belongs to which 6M family?",
    options: [
      { id: "a", text: "MEASUREMENT" },
      { id: "b", text: "MACHINE" },
      { id: "c", text: "METHOD" },
      { id: "d", text: "MAN" },
    ],
    correctAnswer: "a",
    sourceSlide: 15,
  },
  {
    id: "v024",
    type: "single-choice",
    question: "\"Humidity, dust, poor lighting\" belongs to which 6M family?",
    options: [
      { id: "a", text: "ENVIRONMENT" },
      { id: "b", text: "MATERIAL" },
      { id: "c", text: "MEASUREMENT" },
      { id: "d", text: "MACHINE" },
    ],
    correctAnswer: "a",
    sourceSlide: 15,
  },
  {
    id: "v025",
    type: "sequence-choice",
    question: "Which sequence describes how to build a Fishbone diagram?",
    options: [
      { id: "a", text: "Problem at the head → 6M bones → causes on each bone → verify with data" },
      { id: "b", text: "Causes on each bone → problem at the head → verify with data → 6M bones" },
      { id: "c", text: "Verify with data → problem at the head → causes on each bone → 6M bones" },
      { id: "d", text: "6M bones → verify with data → problem at the head → causes on each bone" },
    ],
    correctAnswer: "a",
    sourceSlide: 16,
  },
  {
    id: "v026",
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

  /* --- Tool 5 · Control Chart (slides 19–20) --- */
  {
    id: "v027",
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
    id: "v028",
    type: "single-choice",
    question: "On a Control Chart, what is CL?",
    options: [
      { id: "a", text: "The process average" },
      { id: "b", text: "The highest limit" },
      { id: "c", text: "The lowest limit" },
      { id: "d", text: "The cumulative line" },
    ],
    correctAnswer: "a",
    sourceSlide: 19,
  },
  {
    id: "v029",
    type: "true-false",
    question: "On a Control Chart, UCL is the lowest limit.",
    options: [
      { id: "t", text: "True" },
      { id: "f", text: "False" },
    ],
    correctAnswer: "f",
    sourceSlide: 19,
  },
  {
    id: "v030",
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
    id: "v031",
    type: "multiple-select",
    question: "Which of these are the three lines on a Control Chart?",
    options: [
      { id: "a", text: "CL" },
      { id: "b", text: "UCL" },
      { id: "c", text: "LCL" },
      { id: "d", text: "PDCA" },
    ],
    correctAnswer: ["a", "b", "c"],
    sourceSlide: 19,
  },
  {
    id: "v032",
    type: "multiple-select",
    question: "According to the lecture, why is a Control Chart important? Select all that apply.",
    options: [
      { id: "a", text: "Detect problems early" },
      { id: "b", text: "Reduce defects" },
      { id: "c", text: "Monitor process variation" },
      { id: "d", text: "Set the selling price of the part" },
    ],
    correctAnswer: ["a", "b", "c"],
    sourceSlide: 20,
  },
  {
    id: "v033",
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

  /* --- Tool 6 · Scatter Diagram (slide 21) --- */
  {
    id: "v034",
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
    id: "v035",
    type: "single-choice",
    question: "On a Scatter Diagram, points sloping down indicate:",
    options: [
      { id: "a", text: "A negative link" },
      { id: "b", text: "A positive link" },
      { id: "c", text: "No link" },
      { id: "d", text: "An out-of-control process" },
    ],
    correctAnswer: "a",
    sourceSlide: 21,
  },
  {
    id: "v036",
    type: "true-false",
    question: "According to the lecture, a link shown on a Scatter Diagram is proof of cause.",
    options: [
      { id: "t", text: "True" },
      { id: "f", text: "False" },
    ],
    correctAnswer: "f",
    sourceSlide: 21,
  },

  /* --- Tool 7 · Graph & Flow Chart (slides 22–24) --- */
  {
    id: "v037",
    type: "single-choice",
    question: "The lecture says a Graph should always:",
    options: [
      { id: "a", text: "Label the axes and state the units" },
      { id: "b", text: "Use six families of causes" },
      { id: "c", text: "Include a cumulative percentage line" },
      { id: "d", text: "Be drawn only by the quality department" },
    ],
    correctAnswer: "a",
    sourceSlide: 22,
  },
  {
    id: "v038",
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
    id: "v039",
    type: "single-choice",
    question: "A Flow Chart is a diagram that shows:",
    options: [
      { id: "a", text: "The step-by-step flow of a process" },
      { id: "b", text: "The distribution of numerical data" },
      { id: "c", text: "Six families of possible causes" },
      { id: "d", text: "The relationship between two variables" },
    ],
    correctAnswer: "a",
    sourceSlide: 23,
  },
  {
    id: "v040",
    type: "single-choice",
    question: "In a Flow Chart, which symbol represents the start or end of a process?",
    options: [
      { id: "a", text: "Oval" },
      { id: "b", text: "Rectangle" },
      { id: "c", text: "Diamond" },
      { id: "d", text: "Parallelogram" },
    ],
    correctAnswer: "a",
    sourceSlide: 24,
  },
  {
    id: "v041",
    type: "single-choice",
    question: "In a Flow Chart, which symbol denotes a process or operation step?",
    options: [
      { id: "a", text: "Rectangle" },
      { id: "b", text: "Oval" },
      { id: "c", text: "Diamond" },
      { id: "d", text: "Arrow" },
    ],
    correctAnswer: "a",
    sourceSlide: 24,
  },
  {
    id: "v042",
    type: "single-choice",
    question: "In a Flow Chart, which symbol signifies a point requiring a yes / no?",
    options: [
      { id: "a", text: "Diamond" },
      { id: "b", text: "Rectangle" },
      { id: "c", text: "Oval" },
      { id: "d", text: "Parallelogram" },
    ],
    correctAnswer: "a",
    sourceSlide: 24,
  },
  {
    id: "v043",
    type: "single-choice",
    question: "In a Flow Chart, which symbol indicates the flow between steps?",
    options: [
      { id: "a", text: "Arrow" },
      { id: "b", text: "Oval" },
      { id: "c", text: "Diamond" },
      { id: "d", text: "Rectangle" },
    ],
    correctAnswer: "a",
    sourceSlide: 24,
  },
  {
    id: "v044",
    type: "single-choice",
    question: "In a Flow Chart, which symbol is used for input or output operations?",
    options: [
      { id: "a", text: "Parallelogram" },
      { id: "b", text: "Diamond" },
      { id: "c", text: "Oval" },
      { id: "d", text: "Arrow" },
    ],
    correctAnswer: "a",
    sourceSlide: 24,
  },
  {
    id: "v045",
    type: "image-choice",
    question: "In this table of Flow Chart symbols, which symbol means a decision point?",
    image: "flowchart-symbols.png",
    imageAlt: "A table of flow chart symbols listing Oval, Rectangle, Arrow, Diamond and Parallelogram with the function of each",
    options: [
      { id: "a", text: "Diamond" },
      { id: "b", text: "Oval" },
      { id: "c", text: "Rectangle" },
      { id: "d", text: "Parallelogram" },
    ],
    correctAnswer: "a",
    sourceSlide: 24,
  },
  {
    id: "v046",
    type: "multiple-select",
    question: "Which of these are Flow Chart symbols named in the lecture?",
    options: [
      { id: "a", text: "Oval" },
      { id: "b", text: "Diamond" },
      { id: "c", text: "Parallelogram" },
      { id: "d", text: "Fishbone" },
    ],
    correctAnswer: ["a", "b", "c"],
    sourceSlide: 24,
  },

  /* ==========================================================
     3.2 — PDCA CYCLE  (slides 25–27)
     ========================================================== */
  {
    id: "v047",
    type: "single-choice",
    question: "What does PDCA stand for?",
    options: [
      { id: "a", text: "Plan – Do – Check – Act" },
      { id: "b", text: "Prepare – Deliver – Control – Audit" },
      { id: "c", text: "Plan – Develop – Correct – Approve" },
      { id: "d", text: "Predict – Detect – Contain – Analyse" },
    ],
    correctAnswer: "a",
    sourceSlide: 25,
  },
  {
    id: "v048",
    type: "single-choice",
    question: "In PDCA, what happens in the PLAN step?",
    options: [
      { id: "a", text: "Find the problem and plan a solution" },
      { id: "b", text: "Try it small — one machine, one shift" },
      { id: "c", text: "Measure and compare new data with old" },
      { id: "d", text: "Make it the standard" },
    ],
    correctAnswer: "a",
    sourceSlide: 26,
  },
  {
    id: "v049",
    type: "single-choice",
    question: "In PDCA, what happens in the CHECK step?",
    options: [
      { id: "a", text: "Measure. Compare new data with old." },
      { id: "b", text: "Try it small — one machine, one shift." },
      { id: "c", text: "Find the problem and plan a solution." },
      { id: "d", text: "Update the SOP and brief all shifts." },
    ],
    correctAnswer: "a",
    sourceSlide: 26,
  },
  {
    id: "v050",
    type: "single-choice",
    question: "In PDCA, what happens in the ACT step?",
    options: [
      { id: "a", text: "If it worked, make it the standard" },
      { id: "b", text: "Find the problem and plan a solution" },
      { id: "c", text: "Try it small on one machine" },
      { id: "d", text: "Quarantine the affected parts" },
    ],
    correctAnswer: "a",
    sourceSlide: 26,
  },
  {
    id: "v051",
    type: "sequence-choice",
    question: "Which sequence is the correct PDCA Cycle?",
    options: [
      { id: "a", text: "PLAN → DO → CHECK → ACT" },
      { id: "b", text: "PLAN → CHECK → DO → ACT" },
      { id: "c", text: "DO → PLAN → ACT → CHECK" },
      { id: "d", text: "ACT → CHECK → DO → PLAN" },
    ],
    correctAnswer: "a",
    sourceSlide: 26,
  },
  {
    id: "v052",
    type: "true-false",
    question: "The lecture describes PDCA as a circle that you never stop going round.",
    options: [
      { id: "t", text: "True" },
      { id: "f", text: "False" },
    ],
    correctAnswer: "t",
    sourceSlide: 26,
  },
  {
    id: "v053",
    type: "true-false",
    question: "The lecture says the QC tools are used INSIDE the PDCA cycle.",
    options: [
      { id: "t", text: "True" },
      { id: "f", text: "False" },
    ],
    correctAnswer: "t",
    sourceSlide: 27,
  },

  /* ==========================================================
     3.3 — 4W1H PROBLEM ANALYSIS  (slides 28–30)
     ========================================================== */
  {
    id: "v054",
    type: "single-choice",
    question: "The 4W1H analysis is made up of which five questions?",
    options: [
      { id: "a", text: "What, Where, When, Who, How" },
      { id: "b", text: "What, Where, When, Why, How" },
      { id: "c", text: "Who, Why, Where, When, How" },
      { id: "d", text: "Plan, Do, Check, Act, Verify" },
    ],
    correctAnswer: "a",
    sourceSlide: 29,
  },
  {
    id: "v055",
    type: "single-choice",
    question: "Which extra question turns 4W1H into the classic 5W1H?",
    options: [
      { id: "a", text: "WHY" },
      { id: "b", text: "WHICH" },
      { id: "c", text: "WHOSE" },
      { id: "d", text: "HOW MUCH" },
    ],
    correctAnswer: "a",
    sourceSlide: 29,
  },
  {
    id: "v056",
    type: "single-choice",
    question: "In 4W1H, the WHO question asks about:",
    options: [
      { id: "a", text: "The role — not blame" },
      { id: "b", text: "Which operator should be punished" },
      { id: "c", text: "Who will pay for the scrap" },
      { id: "d", text: "Who owns the machine" },
    ],
    correctAnswer: "a",
    sourceSlide: 29,
  },
  {
    id: "v057",
    type: "single-choice",
    question: "In 4W1H, the HOW question asks:",
    options: [
      { id: "a", text: "How does it happen, and how often?" },
      { id: "b", text: "How much will the repair cost?" },
      { id: "c", text: "How many operators are on shift?" },
      { id: "d", text: "How the customer will be told?" },
    ],
    correctAnswer: "a",
    sourceSlide: 29,
  },
  {
    id: "v058",
    type: "true-false",
    question: "The lecture says you should not start fixing a problem until you can answer all five 4W1H questions.",
    options: [
      { id: "t", text: "True" },
      { id: "f", text: "False" },
    ],
    correctAnswer: "t",
    sourceSlide: 29,
  },
  {
    id: "v059",
    type: "multiple-select",
    question: "Which of these are among the FIVE questions of 4W1H?",
    options: [
      { id: "a", text: "WHAT" },
      { id: "b", text: "WHERE" },
      { id: "c", text: "WHO" },
      { id: "d", text: "WHY" },
    ],
    correctAnswer: ["a", "b", "c"],
    sourceSlide: 29,
  },

  /* ==========================================================
     3.4 — CORRECTIVE AND PREVENTIVE ACTION  (slides 31–34)
     ========================================================== */
  {
    id: "v060",
    type: "single-choice",
    question: "Corrective Action deals with a problem that:",
    options: [
      { id: "a", text: "HAS already happened" },
      { id: "b", text: "Has NOT happened yet" },
      { id: "c", text: "Will never happen" },
      { id: "d", text: "Only affects the customer" },
    ],
    correctAnswer: "a",
    sourceSlide: 32,
  },
  {
    id: "v061",
    type: "single-choice",
    question: "Preventive Action deals with a problem that:",
    options: [
      { id: "a", text: "Has NOT happened yet" },
      { id: "b", text: "HAS already happened" },
      { id: "c", text: "Was found by the customer" },
      { id: "d", text: "Was already repaired" },
    ],
    correctAnswer: "a",
    sourceSlide: 32,
  },
  {
    id: "v062",
    type: "single-choice",
    question: "According to the lecture, repairing the part is only:",
    options: [
      { id: "a", text: "Correction" },
      { id: "b", text: "Corrective action" },
      { id: "c", text: "Preventive action" },
      { id: "d", text: "Standardisation" },
    ],
    correctAnswer: "a",
    sourceSlide: 32,
  },
  {
    id: "v063",
    type: "single-choice",
    question: "What triggers a Preventive Action?",
    options: [
      { id: "a", text: "Trends or control-chart drift" },
      { id: "b", text: "A customer complaint" },
      { id: "c", text: "A scrapped part" },
      { id: "d", text: "A completed repair" },
    ],
    correctAnswer: "a",
    sourceSlide: 32,
  },
  {
    id: "v064",
    type: "true-false",
    question: "Corrective Action is taken before a defect has happened.",
    options: [
      { id: "t", text: "True" },
      { id: "f", text: "False" },
    ],
    correctAnswer: "f",
    sourceSlide: 32,
  },
  {
    id: "v065",
    type: "single-choice",
    question: "How many steps are in the CAPA Process taught in this chapter?",
    options: [
      { id: "a", text: "7" },
      { id: "b", text: "4" },
      { id: "c", text: "5" },
      { id: "d", text: "6" },
    ],
    correctAnswer: "a",
    sourceSlide: 33,
  },
  {
    id: "v066",
    type: "single-choice",
    question: "In the CAPA Process, what does the Contain step mean?",
    options: [
      { id: "a", text: "Quarantine affected parts now" },
      { id: "b", text: "Change the SOP and retrain" },
      { id: "c", text: "Update documents and brief all shifts" },
      { id: "d", text: "Decide the action, owner and date" },
    ],
    correctAnswer: "a",
    sourceSlide: 33,
  },
  {
    id: "v067",
    type: "single-choice",
    question: "What is the final step of the CAPA Process?",
    options: [
      { id: "a", text: "Standardise — update documents, brief all shifts" },
      { id: "b", text: "Verify — prove with data that it stopped" },
      { id: "c", text: "Implement — change the SOP" },
      { id: "d", text: "Contain — quarantine affected parts" },
    ],
    correctAnswer: "a",
    sourceSlide: 33,
  },
  {
    id: "v068",
    type: "sequence-choice",
    question: "Which sequence matches the first four steps of the CAPA Process?",
    options: [
      { id: "a", text: "Identify → Contain → Analyse → Plan" },
      { id: "b", text: "Contain → Identify → Plan → Analyse" },
      { id: "c", text: "Analyse → Identify → Contain → Plan" },
      { id: "d", text: "Identify → Analyse → Contain → Plan" },
    ],
    correctAnswer: "a",
    sourceSlide: 33,
  },
  {
    id: "v069",
    type: "multiple-select",
    question: "Which of these are steps of the CAPA Process?",
    options: [
      { id: "a", text: "Contain" },
      { id: "b", text: "Verify" },
      { id: "c", text: "Standardise" },
      { id: "d", text: "Sustain" },
    ],
    correctAnswer: ["a", "b", "c"],
    sourceSlide: 33,
  },
  {
    id: "v070",
    type: "single-choice",
    question: "In the 5 Whys, how long do you keep asking \"why?\"",
    options: [
      { id: "a", text: "Until the answer is a process" },
      { id: "b", text: "Until an operator is named" },
      { id: "c", text: "Until exactly three answers are found" },
      { id: "d", text: "Until the part is repaired" },
    ],
    correctAnswer: "a",
    sourceSlide: 34,
  },

  /* ==========================================================
     3.5 — LEAN MANUFACTURING  (slides 35–36)
     ----------------------------------------------------------
     Scope stops at slide 36, so this covers the definition,
     VALUE, WASTE and the goal — and nothing on the 8 Wastes,
     Kaizen or 5S, which live on slide 37 onward.
     ========================================================== */
  {
    id: "v071",
    type: "single-choice",
    question: "How does the lecture define Lean Manufacturing?",
    options: [
      { id: "a", text: "A systematic approach to eliminating waste and increasing value in manufacturing" },
      { id: "b", text: "A way of making operators work faster" },
      { id: "c", text: "A method for sorting causes into six families" },
      { id: "d", text: "A chart for monitoring a process over time" },
    ],
    correctAnswer: "a",
    sourceSlide: 36,
  },
  {
    id: "v072",
    type: "single-choice",
    question: "In Lean, what is VALUE?",
    options: [
      { id: "a", text: "What the customer pays for" },
      { id: "b", text: "What the customer would not pay for" },
      { id: "c", text: "The number of parts made per shift" },
      { id: "d", text: "The cost of the raw material" },
    ],
    correctAnswer: "a",
    sourceSlide: 36,
  },
  {
    id: "v073",
    type: "single-choice",
    question: "In Lean, what is WASTE?",
    options: [
      { id: "a", text: "What the customer would not pay for" },
      { id: "b", text: "What the customer pays for" },
      { id: "c", text: "Any part that has been scrapped" },
      { id: "d", text: "The time taken to cure a part" },
    ],
    correctAnswer: "a",
    sourceSlide: 36,
  },
  {
    id: "v074",
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
    id: "v075",
    type: "single-choice",
    question: "What is the goal of Lean Manufacturing?",
    options: [
      { id: "a", text: "Deliver more value to customers using fewer resources, time and inventory" },
      { id: "b", text: "Produce as many parts as possible every shift" },
      { id: "c", text: "Remove all inspection from the process" },
      { id: "d", text: "Replace operators with machines" },
    ],
    correctAnswer: "a",
    sourceSlide: 36,
  },
];

window.QUIZ_QUESTIONS = QUIZ_QUESTIONS;
