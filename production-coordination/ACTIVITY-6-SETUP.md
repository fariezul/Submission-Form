# Activity 6 — REVISION 1

Open [`activity-6.html`](activity-6.html) to preview the quiz. Each attempt draws 20 of the 23 questions in `quiz6/quiz-questions.js`, including at least two of the five workflow images. Activity 6 has its own scripts, storage keys, and score backend; Activity 4 is unchanged.

## Results backend

The separate [REVISION 1 — Activity 6 Results Google Sheet](https://docs.google.com/spreadsheets/d/1pj8tldvLU3vzZSa2N2WdD8hi_4LV0Y_IIeD5TMnNk0M/edit) has `Attempts` and `Visits` tabs with the required headers. The [REVISION 1 — Activity 6 Apps Script project](https://script.google.com/u/0/home/projects/1L4i18UgzIYPeklw98FEKQ9V4ZXOjF-kce3dILsAIRqtwDXOhYSirjZCd/edit) contains the code and its `setup` function has completed successfully. Its [deployed web app](https://script.google.com/macros/s/AKfycbzuDA9_WgF2CrUS7DJNDBaJwzFDwiTBl-VYb4rsLY_olaT33RV-kWmLz4RLIrtMxvc7Vg/exec?action=ping) is configured in `quiz6/quiz-config.js` and opens only this Sheet by ID.

The web app runs as the owner and is accessible to anyone so students can submit scores. The leaderboard exposes the recorded student name, class, score, and time. To change the script, save its source and create a **new version** under **Deploy → Manage deployments**; the existing deployment URL can stay the same.

For a deployment check, submit one test attempt and confirm a row appears in `Attempts`; refresh the quiz and check its leaderboard. Opening the page should also add a row to `Visits`.

For later script changes, create a **new version** under **Deploy → Manage deployments**. Changing the source alone does not update the live web app.

## Local verification

From the repository root, run:

```powershell
node production-coordination/quiz6/quiz-tests.js
node production-coordination/quiz4/quiz-tests.js
```
