# Zero Defect Rush — setup and maintenance

A revision quiz for **Chapter 3 — Corrective Action and Process
Improvement**, living at:

```
/production-coordination/activity-3.html
```

30 questions · 30 marks · 10 minutes · **30/30 required to pass** ·
unlimited attempts.

Every question comes from `Chapter3_Corrective_Action_Process_C.pptx`
and nothing else.

---

## 1. Installing dependencies

There are none. This is a static site: HTML, CSS and JavaScript,
no build step, no `npm install`, no framework. Double-clicking the
HTML file opens a working quiz.

Node is needed for one optional thing only — running the tests in
section 9.

---

## 2. Configuring Supabase

The quiz writes to the **same Supabase project** the rest of the
site already uses. Its settings live in:

```
production-coordination/quiz/quiz-config.js
```

If you ever move to a different Supabase project, change the two
values in that file:

```js
SUPABASE_URL:      "https://your-project-ref.supabase.co",
SUPABASE_ANON_KEY: "eyJhbGciOi...",
```

Both come from **Supabase dashboard → Project Settings → API Keys**.
Use the **anon / publishable** key.

> **Never put the `service_role` key here.** It ignores every
> security rule and belongs only on a server. The anon key is meant
> to be public — what protects your data is the Row Level Security
> policy, not secrecy about the key.

---

## 3. Running the SQL migration

**This is the one step you must do before results will save.**

1. Supabase dashboard → **SQL Editor** → **New query**
2. Open `supabase/migrations/20260815_quiz_attempts.sql`
3. Paste the whole file in and click **Run**

It is safe to run more than once.

It creates:

| Thing | What it is |
|---|---|
| `quiz_attempts` | one row per finished attempt, pass or fail |
| 3 indexes | one partial index just for the leaderboard |
| RLS policy | the public key may `INSERT` and nothing else |
| `quiz_leaderboard()` | the only way the browser can read anything |

### How to tell it worked

Play the quiz once. On the result screen the small line at the
bottom should read **"Result saved."**

If it says *"Your result could not be saved"*, press **F12** and
look at the Console:

| Console message contains | Meaning | Fix |
|---|---|---|
| `PGRST205` / `Could not find the table` | The migration has not been run | Run section 3 |
| `PGRST202` / `Could not find the function` | Same — the function is in the same file | Run section 3 |
| `row-level security policy` | The insert policy is missing | Re-run the migration |
| `violates check constraint` | A value was out of range — this should not happen; note the constraint name | |
| `Failed to fetch` | No internet, or the project is paused | Check the Supabase dashboard |

---

## 4. Environment variables

**There are none.** See `.env.example` for the full explanation:
a static site has no build step, so there is no point at which a
`NEXT_PUBLIC_*` variable could be substituted into the files. The
settings live in `quiz-config.js` instead, which is the normal
pattern for a static Supabase site.

---

## 5. Running it locally

Simplest — just open the file:

1. Open File Explorer at `D:\CC PLAYGROUND\supabase-form-app`
2. Go into `production-coordination`
3. **Double-click `activity-3.html`**

The address bar will show `file:///D:/...`, which is normal. The
whole quiz works this way, including saving to Supabase.

If you would rather serve it over HTTP (closer to how it behaves
live), any static server will do:

```bash
npx --yes serve . --listen 4173
```

Then open `http://localhost:4173/production-coordination/activity-3.html`.

---

## 6. Building

There is nothing to build. The files you edit are the files that
ship.

---

## 7. Deploying on Vercel

1. Push this folder to its Git repository
2. Vercel → **Add New… → Project** → import the repo
3. **Framework Preset:** `Other`
4. **Build Command:** leave blank
5. **Output Directory:** `.`
6. **Environment Variables:** none — leave the section empty
7. **Deploy**

The quiz is then at:

```
https://www.farizuljaafar.com/production-coordination/activity-3.html
```

Give students that link, or turn it into a QR code. No account, no
login, nothing to install.

---

## 8. Where everything lives

