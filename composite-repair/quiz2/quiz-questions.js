/* REPAIR REVISION — DQP 50153 Composite Repair Technique, Test, July–December 2026.

   Every question here comes from TWO files and nothing else:
     TEST_DQP50153_JUL_DIS_2026.docx        (the 8-question paper, 40 marks)
     SKEMA_TEST_DQP50153_JUL_DIS_2026.docx  (the marking scheme)

   Nothing was added from a textbook, the internet, or general composite
   knowledge. Where the scheme states a fact, there is a question; where it
   does not, there is none. That is why there is nothing here on the
   difference between delamination and debonding, for example — both appear
   as labels in Figure 1, but the scheme never defines either, so a question
   would be testing something the student was never told to revise.

   c001–c030. IDs are permanent, because saved attempt rows in the Google
   Sheet refer to them. Keep answer IDs stable when editing text; if a
   question is ever dropped, leave its ID unused rather than reassigning it.

   The first option is always the correct one, which makes the bank quick to
   proofread. Students never see that order — the engine shuffles options on
   every question of every attempt and tracks the answer by a stable id,
   never by position.

   TYPE COUNTS — 30 questions, 20 drawn per attempt
     single-choice     18
     multiple-select    7
     image-choice       5   <-- TYPE_QUOTAS asks for 2 per attempt

   Two of the multiple-select questions also carry an image (c008 reads
   Figure 1). The type field drives the quota and the answer UI; the image
   is drawn whenever q.image is set, independently of type. So c008 shows
   the figure without counting toward the image-choice quota, which is the
   behaviour wanted — the quota exists to guarantee figure practice, and
   c006/c007/c016/c017/c020 already do that.
*/
"use strict";

