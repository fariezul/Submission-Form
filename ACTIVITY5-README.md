# Flight Line — setup and running notes

Activity 5, at `production-coordination/activity-5.html`.

A **live paper aeroplane production line**. Four students, four
stations, twenty aircraft, one clock that never stops. The class runs
it, watches it go wrong, works out why, changes one thing, and runs it
again — and the app turns their taps into the lean-manufacturing
numbers that show whether the change actually worked.

It is the practical companion to the Lean half of Chapter 3, which
Activity 4 examines on paper. Where *Zero Waste Sprint* asks them to
recall what a bottleneck is, this makes them stand in one.

---

## 1. The activity itself

Four students sit in a row, in flow order:

| Station | Job |
| --- | --- |
| **A · Marking** | Rule the fold lines on a sheet of A4 |
| **B · Folding** | Fold the aeroplane |
| **C · Labelling** | Write the flight number on the wing |
| **D · Quality Check** | Inspect it, and pass or reject |

A stack of blank A4 sits beside Marking. The first sheet enters at
0:00 and **the clock never stops** until the twentieth aeroplane leaves
Quality Check.

### The one rule

> **Tap your button the instant you finish an aeroplane.**
> Not when you hand it over. Not when you pick the next one up.

That single moment is three things at once: you finished this one, you
start your next one, and the station after you starts on this one.
Everything the app computes rests on that, so it is worth saying twice
before you begin.

### Do not tell them to balance the line

The pile of aeroplanes stacking up in front of Folding, and the
boredom at Quality Check, are the lesson. Let the first round be as bad
as it wants to be. The discussion afterwards is the activity; the
folding is just how you get the data.

---

## 2. Two ways to run it

### Solo mode — no setup at all

One time-taker sits at the dashboard and presses all four buttons
(mouse, or keys <kbd>1</kbd>–<kbd>4</kbd>). Nothing to configure, no
phones, no internet, nothing to desync.

**Every chart and every number is identical to team mode.** The only
thing you give up is the students holding their own phones. For a first
run, a small class, or a room with unreliable wifi, this is the better
choice — and it is the honest fallback if anything goes wrong mid-lesson.

### Team mode — four phones

Each student opens their own station page and taps their own button.
This needs the Google Sheet connected (section 3). It is more like a
real line, and the students feel the waiting rather than watching
someone else record it.

Once deployed, the four pages are:

```
farizuljaafar.com/line/a     Marking
farizuljaafar.com/line/b     Folding
farizuljaafar.com/line/c     Labelling
farizuljaafar.com/line/d     Quality Check
```

Those short paths are **redirects** in `vercel.json` — deliberately
not rewrites. The station pages load their scripts by relative path,
and a rewrite serves the page at the short address without moving the
browser, so every script 404s while the tab title still looks right.
The tests fail if one is ever changed back. If you move the site
somewhere without them, the real files are at
`production-coordination/line5/station-a.html` and so on — the
dashboard shows whichever form actually works from where it is being
served, so read the links off the setup screen rather than off this
page.

Each phone remembers its line code, so a student types it once and a
refresh does not send them back to the start.

---

## 3. Setting up the Google Sheet

**Skip this entirely if you are using solo mode.** The activity works
completely without it.

About five minutes, once.

1. Create a **new** Google Sheet. Not the Activity 4 one — this script
   creates its own tabs and the two should not share.
2. **Extensions → Apps Script**.
3. Delete whatever is in `Code.gs` and paste in the whole of
   `google-apps-script/activity-5-Code.gs`.
4. Save.
5. **Run → choose `setup` → Run.** Approve the permission prompt. This
   creates the `Rounds`, `Events` and `Visits` tabs with their headings.
6. **Deploy → New deployment → gear icon → Web app**, with:

   | Field | Value |
   | --- | --- |
   | Description | Flight Line |
   | Execute as | Me |
   | Who has access | **Anyone** |

   It must be **Anyone**. "Anyone with a Google account" makes every
   student sign in, and a class of seventeen-year-olds signing into
   Google on the school wifi is how you lose the lesson.

7. Deploy, approve, and copy the Web App URL. It looks like
   `https://script.google.com/macros/s/AKfycb..../exec`.
8. Paste it into `production-coordination/line5/line-config.js` as
   `SCRIPT_URL`.

### If you ever edit the Apps Script

You **must redeploy**: Deploy → Manage deployments → pencil → Version:
**New version** → Deploy. Otherwise the activity keeps talking to the
old code. This catches everybody once.

### Checking it worked

Open the dashboard. If team mode is still greyed out, `SCRIPT_URL` is
not saved. If it is available, start a round and open one station page
— it should switch from "waiting for the teacher" to the button within
about twenty seconds.

---

## 4. Running a lesson

1. **Set up the room.** Four students in flow order, A4 beside Marking,
   dashboard on the projector or LCD.