```
supabase-form-app/
├── production-coordination/
│   ├── activity-3.html              the page — six screens in one file
│   ├── quiz/
│   │   ├── quiz-questions.js        THE QUESTION BANK (50 questions)
│   │   ├── quiz-engine.js           shuffling, marking, the clock
│   │   ├── quiz-app.js              screens and game flow
│   │   ├── quiz-audio.js            arcade sound, generated in-browser
│   │   ├── quiz-celebration.js      confetti and fireworks
│   │   ├── quiz-supabase.js         saving and the leaderboard
│   │   ├── quiz-config.js           Supabase URL + anon key
│   │   ├── quiz.css                 the arcade theme
│   │   └── quiz-tests.js            the checks (section 9)
│   └── quiz-images/                 4 diagrams taken from the slides
└── supabase/migrations/
    └── 20260815_quiz_attempts.sql   the database setup
```

**Question bank:** `production-coordination/quiz/quiz-questions.js`
**Quiz images:** `production-coordination/quiz-images/`

### Why the bank is 50 and not larger

It started at 224. In August 2026 it was cut to the 50 questions
that test a **concept** — what a tool is for, what a step means,
how a sequence runs. Everything that only tested recall of a
worked example from a slide was removed: the 145 °C die
temperature, the Pareto activity's defect counts, the Check Sheet
tallies, the 14 July night shift, the resin trolley. Those
illustrate the ideas well in a lecture, but knowing the number is
not knowing the topic.

The trade-off is variety. 30 questions are drawn from 50, so
roughly 60% of a paper repeats on the next attempt and a student
who retries three or four times will have seen all of them. If
that becomes a problem, add more **concept** questions rather than
restoring the example ones. The removed questions are all in git
history if any is ever wanted back.

### Checking a question against your slides

Every question carries a developer-only `sourceSlide` number. It is
never shown to students — it is there so you can verify the quiz
against your teaching material:

```js
{
  id: "q105",
  question: "In the PDCA in Action example, the die temperature was fixed at what value for one shift?",
  correctAnswer: "a",
  sourceSlide: 25,          // <- open slide 25 to check this
}
```

**The first option listed is always the correct one.** That makes
the bank quick to proofread. Students never see that order: the
engine shuffles the options on every question of every attempt, and
the correct answer is tracked by a stable `id`, never by position.

---

## 9. Running the tests

```bash
node production-coordination/quiz/quiz-tests.js
```

58 checks, no framework needed. They cover the things that would
fail silently and do real damage:

- exactly 30 questions per attempt, never a repeat
- shuffling never changes which answer is correct
- a score can never exceed 30, and only 30/30 counts as completed
- the clock reads a full 10:00 until START, and expires at exactly 600 s
- the limit in `quiz-engine.js`, the wording on the page and the SQL
  duration constraint all still agree with each other
- unanswered questions do not score
- a retry keeps the session id, increments the attempt number and
  serves a different paper
- the row sent to Supabase never contains the answer key
- every image question points at a file that exists

They do **not** talk to Supabase — that needs the live project, so
the database is verified by hand once, using section 3.

---

## 10. Replacing the PowerPoint and regenerating the bank

There is no AI running inside this app and no API key anywhere.
The questions were written once, during development, and are now
plain data. Regenerating them is a manual job you do with Claude
Code:

1. Put the new `.pptx` somewhere you can point at.

2. Open Claude Code in `D:\CC PLAYGROUND` and give it roughly this:

   > Read `<path to the new .pptx>`. It is the ONLY source for the
   > questions — do not add anything from the internet or from your
   > own knowledge. Rewrite
   > `production-coordination/quiz/quiz-questions.js` in the same
   > format as the current file: same question object shape, a
   > `sourceSlide` on every question, the correct option listed
   > first, and a mixture of `single-choice`, `true-false`,
   > `multiple-select`, `image-choice` and `sequence-choice`. Keep
   > the per-type pools deep enough for the quotas in
   > `quiz-engine.js`. Extract any diagrams worth asking about into
   > `production-coordination/quiz-images/`. Ask about CONCEPTS
   > only — what a tool is for, what a step means, how a sequence
   > runs — and do not write questions that merely test recall of
   > a worked example's numbers. Then run
   > `node production-coordination/quiz/quiz-tests.js` and fix
   > anything that fails.