const QUIZ_QUESTIONS = [

  /* ---- Q1 (6 marks): gel coat defects and their causes ----------- */
  {
    id: "c001", type: "single-choice",
    question: "A gel coat surface has lost its shine. According to the marking scheme, what causes POOR GLOSS?",
    options: [
      { id: "a", text: "A dull mould or wax build-up on the mould" },
      { id: "b", text: "Gel coat film applied too thick" },
      { id: "c", text: "Non-uniform catalysation of the gel coat" },
      { id: "d", text: "Dust or silicone contamination on the mould" },
    ], correctAnswer: "a", source: "dqp50153-test-scheme",
  },
  {
    id: "c002", type: "single-choice",
    question: "What causes FISHEYE in a gel coat?",
    options: [
      { id: "a", text: "Dust, dirt, oil or silicone on the mould" },
      { id: "b", text: "A dull mould or wax build-up" },
      { id: "c", text: "Gel coat not mixed thoroughly" },
      { id: "d", text: "Gel coat film applied too thick" },
    ], correctAnswer: "a", source: "dqp50153-test-scheme",
  },
  {
    id: "c003", type: "single-choice",
    question: "What causes DISCOLOURATION in a gel coat?",
    options: [
      { id: "a", text: "Non-uniform catalysation — the gel coat was not mixed thoroughly" },
      { id: "b", text: "Dust or dirt on the mould surface" },
      { id: "c", text: "Wax build-up on a dull mould" },
      { id: "d", text: "The mould was released too early" },
    ], correctAnswer: "a", source: "dqp50153-test-scheme",
  },
  {
    id: "c004", type: "single-choice",
    question: "What causes CRAZING and CRACKING in a gel coat?",
    options: [
      { id: "a", text: "The gel coat film was applied too thick" },
      { id: "b", text: "The gel coat film was applied too thin" },
      { id: "c", text: "Oil or silicone contamination on the mould" },
      { id: "d", text: "A dull mould with wax build-up" },
    ], correctAnswer: "a", source: "dqp50153-test-scheme",
  },
  {
    id: "c005", type: "multiple-select",
    question: "Which of these are GEL COAT defects named in the marking scheme? Select FOUR.",
    options: [
      { id: "a", text: "Poor gloss" },
      { id: "b", text: "Fisheye" },
      { id: "c", text: "Discolouration" },
      { id: "d", text: "Crazing and cracking" },
      { id: "e", text: "Delamination" },
      { id: "f", text: "Porosity" },
      { id: "g", text: "Broken fibre" },
      { id: "h", text: "Wrinkle" },
    ], correctAnswer: ["a", "b", "c", "d"], source: "dqp50153-test-scheme",
  },

  /* ---- Q2 (2 marks): Figure 1, laminate defects ------------------- */
  {
    id: "c006", type: "image-choice",
    question: "Figure 1 shows defects that occurred in a laminate. What is X?",
    image: "laminate-defects.png",
    imageAlt: "Cross-section of a composite laminate. Ten flaws in the stack are picked out by arrows and named around the edge of the drawing; two of those names are replaced by the letters X and Y.",
    options: [
      { id: "a", text: "Wrinkle" },
      { id: "b", text: "Void" },
      { id: "c", text: "Blister" },
      { id: "d", text: "Porosity" },
    ], correctAnswer: "a", source: "dqp50153-test-scheme",
  },
  {
    id: "c007", type: "image-choice",
    question: "Figure 1 shows defects that occurred in a laminate. What is Y?",
    image: "laminate-defects.png",
    imageAlt: "Cross-section of a composite laminate. Ten flaws in the stack are picked out by arrows and named around the edge of the drawing; two of those names are replaced by the letters X and Y.",
    options: [
      { id: "a", text: "Void" },
      { id: "b", text: "Wrinkle" },
      { id: "c", text: "Matrix crack" },
      { id: "d", text: "Resin rich" },
    ], correctAnswer: "a", source: "dqp50153-test-scheme",
  },
  {
    id: "c008", type: "multiple-select",
    question: "Which of these defects are LABELLED in Figure 1? Select THREE.",
    image: "laminate-defects.png",
    imageAlt: "Cross-section of a composite laminate. Ten flaws in the stack are picked out by arrows and named around the edge of the drawing; two of those names are replaced by the letters X and Y.",
    options: [
      { id: "a", text: "Delamination" },
      { id: "b", text: "Matrix crack" },
      { id: "c", text: "Porosity" },
      { id: "d", text: "Fisheye" },
      { id: "e", text: "Poor gloss" },
      { id: "f", text: "Crazing" },
    ], correctAnswer: ["a", "b", "c"], source: "dqp50153-test-scheme",
  },

  /* ---- Q3 (4 marks): visual inspection equipment ------------------ */
  {
    id: "c009", type: "multiple-select",
    question: "Visual inspection is used in the aircraft industry to inspect damage on primary structures such as the fuselage. Which of these are the visual inspection equipment listed in the marking scheme? Select FOUR.",
    options: [
      { id: "a", text: "Torchlight" },
      { id: "b", text: "Magnifying glass" },
      { id: "c", text: "Borescope" },
      { id: "d", text: "Inspection mirror" },
      { id: "e", text: "Tap hammer" },
      { id: "f", text: "Heat blanket" },
      { id: "g", text: "Thermocouple" },
      { id: "h", text: "Vacuum bag" },
    ], correctAnswer: ["a", "b", "c", "d"], source: "dqp50153-test-scheme",
  },
  {
    id: "c010", type: "single-choice",
    question: "Which piece of visual inspection equipment is used to look inside a structure that cannot be seen directly?",
    options: [
      { id: "a", text: "Borescope" },
      { id: "b", text: "Torchlight" },
      { id: "c", text: "Magnifying glass" },
      { id: "d", text: "Tap hammer" },
    ], correctAnswer: "a", source: "dqp50153-test-scheme",
  },
  {
    id: "c011", type: "single-choice",
    question: "On which type of aircraft structure does the test paper say visual inspection is carried out?",
    options: [
      { id: "a", text: "Primary structures, such as the fuselage" },
      { id: "b", text: "Cabin furnishings and trim panels" },
      { id: "c", text: "Ground support equipment" },
      { id: "d", text: "Engine lubrication lines" },
    ], correctAnswer: "a", source: "dqp50153-test-scheme",
  },

  /* ---- Q4 (6 marks): why NDT matters ------------------------------ */
  {
    id: "c012", type: "multiple-select",
    question: "Non-Destructive Test (NDT) is a very important procedure in composite manufacturing. Which THREE reasons does the marking scheme give?",
    options: [
      { id: "a", text: "To locate damage — identify the defect or damage location" },
      { id: "b", text: "Damage evaluation — determine the extent of the defect" },
      { id: "c", text: "Post-repair — for quality assurance" },
      { id: "d", text: "To reduce the cost of raw materials" },
      { id: "e", text: "To speed up the curing cycle" },
      { id: "f", text: "To replace the need for a cure record" },
    ], correctAnswer: ["a", "b", "c"], source: "dqp50153-test-scheme",
  },
  {
    id: "c013", type: "single-choice",
    question: "When locating damage, which inspection is done FIRST?",
    options: [
      { id: "a", text: "Visual inspection" },
      { id: "b", text: "Ultrasonic C-scan" },
      { id: "c", text: "A cure cycle check" },
      { id: "d", text: "A vacuum leak test" },
    ], correctAnswer: "a", source: "dqp50153-test-scheme",
  },
  {
    id: "c014", type: "multiple-select",
    question: "Damage evaluation determines the EXTENT of a defect. Which FOUR things does the marking scheme say are determined?",
    options: [
      { id: "a", text: "Type of the defect" },
      { id: "b", text: "Size of the defect" },
      { id: "c", text: "Shape of the defect" },
      { id: "d", text: "Internal position of the defect" },
      { id: "e", text: "Cost of the repair" },
      { id: "f", text: "Age of the aircraft" },
    ], correctAnswer: ["a", "b", "c", "d"], source: "dqp50153-test-scheme",
  },
  {
    id: "c015", type: "single-choice",
    question: "Why is NDT carried out AFTER a repair has been completed?",
    options: [
      { id: "a", text: "For quality assurance" },
      { id: "b", text: "To remove the remaining moisture" },
      { id: "c", text: "To scarf the repair area" },
      { id: "d", text: "To mix the resin system" },
    ], correctAnswer: "a", source: "dqp50153-test-scheme",
  },

  /* ---- Q5 (5 marks): scarf repair and ply replacement ------------- */
  {
    id: "c016", type: "image-choice",
    question: "Figure 2 shows a monolithic laminate with a defect. What is the ply sequence, from TOP to BOTTOM?",
    image: "scarf-before.png",
    imageAlt: "A four-ply laminate drawn as four stacked rows, each row labelled with its own ply orientation. A short red line marked Defect lies inside the stack.",
    options: [
      { id: "a", text: "+45, 0, 90, −45" },
      { id: "b", text: "−45, 90, 0, +45" },
      { id: "c", text: "0, +45, −45, 90" },
      { id: "d", text: "90, −45, +45, 0" },
    ], correctAnswer: "a", source: "dqp50153-test-scheme",
  },
  {
    id: "c017", type: "image-choice",
    question: "In Figure 2, which ply is the defect in?",
    image: "scarf-before.png",
    imageAlt: "A four-ply laminate drawn as four stacked rows, each row labelled with its own ply orientation. A short red line marked Defect lies inside the stack.",
    options: [
      { id: "a", text: "The 90 ply" },
      { id: "b", text: "The +45 ply" },
      { id: "c", text: "The 0 ply" },
      { id: "d", text: "The −45 ply" },
    ], correctAnswer: "a", source: "dqp50153-test-scheme",
  },
  {
    id: "c018", type: "single-choice",
    question: "In the scarf repair answer for Figure 2, how many plies are removed and replaced?",
    options: [
      { id: "a", text: "Three" },
      { id: "b", text: "One" },
      { id: "c", text: "Two" },
      { id: "d", text: "Four" },
    ], correctAnswer: "a", source: "dqp50153-test-scheme",
  },
  {
    id: "c019", type: "single-choice",
    question: "A scarf repair earns 2 of the 5 marks for one feature of the material removal. What is it?",
    options: [
      { id: "a", text: "A scarfed, tapered angle around the damage" },
      { id: "b", text: "A straight vertical cut around the damage" },
      { id: "c", text: "A circular hole drilled through the laminate" },
      { id: "d", text: "A square step cut on one side only" },
    ], correctAnswer: "a", source: "dqp50153-test-scheme",
  },
  {
    id: "c020", type: "image-choice",
    question: "In the sample scarf repair answer, what is laid over the whole repair as the extra structural ply?",
    image: "scarf-repaired.png",
    imageAlt: "The same laminate after a scarf repair. Plies are cut away on a taper from both sides and replaced, and one additional full-width ply is laid over the whole repair, labelled with its orientation.",
    options: [
      { id: "a", text: "An extra structural ply at +45" },
      { id: "b", text: "An extra structural ply at −45" },
      { id: "c", text: "An extra structural ply at 0" },
      { id: "d", text: "An extra structural ply at 90" },
    ], correctAnswer: "a", source: "dqp50153-test-scheme",
  },
  {
    id: "c021", type: "single-choice",
    question: "One of the 5 marks for the scarf repair is for the replacement plies. What must be correct about them?",
    options: [
      { id: "a", text: "Their orientation must match the plies that were removed" },
      { id: "b", text: "They must all be laid at 0 regardless of the original" },
      { id: "c", text: "They must be laid in the reverse order" },
      { id: "d", text: "They must be thinner than the plies removed" },
    ], correctAnswer: "a", source: "dqp50153-test-scheme",
  },

  /* ---- Q6 (3 marks): tap test tools ------------------------------- */
  {
    id: "c022", type: "multiple-select",
    question: "Which THREE tools can be used to perform a Tap Test on a composite panel?",
    options: [
      { id: "a", text: "Tap hammer" },
      { id: "b", text: "Coin" },
      { id: "c", text: "Instrumented tap hammer (Woodpecker tool)" },
      { id: "d", text: "Borescope" },
      { id: "e", text: "Heat blanket" },
      { id: "f", text: "Vacuum pump" },
    ], correctAnswer: ["a", "b", "c"], source: "dqp50153-test-scheme",
  },
  {
    id: "c023", type: "single-choice",
    question: "Which tap test tool is the INSTRUMENTED one?",
    options: [
      { id: "a", text: "The Woodpecker tool" },
      { id: "b", text: "A coin" },
      { id: "c", text: "A plain tap hammer" },
      { id: "d", text: "An inspection mirror" },
    ], correctAnswer: "a", source: "dqp50153-test-scheme",
  },

  /* ---- Q7 (10 marks): permanent hot bonded structural repair ------ */
  {
    id: "c024", type: "single-choice",
    question: "What is STEP 1 of a permanent hot bonded structural composite repair?",
    options: [
      { id: "a", text: "Damage assessment and mapping" },
      { id: "b", text: "Damage removal" },
      { id: "c", text: "Surface and repair area preparation" },
      { id: "d", text: "Lay-up of the repair plies" },
    ], correctAnswer: "a", source: "dqp50153-test-scheme",
  },
  {
    id: "c025", type: "single-choice",
    question: "In the repair sequence, what comes immediately AFTER damage removal?",
    options: [
      { id: "a", text: "Drying — moisture or fluid removal" },
      { id: "b", text: "Lay-up of the repair plies" },
      { id: "c", text: "Curing" },
      { id: "d", text: "Post-repair inspection" },
    ], correctAnswer: "a", source: "dqp50153-test-scheme",
  },
  {
    id: "c026", type: "single-choice",
    question: "In the repair sequence, what is installed together with the vacuum bag?",
    options: [
      { id: "a", text: "The thermocouples" },
      { id: "b", text: "The heat blanket controller" },
      { id: "c", text: "The borescope" },
      { id: "d", text: "The tap hammer" },
    ], correctAnswer: "a", source: "dqp50153-test-scheme",
  },
  {
    id: "c027", type: "multiple-select",
    question: "During curing, which TWO things are monitored as in-process cure data?",
    options: [
      { id: "a", text: "Temperature" },
      { id: "b", text: "Vacuum" },
      { id: "c", text: "Fibre volume fraction" },
      { id: "d", text: "Panel weight" },
    ], correctAnswer: ["a", "b"], source: "dqp50153-test-scheme",
  },
  {
    id: "c028", type: "single-choice",
    question: "In the marking scheme's repair sequence, what is the LAST step, after post-repair inspection?",
    options: [
      { id: "a", text: "Surface protection system restoration" },
      { id: "b", text: "Scarfing the damaged area" },
      { id: "c", text: "Repair material preparation" },
      { id: "d", text: "Drying the laminate" },
    ], correctAnswer: "a", source: "dqp50153-test-scheme",
  },

  /* ---- Q8 (4 marks): hot bonder — heat blanket and thermocouples --- */
  {
    id: "c029", type: "single-choice",
    question: "When using a hot bonder machine, what is the function of the HEAT BLANKET?",
    options: [
      { id: "a", text: "It supplies and distributes heat evenly across the laminate to cure the repair" },
      { id: "b", text: "It measures the temperature of the laminate" },
      { id: "c", text: "It holds the vacuum around the repair patch" },
      { id: "d", text: "It removes moisture before the plies are laid up" },
    ], correctAnswer: "a", source: "dqp50153-test-scheme",
  },
  {
    id: "c030", type: "single-choice",
    question: "When using a hot bonder machine, what is the function of the THERMOCOUPLES?",
    options: [
      { id: "a", text: "They are sensors that measure temperature" },
      { id: "b", text: "They supply heat to the repair patch" },
      { id: "c", text: "They seal the edge of the vacuum bag" },
      { id: "d", text: "They remove air from under the bag" },
    ], correctAnswer: "a", source: "dqp50153-test-scheme",
  },
];

window.QUIZ_QUESTIONS = QUIZ_QUESTIONS;
