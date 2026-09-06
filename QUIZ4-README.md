# Zero Waste Sprint — setup and maintenance

Activity 4, at `production-coordination/activity-4.html`.

A 20-question revision quiz on the **Lean half of Chapter 3** —
slides 36 to 56 of `Chapter3_Corrective_Action_Process_ .pptx`.
Activity 3 (*Zero Defect Rush*) covers slides 1 to 36. The two meet
at slide 36 and do not otherwise overlap.

Same shape as Activity 3 but a shorter paper: 20 questions drawn from
a bank of 47, one mark each, 20 minutes, **20 / 20 is the only pass**,
unlimited attempts, name and class only — no account and no password.

**The one real difference: results go to a Google Sheet, not
Supabase.** A free Supabase project pauses after about a week of
quiet, and Activity 3 hit exactly that — the project went to sleep
and every save failed until it was restored by hand. A Google Sheet
never sleeps, needs no keep-warm job, and you can open the data
directly instead of writing SQL.

---

## 1. Setting up the Google Sheet

About five minutes, once.

1. Create a new Google Sheet. Name it whatever you like.
2. **Extensions → Apps Script**.
3. Delete whatever is in `Code.gs` and paste in the whole of
   `google-apps-script/activity-4-Code.gs`.
4. Save.
5. **Run → choose `setup` → Run.** Approve the permission prompt.
   This creates the `Attempts` and `Visits` tabs with their headings.
6. **Deploy → New deployment → gear icon → Web app**, with:

   | Field | Value |
   | --- | --- |
   | Description | Zero Waste Sprint |
   | Execute as | Me |
   | Who has access | **Anyone** |

   `Anyone` is required. Students are not signed in to Google, so
   anything narrower rejects every save.

7. Deploy, approve, then **copy the Web App URL**. It looks like
   `https://script.google.com/macros/s/AKfycb..../exec`.
8. Paste it into `production-coordination/quiz4/quiz-config.js` as
   `SCRIPT_URL`.

### If you ever edit the Apps Script

**You must redeploy.** Deploy → Manage deployments → edit (pencil)
→ Version: **New version** → Deploy.

Without that, the quiz keeps talking to the old code and your edit
does nothing. This catches everybody once. It is also why
`quiz-tests.js` can only tell you the *file* is right — it cannot
tell you what is deployed. Only a real attempt does that.

---

## 2. Is it safe to publish the URL and token?

Both sit in a file the browser downloads, so anyone who views source
can read them. That is the same situation as the Supabase anon key on
Activity 3, and equally deliberate.

What protects the data is what the script is *willing to do*: append
a row, or return a leaderboard and a scoreboard. It cannot reach your
other sheets, and **nothing in it deletes anything**.

- `SHARED_TOKEN` is checked on writes. It is in the page too, so it is
  a speed bump against drive-by junk, not a secret. If the sheet ever
  fills with nonsense, change it in **both** `activity-4-Code.gs` and
  `quiz-config.js`, then redeploy.
- The reads return **scores only**. `readAttempts()` takes columns 1
  to 11 and stops; `question_set` and `responses` are columns 12 and
  13 and never leave the sheet. A test enforces that range.

---

## 3. Running it locally

No build step and nothing to install — the site is plain HTML, CSS
and JavaScript.

Serve the folder over HTTP (opening the file directly with `file://`
breaks the module loading):

```bash
npx --yes http-server supabase-form-app -p 8123 -c-1
```

Then open `http://localhost:8123/production-coordination/activity-4.html`.

With `SCRIPT_URL` still on its placeholder the quiz plays perfectly
and tells the student honestly that the result could not be saved.
That is the designed behaviour, not a bug — it is verified by the
test *"an unconfigured sheet fails honestly rather than pretending"*.

---

## 4. Where everything lives

```
production-coordination/
  activity-4.html            the page: six screens, one visible at a time
  quiz4-images/              the one image the bank uses (slide 37)
  quiz4/
    quiz-config.js           SCRIPT_URL, SHARED_TOKEN, list sizes
    quiz-sheets.js           talks to the Apps Script  <- the only file
                             that differs from Activity 3's logic
    quiz-visits.js           counts who opened the page
    quiz-questions.js        the 47-question bank, slides 36-56
    quiz-engine.js           picking, shuffling, marking, the clock
    quiz-audio.js            all sound, synthesised — no audio files
    quiz-celebration.js      confetti and fireworks on canvas
    quiz-app.js              drives the screens
    quiz.css                 the arcade layer, teal and orange
    quiz-tests.js            93 checks, run under Node

google-apps-script/
  activity-4-Code.gs         the backend: setup, doPost, doGet
```

### Why `quiz4/` is a copy, not a shared folder

Two hundred students may be sitting Activity 3 on the day Activity 4
is edited. A shared folder means one mistake breaks both. The
duplication is the price of that isolation.

The copy is close to exact. `quiz-app.js` is byte-for-byte Activity
3's except for the image path and a log label, because
`quiz-sheets.js` deliberately exposes **the same functions on
`window.QuizDatabase`** that `quiz-supabase.js` did. Swapping
Supabase for Google Sheets meant replacing exactly one file.

---

## 5. The two CORS tricks, and why you must not "fix" them

