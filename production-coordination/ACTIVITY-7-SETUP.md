# Activity 7 — REVISION 2

Open [`activity-7.html`](activity-7.html) to preview the quiz. Each attempt draws 20 of the 25 questions in `quiz7/quiz-questions.js`, always including at least two of the five training-planning diagram questions. Activity 7 has its own scripts, storage keys, and score backend; Activities 4 and 6 are unchanged.

## Where the questions come from

The bank is written from the **Test 2** paper and its answer scheme:

- `TEST 2 IMC 10007 COORDINATION .docx`
- `MARKING SCHEME TEST 2 IMC 10007 COORDINATION .docx`

| Test 2 question | Bank IDs |
| --- | --- |
| Q1 — Definition of TNA | `t001`–`t003` |
| Q2 — Six KNOW items for Hand Lay-Up | `t004`–`t006` |
| Q3 — The figure: what is X, what is Z | `t007`–`t011` |
| Q4 — Factors in planning a training program | `t012`, `t013` |
| Q5 — Audio-visual equipment | `t014`, `t015` |
| Q6 — Training costs for budgeting | `t016`, `t017` |
| Q7 — Post-training evaluation methods | `t018`, `t019` |
| Q8 — Documents prepared during training | `t020`, `t021` |
| Q9 — Importance of evaluating training | `t022`, `t023` |
| Whole cycle | `t024`, `t025` |

The figure in `quiz7-images/training-plan.jpg` is the one printed in the paper, used as-is. All five diagram questions share it: two ask for X and Z as the paper does, and three read the order of the other stages.

Where the paper awards marks for "any 5" or "any 3", the quiz uses a multiple-select question whose answer count matches the marks — five correct options out of eight for Q4, three out of six for Q6, and so on. `quiz7/quiz-tests.js` checks those counts, so they cannot drift from the scheme.

**One discrepancy to be aware of:** the paper's cover says `IMC 10063` and the marking scheme's cover says `IMC 10007`, and the scheme is dated January–June 2026 while the paper is dated July–December 2026. The quiz page shows `IQA 10063`, matching Activity 6 and the course folder. Correct the source documents if that is wrong.

## Results backend

Connected and verified on 23 October 2026.

| | |
| --- | --- |
| Sheet | [REVISION 2 — Activity 7 Results](https://docs.google.com/spreadsheets/d/1CHz2RCAxhMkhMYYaFquMFojbNEWYzCqCsKz65Vfi4og/edit) — `Attempts` and `Visits`, created by `setup()` |
| Apps Script | **REVISION 2 Activity 7**, bound to that Sheet |
| Deployment | Version 1, "REVISION 2 Activity 7", Execute as **Me**, access **Anyone** |
| Web App URL | in `SCRIPT_URL` in [`quiz7/quiz-config.js`](quiz7/quiz-config.js) |

All of it is separate from Activity 6: its own Sheet, its own script project, its own deployment. Neither can write into the other's data.

An end-to-end check passed — a 20/20 attempt from the page showed "Result saved.", the row appeared in `Attempts`, and both `recent` and `leaderboard` read it back. That attempt was recorded as **Connection Test / TEST**; delete that row from `Attempts` when you want a clean leaderboard.

The web app runs as the owner and is accessible to anyone so students can submit scores. The leaderboard exposes the recorded student name, class, score, and time.

For a deployment check, submit one test attempt and confirm a row appears in `Attempts`; refresh the quiz and check its leaderboard. Opening the page should also add a row to `Visits`.

For later script changes, create a **new version** under **Deploy → Manage deployments**. Changing the source alone does not update the live web app.

## Local verification

From the repository root, run:

```powershell
node production-coordination/quiz7/quiz-tests.js
node production-coordination/quiz6/quiz-tests.js
node production-coordination/quiz4/quiz-tests.js
```