2. **Start a round** on the dashboard. Give it a line code (`DTP3A`), a
   number of aeroplanes (20), and how long the customer will wait (30
   minutes — this sets takt time).
3. Press **Display mode** to strip the site chrome away and blow
   everything up for the television.
4. **Run it.** Watch the flow chart fill in. The gaps in it are the
   waiting, drawn to scale, and they are usually the first thing a
   student points at without being asked.
5. **End round**, then go to **Analysis**.
6. **Ask them to guess the bottleneck before you show it.** Then ask
   the student who waited longest how it felt, and show them their
   waiting time in minutes.
7. **Improve tab.** Write down one change. One, not two — with two
   changes nobody can say which one worked.
8. **New round**, run twenty more, then **Compare rounds**.

Budget roughly 20 minutes per round plus 15 for the discussion.

---

## 5. What it measures, and how

Every figure comes from one tap per station per aeroplane. Nobody
records when a station *starts* — that is derived, and the derivation
is the whole trick:

```
start = max( my previous finish , upstream's finish )
```

A station can only begin when it is free **and** the aeroplane has
arrived. Whichever of those happened later is the start. Which
separates the two kinds of lost time:

- **The upstream finish was later** → the station sat with nothing to
  do. That is **starving**, and it is reported as *"waiting for the next
  plane to arrive"*.
- **My own previous finish was later** → the aeroplane sat in a pile.
  That is **queuing**.

Exactly one of those can be happening at any handover, never both.
They are the same gap told from two sides — the student's and the
aeroplane's.

| Figure | What it means |
| --- | --- |
| **Average cycle time** | How long a station takes per aeroplane. The bottleneck is simply the largest. |
| **Line cycle time** | The gap between finished aeroplanes leaving. On real data this comes out almost exactly equal to the bottleneck's cycle time — which is the punchline of the whole activity. |
| **Lead time** | From Marking picking a sheet up to Quality Check finishing it. |
| **Process Cycle Efficiency** † | Of that lead time, how much was somebody actually working. Classes are routinely shocked; 20–30% is normal for a first round. |
| **Waiting for work** | Per station and for the whole team, in minutes. |
| **Line balance** | 100% would mean every station takes the same time and nobody waits. |
| **Work in progress** | How many aeroplanes were stuck in the line, moment by moment. Cross-checked against Little's Law † (WIP = throughput × lead time), which agrees to two decimal places on real data. |
| **Takt time** | How often the customer needs one. Any station above it cannot keep up however hard it tries. |
| **First Pass Yield** | Share passing inspection first time, plus a Pareto of which station caused the faults and how much effort the rejects consumed. |
| **Theoretical minimum** | What the same people at the same speeds would have achieved with no variation and no gaps. The gap to actual is the size of the prize. |

The **Analysis** tab also writes all of this out in plain sentences, so
a student who cannot yet read a chart still gets the point. Those
sentences say the plain thing first and give the proper term second —
"the slowest station has a name in this subject: the bottleneck" — so
the vocabulary is still taught without standing in the way of it.

**† Two names the students never see.** *Process cycle efficiency* and
*Little's Law* are computed, exported and tested, and you can read them
off the analysis — but they are deliberately not printed on screen,
because they are not on a first-semester syllabus and a formula at the
end of a paragraph turns a plain explanation back into homework. The
ideas behind both are still explained in full, just unnamed. Tests fail
if either name reappears in front of a class.

### What it cannot see

The model assumes a station picks the next aeroplane up the moment it
can. If a student finishes, chats for twenty seconds and then starts,
those twenty seconds are counted as *process* time on the next
aeroplane rather than idle time. Say so to the class — it is a fair
question, and "sometimes the answer really is the chatting" is a
better response than pretending the data is perfect.

---

## 6. When something goes wrong

| Problem | What happens | What to do |
| --- | --- | --- |
| A phone loses wifi | Nothing is lost. Taps are stamped and stored on the phone, and upload themselves when it reconnects. The bottom of the station page shows how many are waiting. | Keep tapping. |
| A student misses a tap | The analysis reports the gap and leaves that aeroplane out of the averages rather than distorting them. | **Data** tab → click the neighbouring times to correct them. |
| A student taps twice | Anything under 0.9s is swallowed as a bounce. Anything under 2s asks "are you sure?". | If one got through: **Undo last** on the phone, or fix it on the Data tab. |
| A time is plainly wrong | Readings that cannot be true — an aeroplane leaving Folding before Marking finished it — are flagged and excluded, never averaged. | **Data** tab → click the time → type the right one. Corrections are recorded *as* corrections; nothing is silently overwritten. |
| A phone's clock is out | Every device measures itself against the Apps Script's clock and corrects every reading. A phone more than 30s out is flagged on screen. | Fix that phone's date & time in Settings. |
| The wifi dies completely | — | Switch to solo mode and carry on. You lose nothing but the phones. |
| A phone locks itself | Where the browser allows it the screen is held awake. **iOS Safari does not allow it** and the page says so. | Set that phone's auto-lock to Never before you start. |

