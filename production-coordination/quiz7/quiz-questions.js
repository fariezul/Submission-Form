/* REVISION 2 — Test 2 paper and marking scheme (IMC 10063 / IQA 10063).
   t001–t006 and t012–t025 come from the written answer scheme; t007–t011 read
   the training planning figure reproduced from the paper. IDs are permanent
   because saved attempt rows refer to them. Keep answer IDs stable when
   editing text. */
"use strict";

const QUIZ_QUESTIONS = [

  /* ---- Q1: Training Need Analysis -------------------------------- */
  {
    id: "t001", type: "single-choice",
    question: "What is Training Need Analysis (TNA)?",
    options: [
      { id: "a", text: "The process of identifying gaps between current and desired skills, knowledge and abilities" },
      { id: "b", text: "The process of calculating how much a training program will cost" },
      { id: "c", text: "The process of recording attendance at every training session" },
      { id: "d", text: "The process of selecting a trainer from an approved panel" },
    ], correctAnswer: "a", source: "test-2-marking-scheme",
  },
  {
    id: "t002", type: "single-choice",
    question: "AeroFly Sdn Bhd wants to improve its composite workers' performance. What must the company do BEFORE conducting the training?",
    options: [
      { id: "a", text: "Identify the required skills and training needs" },
      { id: "b", text: "Book the training room and order refreshments" },
      { id: "c", text: "Issue certificates to all the workers" },
      { id: "d", text: "Collect participant feedback forms" },
    ], correctAnswer: "a", source: "test-2-marking-scheme",
  },
  {
    id: "t003", type: "single-choice",
    question: "A TNA compares two things. Which pair does it compare?",
    options: [
      { id: "a", text: "Current skills and desired skills" },
      { id: "b", text: "Training budget and actual spending" },
      { id: "c", text: "Scrap rate and production output" },
      { id: "d", text: "Supplier lead time and customer due date" },
    ], correctAnswer: "a", source: "test-2-marking-scheme",
  },

  /* ---- Q2: Hand lay-up knowledge --------------------------------- */
  {
    id: "t004", type: "multiple-select",
    question: "A competent Hand Lay-Up worker should KNOW certain things. Which are knowledge required for Hand Lay-Up? Select FIVE.",
    options: [
      { id: "a", text: "KNOW the types of reinforcement materials" },
      { id: "b", text: "KNOW the resin system and mixing ratio" },
      { id: "c", text: "KNOW the lay-up sequence and orientation" },
      { id: "d", text: "KNOW the company's annual sales target" },
      { id: "e", text: "KNOW safety procedures and PPE usage" },
      { id: "f", text: "KNOW the curing process and temperature requirements" },
      { id: "g", text: "KNOW the customer's payment terms" },
      { id: "h", text: "KNOW the names of every shift supervisor" },
    ], correctAnswer: ["a", "b", "c", "e", "f"], source: "test-2-marking-scheme",
  },
  {
    id: "t005", type: "single-choice",
    question: "Which is NOT part of the knowledge a competent Hand Lay-Up worker should have?",
    options: [
      { id: "a", text: "The selling price of the finished aircraft part" },
      { id: "b", text: "The tools and equipment used in lay-up" },
      { id: "c", text: "The defect types such as void, delamination and air bubble" },
      { id: "d", text: "The resin system and its mixing ratio" },
    ], correctAnswer: "a", source: "test-2-marking-scheme",
  },
  {
    id: "t006", type: "single-choice",
    question: "A Hand Lay-Up worker must know the common defect types. Which group lists them correctly?",
    options: [
      { id: "a", text: "Void, delamination, air bubble" },
      { id: "b", text: "Overproduction, waiting, transport" },
      { id: "c", text: "Rental, mileage, training fees" },
      { id: "d", text: "Attendance list, evaluation form, certificate" },
    ], correctAnswer: "a", source: "test-2-marking-scheme",
  },

  /* ---- Q3: The training planning figure -------------------------- */
  {
    id: "t007", type: "image-choice",
    question: "In the training planning figure, what is X?",
    image: "training-plan.jpg",
    imageAlt: "Flow chart of training planning stages. The first box is labelled X and the last box is labelled Z.",
    options: [
      { id: "a", text: "Need Assessment" },
      { id: "b", text: "Measuring Effectiveness" },
      { id: "c", text: "Content Development" },
      { id: "d", text: "Communication of Training" },
    ], correctAnswer: "a", source: "test-2-marking-scheme",
  },
  {
    id: "t008", type: "image-choice",
    question: "In the training planning figure, what is Z?",
    image: "training-plan.jpg",
    imageAlt: "Flow chart of training planning stages. The first box is labelled X and the last box is labelled Z.",
    options: [
      { id: "a", text: "Measuring Effectiveness" },
      { id: "b", text: "Need Assessment" },
      { id: "c", text: "Audience Consideration" },
      { id: "d", text: "Learning Objectives" },
    ], correctAnswer: "a", source: "test-2-marking-scheme",
  },
  {
    id: "t009", type: "image-choice",
    question: "In the training planning figure, which stage comes immediately AFTER Learning Objectives?",
    image: "training-plan.jpg",
    imageAlt: "Flow chart of training planning stages. The first box is labelled X and the last box is labelled Z.",
    options: [
      { id: "a", text: "Learning Style" },
      { id: "b", text: "Budget" },
      { id: "c", text: "Time lines" },
      { id: "d", text: "Content Development" },
    ], correctAnswer: "a", source: "test-2-marking-scheme",
  },
  {
    id: "t010", type: "image-choice",
    question: "In the training planning figure, which stage comes immediately BEFORE Content Development?",
    image: "training-plan.jpg",
    imageAlt: "Flow chart of training planning stages. The first box is labelled X and the last box is labelled Z.",
    options: [
      { id: "a", text: "Audience Consideration" },
      { id: "b", text: "Delivery Mode" },
      { id: "c", text: "Time lines" },
      { id: "d", text: "Learning Style" },
    ], correctAnswer: "a", source: "test-2-marking-scheme",
  },
  {
    id: "t011", type: "image-choice",
    question: "In the training planning figure, which stage comes immediately AFTER Time lines?",
    image: "training-plan.jpg",
    imageAlt: "Flow chart of training planning stages. The first box is labelled X and the last box is labelled Z.",
    options: [
      { id: "a", text: "Communication of Training" },
      { id: "b", text: "Delivery Style" },
      { id: "c", text: "Budget" },
      { id: "d", text: "Learning Objectives" },
    ], correctAnswer: "a", source: "test-2-marking-scheme",
  },

  /* ---- Q4: Planning factors -------------------------------------- */
  {
    id: "t012", type: "multiple-select",
    question: "Which factors should be considered while planning a training program? Select FIVE.",
    options: [
      { id: "a", text: "Training needs and objectives" },
      { id: "b", text: "Learning styles" },
      { id: "c", text: "The competitor's product pricing" },
      { id: "d", text: "Delivery mode (online / practical / mentoring)" },
      { id: "e", text: "Budget" },
      { id: "f", text: "Audience and participants" },
      { id: "g", text: "The colour of the factory floor paint" },
      { id: "h", text: "The supplier's raw material lead time" },
    ], correctAnswer: ["a", "b", "d", "e", "f"], source: "test-2-marking-scheme",
  },
  {
    id: "t013", type: "single-choice",
    question: "Which of these is NOT a factor in planning a training program?",
    options: [
      { id: "a", text: "The resale value of the company's machinery" },
      { id: "b", text: "The training content" },
      { id: "c", text: "The timeline and schedule" },
      { id: "d", text: "The evaluation method" },
    ], correctAnswer: "a", source: "test-2-marking-scheme",
  },

  /* ---- Q5: Audio-visual equipment -------------------------------- */
  {
    id: "t014", type: "multiple-select",
    question: "Which are audio-visual equipment that can be used during a training session? Select FIVE.",
    options: [
      { id: "a", text: "LCD projector" },
      { id: "b", text: "Computer / laptop" },
      { id: "c", text: "Autoclave" },
      { id: "d", text: "Whiteboard" },
      { id: "e", text: "Portable PA system" },
      { id: "f", text: "TV / monitor" },
      { id: "g", text: "Vacuum pump" },
      { id: "h", text: "Torque wrench" },
    ], correctAnswer: ["a", "b", "d", "e", "f"], source: "test-2-marking-scheme",
  },
  {
    id: "t015", type: "single-choice",
    question: "Which item is audio-visual training equipment rather than production equipment?",
    options: [
      { id: "a", text: "Projector screen" },
      { id: "b", text: "Hot bonder" },
      { id: "c", text: "Resin mixing scale" },
      { id: "d", text: "Trimming router" },
    ], correctAnswer: "a", source: "test-2-marking-scheme",
  },

  /* ---- Q6: Training costs ---------------------------------------- */
  {
    id: "t016", type: "multiple-select",
    question: "Which costs should be considered when budgeting for training? Select THREE.",
    options: [
      { id: "a", text: "Rental cost" },
      { id: "b", text: "Food and beverage" },
      { id: "c", text: "Training materials" },
      { id: "d", text: "The company's electricity bill for the whole year" },
      { id: "e", text: "The purchase of a new production line" },
      { id: "f", text: "Shareholder dividends" },
    ], correctAnswer: ["a", "b", "c"], source: "test-2-marking-scheme",
  },
  {
    id: "t017", type: "single-choice",
    question: "Which of these is a training cost that belongs in the training budget?",
    options: [
      { id: "a", text: "Mileage and transportation cost" },
      { id: "b", text: "Warranty claims from customers" },
      { id: "c", text: "Scrap value of rejected parts" },
      { id: "d", text: "Insurance on the delivery van" },
    ], correctAnswer: "a", source: "test-2-marking-scheme",
  },

  /* ---- Q7: Evaluation methods ------------------------------------ */
  {
    id: "t018", type: "multiple-select",
    question: "After a training session, which methods can be used to evaluate its effectiveness? Select THREE.",
    options: [
      { id: "a", text: "Participant feedback form" },
      { id: "b", text: "Observation by the trainer" },
      { id: "c", text: "Exam, quiz or practical assessment" },
      { id: "d", text: "Carrying out a Training Need Analysis" },
      { id: "e", text: "Booking the training venue" },
      { id: "f", text: "Printing the attendance list" },
    ], correctAnswer: ["a", "b", "c"], source: "test-2-marking-scheme",
  },
  {
    id: "t019", type: "single-choice",
    question: "Which activity takes place AFTER the training has been conducted?",
    options: [
      { id: "a", text: "Evaluating the effectiveness of the training" },
      { id: "b", text: "Identifying the gaps in workers' skills" },
      { id: "c", text: "Preparing the training budget" },
      { id: "d", text: "Choosing the delivery mode" },
    ], correctAnswer: "a", source: "test-2-marking-scheme",
  },

  /* ---- Q8: Training documents ------------------------------------ */
  {
    id: "t020", type: "multiple-select",
    question: "Which documents should be prepared during a training session? Select TWO.",
    options: [
      { id: "a", text: "Attendance list" },
      { id: "b", text: "Evaluation form" },
      { id: "c", text: "Purchase order" },
      { id: "d", text: "Bill of materials" },
      { id: "e", text: "Aircraft release certificate" },
    ], correctAnswer: ["a", "b"], source: "test-2-marking-scheme",
  },
  {
    id: "t021", type: "single-choice",
    question: "Why is an attendance list prepared during a training session?",
    options: [
      { id: "a", text: "To record who attended the training" },
      { id: "b", text: "To order the training materials" },
      { id: "c", text: "To calculate the scrap rate" },
      { id: "d", text: "To approve the trainer's qualification" },
    ], correctAnswer: "a", source: "test-2-marking-scheme",
  },

  /* ---- Q9: Importance of evaluation ------------------------------ */
  {
    id: "t022", type: "single-choice",
    question: "Why is it important to evaluate training after it is completed?",
    options: [
      { id: "a", text: "To determine whether the training was effective, improve future programs and confirm that worker performance has improved" },
      { id: "b", text: "To decide how many workers to recruit next year" },
      { id: "c", text: "To set the selling price of the finished composite part" },
      { id: "d", text: "To choose which supplier to buy prepreg from" },
    ], correctAnswer: "a", source: "test-2-marking-scheme",
  },
  {
    id: "t023", type: "single-choice",
    question: "Which is NOT a reason for evaluating training after completion?",
    options: [
      { id: "a", text: "To increase the price charged to the customer" },
      { id: "b", text: "To check whether the training was effective" },
      { id: "c", text: "To improve future training programs" },
      { id: "d", text: "To confirm that employee performance has improved" },
    ], correctAnswer: "a", source: "test-2-marking-scheme",
  },

  /* ---- Putting the cycle together -------------------------------- */
  {
    id: "t024", type: "single-choice",
    question: "Which sequence shows the correct order of the training cycle?",
    options: [
      { id: "a", text: "Training Need Analysis → plan and conduct the training → evaluate effectiveness" },
      { id: "b", text: "Evaluate effectiveness → Training Need Analysis → plan the training" },
      { id: "c", text: "Plan the training → Training Need Analysis → conduct the training" },
      { id: "d", text: "Conduct the training → plan the training → Training Need Analysis" },
    ], correctAnswer: "a", source: "test-2-marking-scheme",
  },
  {
    id: "t025", type: "single-choice",
    question: "A TNA and a post-training evaluation both look at worker performance. What is the difference?",
    options: [
      { id: "a", text: "A TNA identifies the gap before training; the evaluation checks whether training closed it" },
      { id: "b", text: "A TNA is done by the trainer; the evaluation is done by the supplier" },
      { id: "c", text: "A TNA measures cost; the evaluation measures attendance" },
      { id: "d", text: "A TNA is a document; the evaluation is a piece of equipment" },
    ], correctAnswer: "a", source: "test-2-marking-scheme",
  },
];

window.QUIZ_QUESTIONS = QUIZ_QUESTIONS;
