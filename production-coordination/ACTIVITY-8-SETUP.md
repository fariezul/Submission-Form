# Activity 8 — REVISION IQA 10067

Open [`activity-8.html`](activity-8.html) to preview the paper. Activity 8 has its own scripts, storage keys, and score backend; Activities 4, 6 and 7 are unchanged.

## What makes this one different

Activities 4, 6 and 7 are randomised challenges. Activity 8 is a **fixed examination paper**, and the engine was changed to match:

| | Activities 4 / 6 / 7 | Activity 8 |
| --- | --- | --- |
| Questions per attempt | a random draw | the **first 30** of the bank, in bank order |
| Question order | shuffled | fixed, the same for everyone |
| Answer choices | shuffled every attempt | fixed, but **rotated** — see below |
| Time limit | 20 minutes | **none** — the clock counts up |
| Bank size | 23 / 25 | **40** (30 on the paper, 10 spare) |

Because nothing is shuffled, "option C" means the same thing to every student, so a lecturer can go through the paper with the class question by question afterwards. `quiz8/quiz-tests.js` runs the selection 25 times and asserts the paper and the answer-choice order come back identical every time — if anyone reintroduces a shuffle, the tests fail.

### Why the answer choices are rotated

The bank is written with **the correct answer first**, which is what makes it checkable against the marking scheme by eye. Combined with no shuffling, that had an obvious consequence: the right answer landed in slot A on all 21 single-choice questions, and pressing A thirty times scored 30 / 30.

So the engine rotates each question's options by a fixed amount derived from the question's own id. That is not randomisation — the offset is the same for every student, on every attempt, forever, so the paper stays fixed and reviewable. It only moves the answer off slot A: it now sits in slot A on 6 of the 30, and always-A scores 4 / 30.

Rotation preserves every option and its id, so the answer key is untouched. The tests assert the option set and all the option texts survive the rotation unchanged, that the answer appears in at least three different slots, that it is in slot A on no more than half the paper, and that always choosing the first option cannot pass.

The clock still runs, counting up, because the leaderboard ranks perfect scores by time. It can never end an attempt: `TIME_LIMIT_MS` is `Infinity`, so `hasExpired()` is always false. A duration is still clamped to 3600 seconds before it is sent, because that is the ceiling the Apps Script accepts — a student who leaves the tab open all afternoon is recorded at one hour rather than having the row rejected.

## Where the questions come from

The bank is written from the **July–December 2026 Final Examination, SET 1**, and its marking scheme:

- `QUESTION_IQA10063_SET1_JULYDEC_2026.docx`
- `ANSWER_IQA10063_SET1_JULYDEC_2026.docx`

| Final Exam question | Bank IDs |
| --- | --- |
| Q1 — coordination and the composite workflow | `f001`–`f006` |
| Q2 — Ishikawa 6M and the seven QC tools | `f007`–`f012` |
| Q3 — KAIZEN and the eight wastes (Muda) | `f013`–`f017` |
| Q4 — the five skill levels (Diagram 1) | `f018`–`f022` |
| Q5 — the CTRM training procedure (Diagram 2) | `f023`–`f026` |
| Q6 — training aids, costs and documents | `f027`–`f030` |
| Spare pool | `f031`–`f040` |

Both diagrams are the ones printed in the paper, used as-is: `quiz8-images/skill-levels.png` is Diagram 1 and `quiz8-images/training-procedure.jpg` is Diagram 2.

### Changing the paper

To bring a spare question in, move it above the thirtieth entry in `quiz8/quiz-questions.js`. The thirty that end up first become the paper. Keep the IDs as they are — saved attempt rows refer to them. The tests assert that all six examination questions are still represented and that both diagrams still appear, so a careless reordering that drops a topic will fail rather than ship.

### Two things found in the source documents

1. **Set 2's answer document does not match its own question paper.** The Set 2 paper asks for MURA & MURI (Q3a) and a CAPA corrective/preventive action (Q2c), but `ANSWER_IQA10063_SET2_JULYDEC_2026.docx` still answers KAIZEN and has no CAPA section — it looks like an earlier revision that was not updated. Activity 8 is therefore built entirely from Set 1, whose paper and scheme agree with each other. Worth fixing in the source before Set 2 is used.
2. **The course code is inconsistent across the documents.** The folder is `FINAL IQA10067`, but both papers and both schemes say `IQA10063` on the cover, and the Test 2 documents say `IMC 10063` and `IMC 10007`. The activity is titled **REVISION IQA 10067** as requested, and the page's institution block shows `IQA 10063` to match Activities 6 and 7.

## Results backend — not connected yet

Activity 8 has **no Sheet and no deployment**. Until it does, the paper plays in full and tells the student honestly that the result could not be saved; the leaderboard and class scoreboard report that they could not be loaded.

`SCRIPT_URL` and `SPREADSHEET_ID` are deliberately placeholders — Activity 8 must not write into Activity 6's or Activity 7's Sheet, and `quiz8/quiz-tests.js` asserts that neither of their IDs appears here.

To connect it:

1. Create a **new** Google Sheet, "REVISION IQA 10067 - Activity 8 Results", and put its ID into `SPREADSHEET_ID` in [`../google-apps-script/activity-8-Code.gs`](../google-apps-script/activity-8-Code.gs).
2. Open that Sheet → **Extensions → Apps Script**, paste the file in, Save.
3. **Run → setup**, approve the permission prompt. The `Attempts` and `Visits` tabs appear.
4. **Deploy → New deployment → Web app**, Execute as **Me**, access **Anyone**. Copy the Web App URL.
5. Paste it into `SCRIPT_URL` in [`quiz8/quiz-config.js`](quiz8/quiz-config.js), replacing `PASTE_YOUR_ACTIVITY_8_WEB_APP_URL`.

`SHARED_TOKEN` is already `rev8-2026-iqa10063` on both sides. Leave them matching.

For later script changes, create a **new version** under **Deploy → Manage deployments**. Changing the source alone does not update the live web app.

## Local verification

From the repository root, run:

```powershell
node production-coordination/quiz8/quiz-tests.js
node production-coordination/quiz7/quiz-tests.js
node production-coordination/quiz6/quiz-tests.js
node production-coordination/quiz4/quiz-tests.js
```