Apps Script cannot answer a CORS preflight. Two consequences shape
`quiz-sheets.js`, and neither is optional:

1. **Writes post with `Content-Type: text/plain`.** That keeps the
   request "simple" in the browser's eyes, so no preflight is sent.
   The body is still JSON — the script parses it itself. Changing
   this to `application/json` looks like a tidy-up and silently
   breaks every save on the site.

2. **Reads go through JSONP**, a `<script>` tag rather than `fetch`.
   Apps Script answers a GET happily, but the redirect it issues to
   `googleusercontent.com` does not reliably carry CORS headers back,
   so `fetch` can watch the request succeed and still be refused
   permission to read it. A script tag has no such rule.

Both are covered by tests, so an accidental "cleanup" fails loudly
here instead of quietly in front of a class.

---

## 6. Running the tests

```bash
node production-coordination/quiz4/quiz-tests.js
```

93 checks, no framework, nothing to install. They cover the pure
logic (shuffling, marking, the clock), the shape of the question
bank, the contract on both sides of the Google Sheets call, and the
agreement between `activity-4.html` and `quiz-app.js`.

That last group exists because Activity 3 once shipped with an
element the JavaScript looked up and the HTML did not contain. The
quiz froze on question one. Nothing failed at load; the page was
simply missing a `div`. The test *"every element quiz-app.js looks up
exists in the HTML"* is there so it cannot happen twice.

Activity 3's own suite still runs separately and is unaffected:

```bash
node production-coordination/quiz/quiz-tests.js
```

---

## 7. Reading the results

Open the Sheet. Two tabs:

- **Attempts** — one row per finished attempt, newest at the bottom.
  `completed` is `TRUE` only for a genuine 20 / 20; the script
  recomputes it from the score rather than trusting the page, so it
  cannot be faked from the browser.
- **Visits** — one row per person who opened the page, with a
  timestamp and `phone` / `desktop`. Nothing identifying: no IP, no
  user agent, no location, no cookie, no fingerprint. One visit per
  tab session, so refreshing five times is still one visit.

The leaderboard the students see is the fastest **perfect** scores,
one row per student — their best time — so one quick student cannot
fill every place.

---

## 8. Changing the paper size or the time limit

Both live in `quiz4/quiz-engine.js`, as `QUESTIONS_PER_ATTEMPT` (20)
and `TIME_LIMIT_MS` (20 minutes) — a minute a question, the same pace
Activity 3 settled on at 25 minutes for 30.

Fewer questions per attempt also makes attempts *less* alike, not
more: 20 drawn from 50 repeats about 8 of your 20 next time, where 30
drawn from 50 repeated about 19.

If you change either, these move with it, and the tests fail if any
is missed:

- the wording on `activity-4.html` — the rule tiles (questions,
  marks, minutes), the briefing warning, the timer's starting value,
  the question counter, and the score lines on both result screens
- the duration clamp in `activity-4-Code.gs` (currently 3600 s, so
  there is room to grow without touching it)

The tests themselves read both numbers out of the engine, so they do
**not** need editing — they were literal `30`s until the paper went
to 20, at which point eight of them failed for quoting the old figure
rather than for finding anything wrong. A test you have to edit every
time a setting changes is a test that will one day be edited to match
a mistake.

Note what is **not** on that list. Activity 3 also had a
`duration_seconds` constraint living on the live database, which
twice stayed behind when the file changed and quietly rejected the
longest attempts. There is no second copy here: the Apps Script *is*
the deployed code. The redeploy step in section 1 is the equivalent
trap, and the only one.

---

## 9. Changing the questions

The bank is `quiz4/quiz-questions.js` — 47 questions, every one
carrying the `sourceSlide` it came from.

Two rules hold it together:

- **Slides 36 to 56 only.** A test enforces it. A question that
  drifts below 36 duplicates Activity 3 and asks students to revise
  material this activity never told them to open.
- **Concepts, not illustrations.** The bank was drafted at 75, cut to
  50, then to 47. What went: the eight shop-floor *examples* of the
  wastes, duplicate questions answerable from the same single
  sentence, slogans with nothing to test, and all of slide 53 — it
  recaps 4W1H, check sheets, Pareto, Fishbone and CAPA, which
  Activity 3 already examines.

### The gap at w046

Ids run `w001`–`w045` and then `w049`–`w050`. Nothing is missing: the
three slide-53 questions were `w046`–`w048`, and the ones after them
were **not** renumbered to close the gap.

That is deliberate. Every attempt writes its `question_set` — the list
of ids on that paper — into the Sheet. Reusing `w046` for a different
question would silently change what an already-saved row means. Ids
are cheap; stored data that quietly lies is not. **New questions take
new ids from `w051` up.**

The first option of every question is the correct one, which makes
the bank quick to proofread. Students never see that order: the
engine shuffles options on every question of every attempt and tracks
the answer by a stable id, never by position.

If you change the type mix, mind the pools. `image-choice` is 1 here,
not Activity 3's 3, because slides 36-56 contain exactly one picture
carrying a testable idea. Drop a pool below its quota and the attempt
is still 20 questions — the engine tops up from the rest of the bank
— but the promised mixture quietly stops happening. A test compares
the quotas against the real pool sizes for that reason.
