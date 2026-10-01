/* REVISION 1 — Test 1 marking scheme (r001–r018) and the supplied
   aerocomposite workflow (r019–r023). IDs are permanent because saved
   attempt rows refer to them. Keep answer IDs stable when editing text. */
"use strict";

const QUIZ_QUESTIONS = [
  {
    id: "r001", type: "single-choice",
    question: "Which statement best explains coordination in production?",
    options: [
      { id: "a", text: "Organizing manpower, materials and machines to achieve smooth, efficient production" },
      { id: "b", text: "Inspecting finished products to identify defects" },
      { id: "c", text: "Purchasing enough materials to fill the storage area" },
      { id: "d", text: "Increasing machine speed without considering other resources" },
    ], correctAnswer: "a", source: "test-1-marking-scheme",
  },
  {
    id: "r002", type: "single-choice",
    question: "What is the main purpose of coordination?",
    options: [
      { id: "a", text: "To help production flow smoothly and achieve targets efficiently" },
      { id: "b", text: "To keep every machine running regardless of production needs" },
      { id: "c", text: "To increase the amount of stored material" },
      { id: "d", text: "To focus only on the performance of individual workers" },
    ], correctAnswer: "a", source: "test-1-marking-scheme",
  },
  {
    id: "r003", type: "multiple-select",
    question: "Which are examples of direct materials? Select FIVE.",
    options: [
      { id: "a", text: "Resin" }, { id: "b", text: "Bagging film" },
      { id: "c", text: "Carbon fibre" }, { id: "d", text: "Glass fibre" },
      { id: "e", text: "Sealant tape" }, { id: "f", text: "Core material" },
      { id: "g", text: "Prepreg" }, { id: "h", text: "Breather" },
    ], correctAnswer: ["a", "c", "d", "f", "g"], source: "test-1-marking-scheme",
  },
  {
    id: "r004", type: "multiple-select",
    question: "Which are examples of indirect materials? Select FIVE.",
    options: [
      { id: "a", text: "Carbon fibre" }, { id: "b", text: "Bagging film" },
      { id: "c", text: "Sealant tape" }, { id: "d", text: "Peel ply" },
      { id: "e", text: "Resin" }, { id: "f", text: "Breather" },
      { id: "g", text: "Masking tape" }, { id: "h", text: "Core material" },
    ], correctAnswer: ["b", "c", "d", "f", "g"], source: "test-1-marking-scheme",
  },
  {
    id: "r005", type: "single-choice",
    question: "Which pair correctly identifies a direct material and an indirect material?",
    options: [
      { id: "a", text: "Direct: Prepreg | Indirect: Peel ply" },
      { id: "b", text: "Direct: Masking tape | Indirect: Carbon fibre" },
      { id: "c", text: "Direct: Breather | Indirect: Resin" },
      { id: "d", text: "Direct: Sealant tape | Indirect: Glass fibre" },
    ], correctAnswer: "a", source: "test-1-marking-scheme",
  },
  {
    id: "r006", type: "single-choice",
    question: "Which group contains only tools from the seven QC tools?",
    options: [
      { id: "a", text: "Check Sheet, Pareto Chart, Cause-and-Effect Diagram" },
      { id: "b", text: "Check Sheet, Inventory, Cause-and-Effect Diagram" },
      { id: "c", text: "Pareto Chart, Coordination, Overproduction" },
      { id: "d", text: "Cause-and-Effect Diagram, Waiting, Motion" },
    ], correctAnswer: "a", source: "test-1-marking-scheme",
  },
  {
    id: "r007", type: "single-choice",
    question: "A student has listed Check Sheet, Pareto Chart and Cause-and-Effect Diagram. Which FOUR tools complete the list of seven QC tools?",
    options: [
      { id: "a", text: "Histogram, Control Chart, Scatter Diagram, Flow Chart" },
      { id: "b", text: "Histogram, Control Chart, Inventory, Flow Chart" },
      { id: "c", text: "Histogram, Transportation, Scatter Diagram, Flow Chart" },
      { id: "d", text: "Motion, Control Chart, Scatter Diagram, Extra processing" },
    ], correctAnswer: "a", source: "test-1-marking-scheme",
  },
  {
    id: "r008", type: "single-choice",
    question: "Which statement gives the most complete purpose of QC tools?",
    options: [
      { id: "a", text: "To identify problems, analyse root causes and improve product quality" },
      { id: "b", text: "To record problems without investigating them" },
      { id: "c", text: "To increase output without checking quality" },
      { id: "d", text: "To replace coordination of production resources" },
    ], correctAnswer: "a", source: "test-1-marking-scheme",
  },
  {
    id: "r009", type: "single-choice",
    question: "Which of the following is NOT one of the seven QC tools?",
    options: [
      { id: "a", text: "Non-utilized talent" },
      { id: "b", text: "Histogram" },
      { id: "c", text: "Scatter Diagram" },
      { id: "d", text: "Control Chart" },
    ], correctAnswer: "a", source: "test-1-marking-scheme",
  },
  {
    id: "r010", type: "single-choice",
    question: "Which statement best defines Lean Manufacturing?",
    options: [
      { id: "a", text: "Reducing waste and improving efficiency while delivering value to customers" },
      { id: "b", text: "Increasing production regardless of customer needs" },
      { id: "c", text: "Keeping additional inventory at every production stage" },
      { id: "d", text: "Focusing on production speed without considering waste" },
    ], correctAnswer: "a", source: "test-1-marking-scheme",
  },
  {
    id: "r011", type: "single-choice",
    question: "According to the definition of Lean Manufacturing, value should be delivered to whom?",
    options: [
      { id: "a", text: "Customers" }, { id: "b", text: "Only machine operators" },
      { id: "c", text: "Only material suppliers" }, { id: "d", text: "Only production supervisors" },
    ], correctAnswer: "a", source: "test-1-marking-scheme",
  },
  {
    id: "r012", type: "single-choice",
    question: "Which group contains only types of waste?",
    options: [
      { id: "a", text: "Defects, Overproduction, Waiting, Non-utilized talent" },
      { id: "b", text: "Defects, Overproduction, Coordination, Non-utilized talent" },
      { id: "c", text: "Defects, Efficiency, Waiting, Non-utilized talent" },
      { id: "d", text: "Customer value, Overproduction, Waiting, Coordination" },
    ], correctAnswer: "a", source: "test-1-marking-scheme",
  },
  {
    id: "r013", type: "single-choice",
    question: "Which group also consists entirely of types of waste?",
    options: [
      { id: "a", text: "Transportation, Inventory, Motion, Extra processing" },
      { id: "b", text: "Transportation, Inventory, Motion, Process improvement" },
      { id: "c", text: "Transportation, Coordination, Motion, Extra processing" },
      { id: "d", text: "Efficiency, Inventory, Quality improvement, Extra processing" },
    ], correctAnswer: "a", source: "test-1-marking-scheme",
  },
  {
    id: "r014", type: "single-choice",
    question: "Which of the following is a goal of Lean Manufacturing rather than a type of waste?",
    options: [
      { id: "a", text: "Improved efficiency" }, { id: "b", text: "Overproduction" },
      { id: "c", text: "Extra processing" }, { id: "d", text: "Waiting" },
    ], correctAnswer: "a", source: "test-1-marking-scheme",
  },
  {
    id: "r015", type: "multiple-select",
    question: "Which THREE statements correctly describe the concepts in this revision? Select THREE.",
    options: [
      { id: "a", text: "Coordination organizes production resources to support smooth production." },
      { id: "b", text: "QC tools are used only to record problems, without analysing their causes." },
      { id: "c", text: "Lean Manufacturing focuses on waste reduction, efficiency and customer value." },
      { id: "d", text: "QC tools help identify problems, analyse root causes and improve product quality." },
      { id: "e", text: "Lean Manufacturing aims to increase inventory and extra processing." },
    ], correctAnswer: ["a", "c", "d"], source: "test-1-marking-scheme",
  },
  {
    id: "r016", type: "single-choice",
    question: "What does Transportation waste mean?",
    options: [
      { id: "a", text: "Unnecessary movement of materials or products between places" },
      { id: "b", text: "Workers making unnecessary movements while doing a task" },
      { id: "c", text: "Producing more items than needed" },
      { id: "d", text: "Keeping too much material in storage" },
    ], correctAnswer: "a", source: "test-1-marking-scheme",
  },
  {
    id: "r017", type: "single-choice",
    question: "What does Non-utilized talent mean?",
    options: [
      { id: "a", text: "Workers’ skills, knowledge or ideas are not used effectively" },
      { id: "b", text: "A worker needs more time to complete a task" },
      { id: "c", text: "Too many workers are assigned to one machine" },
      { id: "d", text: "A worker moves between workstations" },
    ], correctAnswer: "a", source: "test-1-marking-scheme",
  },
  {
    id: "r018", type: "single-choice",
    question: "What does Extra processing mean?",
    options: [
      { id: "a", text: "Doing more work on a product than the customer requires" },
      { id: "b", text: "Reworking a defective product" },
      { id: "c", text: "Producing items before they are needed" },
      { id: "d", text: "Waiting for the next production step" },
    ], correctAnswer: "a", source: "test-1-marking-scheme",
  },
  {
    id: "r019", type: "image-choice", question: "Which steps fill blanks A, B and C in the workflow?",
    image: "workflow-q19.png", imageAlt: "Aircraft production workflow with steps 2, 3 and 4 blank, marked A, B and C. Follow the numbered arrows.",
    options: [
      { id: "a", text: "Storage → Kitting → Lay-up" },
      { id: "b", text: "Storage → Lay-up → Kitting" },
      { id: "c", text: "Kitting → Storage → Lay-up" },
      { id: "d", text: "Storage → Kitting → Autoclave" },
    ], correctAnswer: "a", source: "production-process-workflow",
  },
  {
    id: "r020", type: "image-choice", question: "Which steps fill blanks A, B and C in the workflow?",
    image: "workflow-q20.png", imageAlt: "Aircraft production workflow with steps 5, 6 and 7 blank, marked A, B and C. Follow the numbered arrows.",
    options: [
      { id: "a", text: "Autoclave → Demould → Trimming" },
      { id: "b", text: "Autoclave → Trimming → Demould" },
      { id: "c", text: "Demould → Autoclave → Trimming" },
      { id: "d", text: "Autoclave → NDT → Trimming" },
    ], correctAnswer: "a", source: "production-process-workflow",
  },
  {
    id: "r021", type: "image-choice", question: "Which steps fill blanks A, B and C in the workflow?",
    image: "workflow-q21.png", imageAlt: "Aircraft production workflow with steps 8, 9 and 10 blank, marked A, B and C. Follow the numbered arrows.",
    options: [
      { id: "a", text: "NDT → Mechanical Assembly → Painting" },
      { id: "b", text: "Mechanical Assembly → NDT → Painting" },
      { id: "c", text: "NDT → Painting → Mechanical Assembly" },
      { id: "d", text: "NDT → Mechanical Assembly → Packing" },
    ], correctAnswer: "a", source: "production-process-workflow",
  },
  {
    id: "r022", type: "image-choice", question: "Which steps fill blanks A, B and C in the workflow?",
    image: "workflow-q22.png", imageAlt: "Aircraft production workflow with steps 1, 11 and 13 blank, marked A, B and C. Follow the numbered arrows.",
    options: [
      { id: "a", text: "Receiving → Final Inspection → Shipping" },
      { id: "b", text: "Storage → Final Inspection → Shipping" },
      { id: "c", text: "Receiving → Packing → Shipping" },
      { id: "d", text: "Receiving → Final Inspection → Packing" },
    ], correctAnswer: "a", source: "production-process-workflow",
  },
  {
    id: "r023", type: "image-choice", question: "Which steps fill blanks A, B and C in the workflow?",
    image: "workflow-q23.png", imageAlt: "Aircraft production workflow with steps 3, 6 and 12 blank, marked A, B and C. Follow the numbered arrows.",
    options: [
      { id: "a", text: "Kitting → Demould → Packing" },
      { id: "b", text: "Kitting → Trimming → Packing" },
      { id: "c", text: "Kitting → Demould → Shipping" },
      { id: "d", text: "Lay-up → Demould → Packing" },
    ], correctAnswer: "a", source: "production-process-workflow",
  },
];

window.QUIZ_QUESTIONS = QUIZ_QUESTIONS;