3. Check the tests pass, then spot-check a few questions against
   the slides using their `sourceSlide` numbers.

**Keep the ids unique.** If you rewrite the bank, old rows in
`quiz_attempts` will still refer to the old ids — that is fine for
history, but do not reuse an id for a different question or the
records will disagree with each other.

### Adjusting the mixture without touching the bank

`quiz-engine.js` decides how many of each type appear per attempt:

```js
const TYPE_QUOTAS = {
  "image-choice":    3,
  "true-false":      4,
  "sequence-choice": 2,
  "multiple-select": 2,
};
```

The remaining 19 are drawn at random from whatever is left. Raise a
number and you get more of that type — as long as the bank has
enough of them, which `quiz-tests.js` checks.

### Changing the time limit

It went from 5 to 10 minutes in August 2026 because students were
running out of time before question 30. The limit lives in **four**
places, and they must agree:

| Where | What to change |
|---|---|
| `quiz/quiz-engine.js` | `TIME_LIMIT_MS` — the value actually enforced |
| `activity-3.html` | the `10:00` rule tile, the briefing warning, and the starting value of `#timerValue` |
| `supabase/migrations/…sql` | the `duration_seconds` cap — must sit **above** the limit, or a full timeout gets rejected |
| `quiz/quiz-tests.js` | the clock expectations |

`quiz-tests.js` guards the two couplings that are easy to miss: it
fails if the SQL cap is not above the limit, and if the page shows
a different time from the one the engine enforces.

**If the table already exists in Supabase**, editing the migration
file is not enough — `create table if not exists` skips an existing
table. Re-run the whole migration; section 2b drops and re-adds the
duration constraint so an existing table is brought up to date.

---

## 11. Reading the results

The public key cannot read the table, and neither can you from the
browser. Use the **SQL Editor**, which runs as the owner. There are
ready-made queries at the bottom of the migration file, including:

- the full leaderboard: `select * from public.quiz_leaderboard(50);`
- every attempt by one student
- **which questions are most often answered wrongly** — the useful
  one: it tells you what to re-teach

---

## 12. Design notes

A few decisions worth knowing before you change anything.

**A wrong answer never reveals the right one.** No highlight, no
explanation, no hint, on the question or on the result screen. It is
the point of the activity: if a student does not know something,
the way forward is the slides.

**30/30 or nothing.** 29/30 is NOT COMPLETED. The database enforces
this too — a check constraint requires `completed = (score = 30)`,
so a crafted request cannot claim a pass with a low score and land
on the leaderboard.

**The clock cannot be cheated by a background tab.** It stores the
moment it started and subtracts from the real wall clock; the
on-screen ticker is only a display.

**No resume.** Refreshing or closing the tab abandons the attempt,
deliberately. Nothing about a live attempt is written to
localStorage.

**Sound is synthesised, not recorded.** Every effect is generated
with the Web Audio API, so there are no audio files, no licensing
question, and nothing extra to download. It is fully playable
muted.

The background music is a four-bar game-show loop at 128 BPM —
kick on 1 and 3, snare backbeat on 2 and 4, off-beat hats, a
driving bass and a syncopated arpeggio over Am–F–C–G, with a fill
on the last bar. It is sequenced with **lookahead scheduling**:
notes are booked onto the audio clock a quarter-second ahead at
exact times, because `setInterval` on its own is far too imprecise
for music and the beat would stumble every time the browser got
busy. To change the groove, edit the step lists near the top of the
music section in `quiz-audio.js` — each part is just a list of
which sixteenths it plays on.

**Speed never affects the mark.** It is only the tie-break for
ranking students who already scored 30/30.
