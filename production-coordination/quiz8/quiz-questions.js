/* REVISION IQA 10067 — built from the July–December 2026 Final
   Examination, SET 1, and its marking scheme.

   ORDER MATTERS HERE, unlike every other activity. The paper is the
   FIRST THIRTY entries, taken in order and never shuffled, so the
   sequence below is the sequence a student sits. They are arranged to
   cover all six examination questions:

     f001–f006  Q1  coordination and the composite workflow
     f007–f012  Q2  Ishikawa and the seven QC tools
     f013–f017  Q3  KAIZEN and the eight wastes (Muda)
     f018–f022  Q4  the five skill levels
     f023–f026  Q5  the CTRM training procedure
     f027–f030  Q6  training aids, costs and documents

   f031–f040 are the SPARE POOL. They never appear in the paper as it
   stands; each one is an extra item inside a topic the paper already
   covers, so any of them can be swapped in by moving it above the
   thirtieth entry. IDs are permanent because saved attempt rows refer
   to them. */
"use strict";

const QUIZ_QUESTIONS = [

  /* ============================================================
     Q1 — COORDINATION AND THE COMPOSITE WORKFLOW
     ============================================================ */
  {
    id: "f001", type: "single-choice",
    question: "What does coordination mean in a manufacturing production line?",
    options: [
      { id: "a", text: "Making sure all production activities work together smoothly, so products are made on time and with minimum waste" },
      { id: "b", text: "Inspecting every finished panel before it leaves the factory" },
      { id: "c", text: "Running every machine at its maximum speed" },
      { id: "d", text: "Keeping the largest possible stock of raw material" },
    ], correctAnswer: "a", source: "final-exam-set-1",
  },
  {
    id: "f002", type: "multiple-select",
    question: "Production coordination makes sure certain things are in place before work starts. Which are they? Select FOUR.",
    options: [
      { id: "a", text: "The right material is available" },
      { id: "b", text: "The right worker is ready" },
      { id: "c", text: "The right equipment is available" },
      { id: "d", text: "The process follows the plan" },
      { id: "e", text: "The selling price has been raised" },
      { id: "f", text: "The competitor's schedule has been copied" },
    ], correctAnswer: ["a", "b", "c", "d"], source: "final-exam-set-1",
  },
  {
    id: "f003", type: "single-choice",
    question: "Why is good coordination important in composite production?",
    options: [
      { id: "a", text: "It reduces waste, delay and cost — smooth work, less delay, less waste" },
      { id: "b", text: "It allows the factory to run without any quality inspection" },
      { id: "c", text: "It removes the need to train the operators" },
      { id: "d", text: "It lets the company deliver later than the customer asked" },
    ], correctAnswer: "a", source: "final-exam-set-1",
  },
  {
    id: "f004", type: "multiple-select",
    question: "Coordination makes sure three resources are ready before work starts. Which THREE?",
    options: [
      { id: "a", text: "Material" },
      { id: "b", text: "Manpower" },
      { id: "c", text: "Equipment" },
      { id: "d", text: "Advertising" },
      { id: "e", text: "Shareholders" },
      { id: "f", text: "Export licences" },
    ], correctAnswer: ["a", "b", "c"], source: "final-exam-set-1",
  },
  {
    id: "f005", type: "multiple-select",
    question: "Which of these are aerospace composite manufacturing workflow processes? Select FIVE.",
    options: [
      { id: "a", text: "Kitting" },
      { id: "b", text: "Lay-up" },
      { id: "c", text: "Autoclave (curing)" },
      { id: "d", text: "Trimming" },
      { id: "e", text: "NDT (Non-Destructive Test)" },
      { id: "f", text: "Payroll processing" },
      { id: "g", text: "Market research" },
      { id: "h", text: "Recruitment interview" },
    ], correctAnswer: ["a", "b", "c", "d", "e"], source: "final-exam-set-1",
  },
  {
    id: "f006", type: "single-choice",
    question: "Which sequence shows the correct order of the composite workflow?",
    options: [
      { id: "a", text: "Kitting → Lay-up → Autoclave" },
      { id: "b", text: "Autoclave → Kitting → Lay-up" },
      { id: "c", text: "Lay-up → Kitting → Autoclave" },
      { id: "d", text: "Autoclave → Lay-up → Kitting" },
    ], correctAnswer: "a", source: "final-exam-set-1",
  },

  /* ============================================================
     Q2 — ISHIKAWA AND THE SEVEN QC TOOLS
     ============================================================ */
  {
    id: "f007", type: "single-choice",
    question: "The Ishikawa diagram is also known by which other names?",
    options: [
      { id: "a", text: "Cause and effect diagram, or fishbone diagram" },
      { id: "b", text: "Pareto chart, or 80/20 chart" },
      { id: "c", text: "Control chart, or run chart" },
      { id: "d", text: "Scatter diagram, or correlation chart" },
    ], correctAnswer: "a", source: "final-exam-set-1",
  },
  {
    id: "f008", type: "multiple-select",
    question: "An Ishikawa diagram branches into the six major 6M families. Which are they? Select SIX.",
    options: [
      { id: "a", text: "Man" },
      { id: "b", text: "Machine" },
      { id: "c", text: "Method" },
      { id: "d", text: "Material" },
      { id: "e", text: "Measurement" },
      { id: "f", text: "Environment" },
      { id: "g", text: "Marketing" },
      { id: "h", text: "Management" },
    ], correctAnswer: ["a", "b", "c", "d", "e", "f"], source: "final-exam-set-1",
  },
  {
    id: "f009", type: "single-choice",
    question: "On an Ishikawa diagram for machine breakdown, under which 6M family does \"untrained operator, fatigue, no briefing\" belong?",
    options: [
      { id: "a", text: "Man" },
      { id: "b", text: "Material" },
      { id: "c", text: "Measurement" },
      { id: "d", text: "Environment" },
    ], correctAnswer: "a", source: "final-exam-set-1",
  },
  {
    id: "f010", type: "single-choice",
    question: "On an Ishikawa diagram, under which 6M family does \"faulty gauge, no calibration record, parameter not monitored\" belong?",
    options: [
      { id: "a", text: "Measurement" },
      { id: "b", text: "Method" },
      { id: "c", text: "Man" },
      { id: "d", text: "Machine" },
    ], correctAnswer: "a", source: "final-exam-set-1",
  },
  {
    id: "f011", type: "multiple-select",
    question: "Which of these belong to the seven QC tools? Select FIVE.",
    options: [
      { id: "a", text: "Check sheet" },
      { id: "b", text: "Histogram" },
      { id: "c", text: "Pareto chart" },
      { id: "d", text: "Cause and effect diagram" },
      { id: "e", text: "Control chart" },
      { id: "f", text: "Autoclave cure cycle" },
      { id: "g", text: "Vacuum bag schedule" },
      { id: "h", text: "Training nomination form" },
    ], correctAnswer: ["a", "b", "c", "d", "e"], source: "final-exam-set-1",
  },
  {
    id: "f012", type: "single-choice",
    question: "What is the purpose of the 7QC tools in manufacturing?",
    options: [
      { id: "a", text: "To turn messy data into a clear decision — find the real problem, set the priority, identify the root cause and monitor the process" },
      { id: "b", text: "To replace the quality inspector with an automatic machine" },
      { id: "c", text: "To calculate the wages of the production operators" },
      { id: "d", text: "To decide which customer should be served first" },
    ], correctAnswer: "a", source: "final-exam-set-1",
  },

  /* ============================================================
     Q3 — KAIZEN AND THE EIGHT WASTES
     ============================================================ */
  {
    id: "f013", type: "single-choice",
    question: "What does KAIZEN mean?",
    options: [
      { id: "a", text: "A Japanese word meaning \"change for the better\" — continuous improvement" },
      { id: "b", text: "A Japanese word meaning \"zero defect inspection\"" },
      { id: "c", text: "A Japanese word meaning \"just in time delivery\"" },
      { id: "d", text: "A Japanese word meaning \"total machine replacement\"" },
    ], correctAnswer: "a", source: "final-exam-set-1",
  },
  {
    id: "f014", type: "single-choice",
    question: "Which statement best describes how KAIZEN works in practice?",
    options: [
      { id: "a", text: "Small improvements made by everyone, every day — a cheap win beats a new machine, and many small gains add up" },
      { id: "b", text: "One large investment made by top management once a year" },
      { id: "c", text: "Improvements suggested only by the engineering department" },
      { id: "d", text: "Changes made only after a customer complaint is received" },
    ], correctAnswer: "a", source: "final-exam-set-1",
  },
  {
    id: "f015", type: "single-choice",
    question: "What does the mnemonic DOWNTIME stand for in Lean Manufacturing?",
    options: [
      { id: "a", text: "The eight types of waste (Muda)" },
      { id: "b", text: "The eight stages of the autoclave cure cycle" },
      { id: "c", text: "The eight steps of a training programme" },
      { id: "d", text: "The eight sections of an Ishikawa diagram" },
    ], correctAnswer: "a", source: "final-exam-set-1",
  },
  {
    id: "f016", type: "multiple-select",
    question: "Which of these are types of waste (Muda) in Lean Manufacturing? Select FIVE.",
    options: [
      { id: "a", text: "Defects" },
      { id: "b", text: "Overproduction" },
      { id: "c", text: "Waiting" },
      { id: "d", text: "Transport" },
      { id: "e", text: "Motion" },
      { id: "f", text: "Calibration" },
      { id: "g", text: "Certification" },
      { id: "h", text: "Recruitment" },
    ], correctAnswer: ["a", "b", "c", "d", "e"], source: "final-exam-set-1",
  },
  {
    id: "f017", type: "single-choice",
    question: "An operator stands idle while the autoclave is curing. Which waste is this?",
    options: [
      { id: "a", text: "Waiting" },
      { id: "b", text: "Defects" },
      { id: "c", text: "Extra processing" },
      { id: "d", text: "Inventory" },
    ], correctAnswer: "a", source: "final-exam-set-1",
  },

  /* ============================================================
     Q4 — THE FIVE SKILL LEVELS (Diagram 1)
     ============================================================ */
  {
    id: "f018", type: "image-choice",
    question: "In Diagram 1, which is the FIRST level in the composite production line skill ladder?",
    image: "skill-levels.png",
    imageAlt: "Diagram 1 from the examination paper: an arrow containing five labelled boxes showing the skill ladder of a composite production line.",
    options: [
      { id: "a", text: "Under Training" },
      { id: "b", text: "Skilled : Buddy" },
      { id: "c", text: "Highly Skilled : Expert" },
      { id: "d", text: "Semi-Skilled : Independent" },
    ], correctAnswer: "a", source: "final-exam-set-1",
  },
  {
    id: "f019", type: "image-choice",
    question: "In Diagram 1, which level comes immediately AFTER Semi-Skilled : Independent?",
    image: "skill-levels.png",
    imageAlt: "Diagram 1 from the examination paper: an arrow containing five labelled boxes showing the skill ladder of a composite production line.",
    options: [
      { id: "a", text: "Skilled : Buddy" },
      { id: "b", text: "Under Training" },
      { id: "c", text: "Unskilled : Under Supervision" },
      { id: "d", text: "Highly Skilled : Expert" },
    ], correctAnswer: "a", source: "final-exam-set-1",
  },
  {
    id: "f020", type: "single-choice",
    question: "Which description matches the Unskilled : Under Supervision level?",
    options: [
      { id: "a", text: "Has attended basic induction training, performs simple duties only, and needs full monitoring by the superior" },
      { id: "b", text: "Works efficiently and independently, and can teach others within the job scope" },
      { id: "c", text: "Supervises skilled employees and is able to act as a trainer" },
      { id: "d", text: "Makes decisions independently within a limited scope with minimum supervision" },
    ], correctAnswer: "a", source: "final-exam-set-1",
  },
  {
    id: "f021", type: "single-choice",
    question: "Which description matches the Semi-Skilled : Independent level?",
    options: [
      { id: "a", text: "Familiar with a limited scope, makes decisions independently within it, and is monitored with minimum supervision" },
      { id: "b", text: "Needs full monitoring by the superior for every simple duty" },
      { id: "c", text: "Supervises skilled employees and can act as a trainer" },
      { id: "d", text: "Has not yet attended the basic technical induction class" },
    ], correctAnswer: "a", source: "final-exam-set-1",
  },
  {
    id: "f022", type: "single-choice",
    question: "At which level can a worker be appointed as a supervisor or line leader, and why?",
    options: [
      { id: "a", text: "Highly Skilled : Expert — the worker works efficiently, supervises skilled employees and can act as a trainer" },
      { id: "b", text: "Under Training — the worker is new and has the most recent knowledge" },
      { id: "c", text: "Unskilled : Under Supervision — the worker already understands being monitored" },
      { id: "d", text: "Semi-Skilled : Independent — the worker can make some decisions alone" },
    ], correctAnswer: "a", source: "final-exam-set-1",
  },

  /* ============================================================
     Q5 — THE CTRM TRAINING PROCEDURE (Diagram 2)
     ============================================================ */
  {
    id: "f023", type: "single-choice",
    question: "In the CTRM training procedure, what is HOD?",
    options: [
      { id: "a", text: "Head of Department — recommends and endorses the training nomination before it goes for approval" },
      { id: "b", text: "Handover Of Duty — the shift change record" },
      { id: "c", text: "Hold On Delivery — a quality hold on a shipment" },
      { id: "d", text: "Head Of Design — approves the engineering drawing" },
    ], correctAnswer: "a", source: "final-exam-set-1",
  },
  {
    id: "f024", type: "single-choice",
    question: "In the CTRM training procedure, what is TNF?",
    options: [
      { id: "a", text: "Training Nomination Form — submitted to the HOD for recommendation and to the CEO for approval, then sent to TRD" },
      { id: "b", text: "Training Needs Forecast — the yearly budget estimate" },
      { id: "c", text: "Technical Non-conformance Form — raised when a panel fails inspection" },
      { id: "d", text: "Trainer Nomination File — the list of approved trainers" },
    ], correctAnswer: "a", source: "final-exam-set-1",
  },
  {
    id: "f025", type: "single-choice",
    question: "In the CTRM training procedure, what is CEO?",
    options: [
      { id: "a", text: "Chief Executive Officer — top management, who gives the final approval for the training programme" },
      { id: "b", text: "Chief Engineering Operator — who signs off the machine settings" },
      { id: "c", text: "Composite Equipment Officer — who maintains the autoclave" },
      { id: "d", text: "Certified Examination Officer — who marks the final paper" },
    ], correctAnswer: "a", source: "final-exam-set-1",
  },
  {
    id: "f026", type: "image-choice",
    question: "In Diagram 2, what happens when approval is NOT given?",
    image: "training-procedure.jpg",
    imageAlt: "Diagram 2 from the examination paper: a flow chart of the standard procedure for conducting a training programme at CTRM, with a decision point partway through.",
    options: [
      { id: "a", text: "The request is rejected" },
      { id: "b", text: "The payment is processed anyway" },
      { id: "c", text: "The staff member is registered with the training institution" },
      { id: "d", text: "The TNF is filed as approved" },
    ], correctAnswer: "a", source: "final-exam-set-1",
  },

  /* ============================================================
     Q6 — TRAINING AIDS, COSTS AND DOCUMENTS
     ============================================================ */
  {
    id: "f027", type: "multiple-select",
    question: "Which of these are audio-visual or visual aids that can be used during training? Select SIX.",
    options: [
      { id: "a", text: "LCD projector" },
      { id: "b", text: "Computer / laptop" },
      { id: "c", text: "Television" },
      { id: "d", text: "Chart" },
      { id: "e", text: "Model" },
      { id: "f", text: "White board" },
      { id: "g", text: "Vacuum pump" },
      { id: "h", text: "Autoclave" },
    ], correctAnswer: ["a", "b", "c", "d", "e", "f"], source: "final-exam-set-1",
  },
  {
    id: "f028", type: "multiple-select",
    question: "Which costs should be considered when planning the budget for a training programme? Select FOUR.",
    options: [
      { id: "a", text: "Rental" },
      { id: "b", text: "Food and beverage" },
      { id: "c", text: "Materials" },
      { id: "d", text: "Fees" },
      { id: "e", text: "Shareholder dividends" },
      { id: "f", text: "Customer warranty claims" },
    ], correctAnswer: ["a", "b", "c", "d"], source: "final-exam-set-1",
  },
  {
    id: "f029", type: "single-choice",
    question: "In a training budget, what does the Rental cost cover?",
    options: [
      { id: "a", text: "The cost of renting the training venue or room" },
      { id: "b", text: "The travel claim paid when the venue is far away" },
      { id: "c", text: "The course fee paid to an outside training provider" },
      { id: "d", text: "The refreshments served between sessions" },
    ], correctAnswer: "a", source: "final-exam-set-1",
  },
  {
    id: "f030", type: "multiple-select",
    question: "Which documents should be prepared during a training programme? Select TWO.",
    options: [
      { id: "a", text: "Attendance list" },
      { id: "b", text: "Evaluation form" },
      { id: "c", text: "Purchase order for raw material" },
      { id: "d", text: "Aircraft release certificate" },
      { id: "e", text: "Autoclave cure chart" },
    ], correctAnswer: ["a", "b"], source: "final-exam-set-1",
  },

  /* ============================================================
     SPARE POOL — f031 to f040
     ============================================================
     Not on the paper as it stands. Each is an extra item inside a
     topic the paper already covers, so swapping one in for a
     neighbouring question keeps the coverage balanced. Move it above
     the thirtieth entry to use it.
     ============================================================ */
  {
    id: "f031", type: "single-choice",
    question: "In the composite workflow, which process comes immediately after the autoclave?",
    options: [
      { id: "a", text: "Demould" },
      { id: "b", text: "Kitting" },
      { id: "c", text: "Lay-up" },
      { id: "d", text: "Receiving" },
    ], correctAnswer: "a", source: "final-exam-set-1",
  },
  {
    id: "f032", type: "single-choice",
    question: "In the composite workflow, what does NDT stand for?",
    options: [
      { id: "a", text: "Non-Destructive Test" },
      { id: "b", text: "New Drawing Template" },
      { id: "c", text: "Nominal Dimension Tolerance" },
      { id: "d", text: "Net Delivery Time" },
    ], correctAnswer: "a", source: "final-exam-set-1",
  },
  {
    id: "f033", type: "single-choice",
    question: "On an Ishikawa diagram, under which 6M family does \"worn part, no preventive maintenance, overheating\" belong?",
    options: [
      { id: "a", text: "Machine" },
      { id: "b", text: "Man" },
      { id: "c", text: "Material" },
      { id: "d", text: "Method" },
    ], correctAnswer: "a", source: "final-exam-set-1",
  },
  {
    id: "f034", type: "single-choice",
    question: "Among the seven QC tools, which one is used to set the priority — to show which problem to tackle first?",
    options: [
      { id: "a", text: "Pareto chart" },
      { id: "b", text: "Cause and effect diagram" },
      { id: "c", text: "Control chart" },
      { id: "d", text: "Check sheet" },
    ], correctAnswer: "a", source: "final-exam-set-1",
  },
  {
    id: "f035", type: "single-choice",
    question: "Making 60 panels when the customer order is only 40. Which waste is this?",
    options: [
      { id: "a", text: "Overproduction" },
      { id: "b", text: "Waiting" },
      { id: "c", text: "Motion" },
      { id: "d", text: "Defects" },
    ], correctAnswer: "a", source: "final-exam-set-1",
  },
  {
    id: "f036", type: "single-choice",
    question: "Prepreg left in the freezer until it expires. Which waste is this?",
    options: [
      { id: "a", text: "Inventory" },
      { id: "b", text: "Transport" },
      { id: "c", text: "Extra processing" },
      { id: "d", text: "Non-used talent" },
    ], correctAnswer: "a", source: "final-exam-set-1",
  },
  {
    id: "f037", type: "single-choice",
    question: "Which description matches the Skilled : Buddy level?",
    options: [
      { id: "a", text: "Works efficiently and independently, and can teach others within the job scope" },
      { id: "b", text: "Needs full monitoring by the superior" },
      { id: "c", text: "Has not yet attended the basic induction class" },
      { id: "d", text: "Sets the yearly training budget for the department" },
    ], correctAnswer: "a", source: "final-exam-set-1",
  },
  {
    id: "f038", type: "single-choice",
    question: "In the CTRM training procedure, what is TRD / TRDV?",
    options: [
      { id: "a", text: "Training and Development — registers staff with the training institution, raises payment, notifies the schedule and files the TNF" },
      { id: "b", text: "Technical Review Department — approves engineering changes" },
      { id: "c", text: "Tool Repair Division — maintains the moulds" },
      { id: "d", text: "Transport and Delivery — ships the finished panels" },
    ], correctAnswer: "a", source: "final-exam-set-1",
  },
  {
    id: "f039", type: "single-choice",
    question: "In a training budget, what does the Mileage cost cover?",
    options: [
      { id: "a", text: "The travel claim paid to the employee when the training venue is far away" },
      { id: "b", text: "The cost of renting the training room" },
      { id: "c", text: "The refreshments provided between sessions" },
      { id: "d", text: "The tools and materials used during the training" },
    ], correctAnswer: "a", source: "final-exam-set-1",
  },
  {
    id: "f040", type: "single-choice",
    question: "What is the training evaluation form used for after a programme?",
    options: [
      { id: "a", text: "It is completed by participants and forwarded to TRDV, who use it to improve and better select future training" },
      { id: "b", text: "It records who attended on each day of the programme" },
      { id: "c", text: "It is the claim form for the trainer's fee" },
      { id: "d", text: "It certifies that the participant is now a qualified trainer" },
    ], correctAnswer: "a", source: "final-exam-set-1",
  },
];

window.QUIZ_QUESTIONS = QUIZ_QUESTIONS;