---

## 7. Changing things

Everything adjustable is in `production-coordination/line5/line-config.js`,
and you should not need to open any other file:

- **Station names, colours and count.** Three to six stations work.
  Add a fifth and the buttons, the charts and the reject-cause list all
  follow — but you will need a `station-e.html`, copied from
  `station-d.html` with `FLIGHT_STATION` changed.
- **How many aeroplanes** (`ITEM_COUNT`).
- **The customer's deadline** (`DEMAND_MINUTES`), which sets takt time.
  Set it to `null` to hide the target rather than invent one.
- **Poll intervals.** These are a real trade-off, not a preference — a
  Google account gets limited Apps Script running time per day, and
  every poll spends a little. The defaults cost roughly 500 requests
  for a 30-minute round.

Station colours run blue → indigo → purple → pink, and each is dark
enough to read as text on the white page as well as to fill a chart bar.
**Red, amber and green mean rejected, waiting and good**, and a station
painted in one of them would make a chart ambiguous at exactly the
moment it matters. The tests fail if you use one.

---

## 8. The files

```
production-coordination/
  activity-5.html              the dashboard — this is the page in the nav
  line5/
    station-a.html  …  -d.html four station pages, identical but for one number
    line-config.js             every setting
    line-clock.js              making five devices agree what time it is
    line-analytics.js          all the lean maths, and nothing else
    line-sheets.js             the Google Sheets client
    line-store.js              the append-only tap log and the offline outbox
    line-charts.js             hand-built SVG, no charting library
    line-board.js              the dashboard app
    line-station.js            the station phone app
    line.css                   styles for both
    line-tests.js              the checks below
google-apps-script/
  activity-5-Code.gs           the backend — paste this into Apps Script
```

`line-analytics.js` is pure maths and touches neither the screen nor
the network, which is what makes it testable on its own. That
separation is deliberate: a wrong bottleneck sends the class off
improving the wrong station.

There is no build step, no framework and nothing to install. The
station pages do not even load the chart code — a phone should not
download what it will never run.

---

## 9. The tests

```powershell
node production-coordination/line5/line-tests.js
```

No framework, nothing to install. 455 checks covering:

- **A worked example** with times chosen to be checkable on paper —
  four stations at 10s, 30s, 5s and 5s. Every figure the dashboard
  shows is asserted against a number worked out by hand, including
  the accounting identity that lead time = work + waiting for every
  aeroplane, and Little's Law agreeing with directly-measured WIP.
- **Bad and missing data** — impossible readings excluded rather than
  averaged, gaps reported, partial rounds not mistaken for broken ones.
- **Every chart against every shape of data**, checking the output text
  for `NaN`. A NaN in an SVG attribute renders nothing at all, with no
  error anywhere, which is exactly the failure mode worth catching
  mechanically.
- **The clock maths**, sign included.
- **The contract with the Apps Script** — every field the client sends
  is read under the same name by the server, including the ones where a
  falsy value matters (station index 0, elapsed time 0).
- **The DOM wiring** — every id the scripts look up exists in the page
  that loads them. This is the check that would have caught Activity
  3's `feedbackFlash`, where the quiz threw on the first question and
  the student was stuck.
- **That the four station pages have not drifted apart**, by normalising
  away the one number that should differ and comparing the rest.
- **Twenty-eight regressions from an adversarial code audit** — every one a
  defect that looked like a correct number: work-in-progress going negative
  when a tap went missing, the line cycle counting two aeroplanes as one
  across a hole, solo-mode taps uploading into a team round, chart geometry
  escaping its own viewBox, and the printed table silently dropping its
  Waiting column.

It deliberately does **not** call the Google Sheet — that needs the
deployed Web App, and the round trip is verified by hand once, using
section 3.

---

## 10. What is stored, and where

- **On the dashboard's browser:** the current round and an archive of up
  to twenty finished rounds, for the comparison tab. Nothing leaves the
  machine in solo mode.
- **On each phone:** its line code, its station, and any taps not yet
  uploaded.
- **In the Google Sheet** (team mode only): one row per round, one row
  per tap. No names, no accounts, no personal data — a tap is a station,
  an aeroplane number and a time.

The Web App URL and the shared token sit in a file the browser
downloads, so anyone who views source can find them — the same
situation as the Supabase key on Activity 3, and equally deliberate.
What protects the data is what the script is willing to **do**: append a
row, or read back one round. It cannot reach your other sheets, and
nothing in it deletes anything. An undo is a new row pointing at an old
one, never a deletion — so the sheet keeps the real history, corrections
and all.
