/* ============================================================
   admin.js — the behaviour of the admin page
   ============================================================
   Three jobs:
     1. Sign the administrator in with Supabase Auth
     2. Download the submissions
     3. Search, sort and display them
   ============================================================ */

"use strict";


/* ------------------------------------------------------------
   STEP 1 — Supabase settings
   ------------------------------------------------------------
   Same public values as the form. Safe to publish: the anon key
   alone cannot read the submissions, because the read policy
   requires a signed-in user.
   ------------------------------------------------------------ */

const config = {
  SUPABASE_URL: "https://xwjwujyfybjjbatwxoxl.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3and1anlmeWJqamJhdHd4b3hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3ODkyNjAsImV4cCI6MjEwMTM2NTI2MH0.SXauGMuzPe-nD-Ba0ZIaf-d0V2XEFD_ISkcQOBTC_OY",
};


/* ------------------------------------------------------------
   STEP 2 — Grab the elements we need
   ------------------------------------------------------------ */

const loginCard = document.getElementById("loginCard");
const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginError = document.getElementById("loginError");
const adminEmail = document.getElementById("adminEmail");
const adminPassword = document.getElementById("adminPassword");

const adminCard = document.getElementById("adminCard");
const signOutButton = document.getElementById("signOutButton");
const dataError = document.getElementById("dataError");
const countLine = document.getElementById("countLine");

const searchInput = document.getElementById("searchInput");
const sortButton = document.getElementById("sortButton");
const refreshButton = document.getElementById("refreshButton");
const tableBody = document.getElementById("tableBody");
const emptyState = document.getElementById("emptyState");

// The analytics section
const statQualified = document.getElementById("statQualified");
const statNotQualified = document.getElementById("statNotQualified");
const statPercent = document.getElementById("statPercent");
const breakdownChart = document.getElementById("breakdownChart");


/* ------------------------------------------------------------
   STEP 3 — Variables that hold the current state of the page
   ------------------------------------------------------------
   "let" (not "const") because these values change while you use
   the page.
   ------------------------------------------------------------ */

// The proof-of-login token Supabase gives us. Without it, no data.
let accessToken = null;

// Every row downloaded from the database.
let allSubmissions = [];

// Which way the date column is sorted right now.
let newestFirst = true;


/* ------------------------------------------------------------
   STEP 4 — Small helpers
   ------------------------------------------------------------ */

function show(el) { el.classList.remove("is-hidden"); }
function hide(el) { el.classList.add("is-hidden"); }

function showError(el, message) {
  el.textContent = message;
  show(el);
}

/* Turn the database timestamp into something readable.
   The database stores something like "2026-08-05T09:14:22.123Z".
   We want "5 Aug 2026, 5:14 pm". */
function formatDate(isoText) {
  if (!isoText) return "—";           // some rows may have no date

  const d = new Date(isoText);

  // If the text wasn't a real date, don't crash — show it raw.
  if (isNaN(d.getTime())) return isoText;

  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}


/* ============================================================
   STEP 4b — READING THE SPM FIELD
   ============================================================
   Everything that counts grades and subjects goes through the one
   function below. It turns whatever is stored in `spm_results`
   into the same tidy shape:

       [ { subject: "Matematik", grade: "A+" }, ... ]

   Why "whatever is stored"? Because the field can arrive in two
   different shapes, and we want both to work:

   SHAPE 1 — a real list (this is what the form saves).
     The column type is jsonb, so Supabase hands it back already
     converted into a JavaScript array of objects. Nothing to
     parse; we just tidy it up.

   SHAPE 2 — one long piece of text, like:
        "Bahasa Melayu (A+), Sejarah (A+), Biologi (C+)"
     This needs real parsing: chop it into pieces and pull the
     subject and grade out of each one.

   Handling both means old rows and new rows both count correctly.
   ============================================================ */

function normaliseSpm(value) {
  // ---------- Nothing stored ----------
  if (!value) return [];

  // ---------- SHAPE 1: already a list ----------
  if (Array.isArray(value)) {
    return value
      // Throw away anything that isn't a proper object
      .filter(function (item) {
        return item && typeof item === "object";
      })
      // Tidy each one: trim spaces, use "?" when a piece is missing
      .map(function (item) {
        return {
          subject: String(item.subject || "?").trim(),
          grade: String(item.grade || "?").trim().toUpperCase(),
        };
      });
  }

  // ---------- SHAPE 2: a piece of text ----------
  if (typeof value === "string") {
    return parseSpmText(value);
  }

  // Anything else (a number? a stray object?) — ignore it.
  return [];
}


/* Parse text like:
       "Bahasa Melayu (A+), Sejarah (A+), Biologi (C+)"
   into:
       [ {subject:"Bahasa Melayu", grade:"A+"}, ... ]

   HOW THE PATTERN BELOW WORKS
   ------------------------------------------------------------
   A "regular expression" is a search pattern for text. Ours is:

       /([^,(]+?)\s*\(\s*([^)]*?)\s*\)/g

   Reading it piece by piece:

     ([^,(]+?)   capture the SUBJECT: one or more characters that
                 are not a comma and not an opening bracket.
                 The "?" means "take as few as possible", so we
                 stop as soon as we reach the bracket.
     \s*         allow spaces before the bracket
     \(          a literal opening bracket  (the \ says "the real
                 character", because ( normally has a special job)
     \s*         allow spaces inside the bracket
     ([^)]*?)    capture the GRADE: anything that isn't a closing
                 bracket
     \s*\)       optional spaces, then the closing bracket
     g           "global": keep going and find EVERY match, not
                 just the first one

   The two things in round brackets are "capture groups". Group 1
   lands in match[1] (the subject) and group 2 in match[2] (the
   grade).
   ------------------------------------------------------------ */
function parseSpmText(text) {
  const results = [];
  const pattern = /([^,(]+?)\s*\(\s*([^)]*?)\s*\)/g;

  let match;

  // pattern.exec() returns the next match each time it is called,
  // and null when there are no more. So this loop walks through
  // every "Subject (Grade)" pair in the text.
  while ((match = pattern.exec(text)) !== null) {
    const subject = match[1].trim();
    const grade = match[2].trim().toUpperCase();

    // Skip anything that came out empty.
    if (subject === "") continue;

    results.push({ subject: subject, grade: grade || "?" });
  }

  // FALLBACK: if the text had no brackets at all, the pattern
  // finds nothing. Rather than lose the data, treat each
  // comma-separated piece as a subject with an unknown grade.
  if (results.length === 0 && text.trim() !== "") {
    text.split(",").forEach(function (piece) {
      const subject = piece.trim();
      if (subject !== "") results.push({ subject: subject, grade: "?" });
    });
  }

  return results;
}


/* ------------------------------------------------------------
   STEP 5 — Signing in
   ------------------------------------------------------------
   Supabase has a login endpoint. We send the email and password,
   and if they're correct it returns an "access_token" — a
   temporary pass that proves who we are on later requests.
   ------------------------------------------------------------ */

async function signIn(email, password) {
  const url = config.SUPABASE_URL + "/auth/v1/token?grant_type=password";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": config.SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email: email, password: password }),
  });

  const data = await response.json();

  if (!response.ok) {
    // Supabase has used a few different field names for the error
    // message over the years, so we check all of them.
    const reason =
      data.msg || data.error_description || data.message || "Sign in failed.";
    throw new Error(reason);
  }

  return data.access_token;
}


/* Handle the login form being submitted. */
loginForm.addEventListener("submit", async function (event) {
  event.preventDefault();            // don't reload the page
  hide(loginError);

  const email = adminEmail.value.trim();
  const password = adminPassword.value;

  if (email === "" || password === "") {
    showError(loginError, "Please enter both your email and password.");
    return;
  }

  loginButton.disabled = true;
  loginButton.textContent = "Signing in…";

  try {
    accessToken = await signIn(email, password);

    // Remember the token for this browser tab only. Closing the tab
    // forgets it, which is safer than storing it permanently.
    sessionStorage.setItem("adminToken", accessToken);

    // Swap the login box for the table.
    hide(loginCard);
    show(adminCard);

    adminPassword.value = "";        // don't leave the password lying around
    await loadSubmissions();

  } catch (error) {
    console.error(error);
    showError(loginError, error.message);

  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Sign In";
  }
});


/* Signing out: forget the token and go back to the login box. */
signOutButton.addEventListener("click", function () {
  accessToken = null;
  sessionStorage.removeItem("adminToken");
  allSubmissions = [];
  tableBody.textContent = "";
  searchInput.value = "";
  hide(adminCard);
  show(loginCard);
});


/* ------------------------------------------------------------
   STEP 6 — Downloading the submissions
   ------------------------------------------------------------
   Notice the Authorization header uses the ACCESS TOKEN, not the
   anon key. That token is what proves we are signed in, and it is
   what makes the read policy allow the request.
   ------------------------------------------------------------ */

async function loadSubmissions() {
  hide(dataError);
  countLine.textContent = "Loading…";

  // select=... picks the columns. order=created_at.desc asks the
  // DATABASE to sort newest-first before sending, so the page is
  // already in the right order when it arrives.
  const url =
    config.SUPABASE_URL +
    "/rest/v1/submission?select=id,name,email,phone,spm_results,created_at" +
    "&order=created_at.desc";

  try {
    const response = await fetch(url, {
      headers: {
        "apikey": config.SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + accessToken,
      },
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error("Supabase returned " + response.status + ": " + details);
    }

    allSubmissions = await response.json();
    render();

  } catch (error) {
    console.error(error);
    countLine.textContent = "";
    showError(
      dataError,
      "Could not load the submissions. If this says \"permission denied\" " +
      "or returns nothing, the SELECT policy may be missing — see README.md."
    );
  }
}


refreshButton.addEventListener("click", function () {
  loadSubmissions();
});


/* ------------------------------------------------------------
   STEP 7 — Search and sort
   ------------------------------------------------------------
   Both work on the copy of the data already in the browser, so
   they are instant — no trip back to the database.
   ------------------------------------------------------------ */

/* Return only the rows matching what's typed in the search box. */
function applySearch(rows) {
  const term = searchInput.value.trim().toLowerCase();

  if (term === "") return rows;      // empty search = show everything

  return rows.filter(function (row) {
    // (row.name || "") guards against a row where name is empty,
    // because null.toLowerCase() would crash.
    const name = (row.name || "").toLowerCase();
    const email = (row.email || "").toLowerCase();

    // .includes() asks "does this text contain the search term?"
    return name.includes(term) || email.includes(term);
  });
}


/* Return the rows ordered by date. */
function applySort(rows) {
  // .slice() makes a copy first, so we never scramble the original list.
  return rows.slice().sort(function (a, b) {
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();

    // Sorting works by returning a negative or positive number.
    // Newest first = bigger date first, so we do B minus A.
    return newestFirst ? timeB - timeA : timeA - timeB;
  });
}


/* The sort button flips the direction and redraws. */
sortButton.addEventListener("click", function () {
  newestFirst = !newestFirst;        // "!" flips true to false and back
  sortButton.textContent = newestFirst
    ? "Sort: Newest first"
    : "Sort: Oldest first";
  render();
});


/* Re-filter as you type. "input" fires on every keystroke. */
searchInput.addEventListener("input", function () {
  render();
});


/* ------------------------------------------------------------
   STEP 8 — Drawing the table
   ------------------------------------------------------------ */

/* Helper: make one <td> cell containing plain text.
   ------------------------------------------------------------
   We use textContent, never innerHTML. If a student typed
   something like "<script>" into the form, textContent shows it
   as harmless text instead of running it. This is how you avoid
   an attack called XSS (cross-site scripting).
   ------------------------------------------------------------ */
function makeCell(text) {
  const td = document.createElement("td");
  td.textContent = text;
  return td;
}


/* Helper: build the SPM results cell.
   ------------------------------------------------------------
   The database column is jsonb, so Supabase hands it back already
   turned into a real JavaScript array, like:

     [ { subject: "Matematik", grade: "A+" },
       { subject: "Fizik",     grade: "B"  } ]

   We list each one on its own line, in the form:

     Matematik (A+)
     Fizik (B)
   ------------------------------------------------------------ */
function makeSpmCell(rawValue) {
  const td = document.createElement("td");

  // Run it through the same parser the analytics use, so a row
  // stored as text displays exactly like a row stored as a list.
  const results = normaliseSpm(rawValue);

  // Older rows were saved before the SPM section existed, so there
  // may be nothing to show.
  if (results.length === 0) {
    td.textContent = "—";
    td.className = "spm-empty";
    return td;
  }

  // A container holding one line per subject.
  const wrap = document.createElement("div");
  wrap.className = "spm-list";

  results.forEach(function (item) {
    // Guard against a malformed entry (e.g. missing grade).
    if (!item || typeof item !== "object") return;

    const line = document.createElement("div");
    line.className = "spm-line";

    // Build the text: subject, then the grade in brackets.
    // textContent, never innerHTML — whatever is stored is treated
    // as plain text, so it cannot inject markup.
    line.textContent = (item.subject || "?") + " (" + (item.grade || "?") + ")";

    wrap.appendChild(line);
  });

  td.appendChild(wrap);
  return td;
}


function render() {
  // The analytics always describe EVERY submission, not just the
  // ones matching the current search — otherwise the totals would
  // jump around as you type.
  renderAnalytics();

  // Search first, then sort what's left.
  const visible = applySort(applySearch(allSubmissions));

  // Empty the table before redrawing it.
  tableBody.textContent = "";

  // Build one row per submission.
  visible.forEach(function (row) {
    const tr = document.createElement("tr");
    tr.appendChild(makeCell(row.name || "—"));
    tr.appendChild(makeCell(row.email || "—"));
    tr.appendChild(makeCell(row.phone || "—"));
    tr.appendChild(makeSpmCell(row.spm_results));
    tr.appendChild(makeCell(formatDate(row.created_at)));
    tableBody.appendChild(tr);
  });

  // Show or hide the "nothing found" message.
  if (visible.length === 0) show(emptyState);
  else hide(emptyState);

  // Update the counter line under the heading.
  if (allSubmissions.length === 0) {
    countLine.textContent = "No submissions yet.";
  } else if (visible.length === allSubmissions.length) {
    countLine.textContent = allSubmissions.length + " submissions";
  } else {
    countLine.textContent =
      "Showing " + visible.length + " of " + allSubmissions.length;
  }
}


/* ============================================================
   STEP 8b — THE ANALYTICS: MINIMUM 3 CREDITS
   ============================================================
   One question to answer:

     How many students have a CREDIT in Sains, in Matematik, and
     in at least one other subject?

   In SPM, a "credit" (kredit) means grade C or better. The full
   grade ladder, best to worst, is:

       A+  A  A-  B+  B  C+  C  |  D  E  G
       \________ credit ________/  \__ no credit __/

   Note there is no "C-" in SPM. C is the lowest credit grade.
   ============================================================ */

/* The grades from best to worst. Their POSITION in this list is
   what lets us compare them: a lower position number is a better
   grade. */
const GRADE_ORDER = ["A+", "A", "A-", "B+", "B", "C+", "C", "D", "E", "G"];

/* The lowest grade that still counts as a credit. */
const CREDIT_GRADE = "C";

/* The two subjects that are compulsory for this requirement.
   Stored lowercase so comparisons ignore capital letters. */
const REQUIRED_SUBJECTS = ["sains", "matematik"];


/* Is this grade a credit (C or better)?
   ------------------------------------------------------------
   indexOf() gives the position in GRADE_ORDER. "A+" is 0, "C" is
   6, "G" is 9. So a grade is a credit when its position is less
   than or equal to the position of C.

   A grade we don't recognise (like "?") returns -1 from indexOf,
   which we treat as NOT a credit — we never guess in the
   student's favour.
   ------------------------------------------------------------ */
function isCredit(grade) {
  const position = GRADE_ORDER.indexOf(grade);
  if (position === -1) return false;          // unknown grade

  return position <= GRADE_ORDER.indexOf(CREDIT_GRADE);
}


/* Work out whether ONE student meets the requirement.
   ------------------------------------------------------------
   Returns an object describing which parts they passed, so the
   breakdown chart can show where students fall short.

   "Matematik Tambahan" is a DIFFERENT subject from "Matematik",
   so we compare the whole name, not just the start of it. Add
   Maths therefore counts towards the "one other subject" part.
   ------------------------------------------------------------ */
function checkStudent(row) {
  const results = normaliseSpm(row.spm_results);

  let hasSains = false;
  let hasMatematik = false;
  let otherCredits = 0;

  results.forEach(function (item) {
    // Compare in lowercase with spaces trimmed, so "SAINS" and
    // " Sains " both match.
    const subject = item.subject.trim().toLowerCase();

    // Only credits matter from here on.
    if (!isCredit(item.grade)) return;

    if (subject === "sains") {
      hasSains = true;
    } else if (subject === "matematik") {
      hasMatematik = true;
    } else {
      // Any credit that is NOT Sains or Matematik counts towards
      // the "one other subject" part.
      otherCredits++;
    }
  });

  return {
    hasSains: hasSains,
    hasMatematik: hasMatematik,
    hasOther: otherCredits > 0,
    // Qualified only when all three parts are true.
    qualified: hasSains && hasMatematik && otherCredits > 0,
  };
}


/* Run the check over every student and tally the results. */
function computeCreditStats(rows) {
  let qualified = 0;
  let sainsOnly = 0;
  let matematikOnly = 0;
  let otherOnly = 0;

  rows.forEach(function (row) {
    const result = checkStudent(row);

    if (result.qualified) qualified++;
    if (result.hasSains) sainsOnly++;
    if (result.hasMatematik) matematikOnly++;
    if (result.hasOther) otherOnly++;
  });

  return {
    total: rows.length,
    qualified: qualified,
    notQualified: rows.length - qualified,
    creditInSains: sainsOnly,
    creditInMatematik: matematikOnly,
    creditInOther: otherOnly,
  };
}


/* Draw one bar chart into a container.
   ------------------------------------------------------------
   "items" is a list of { label, count }.
   The longest bar fills the width, and every other bar is drawn
   in proportion to it — that is what the percentage works out.
   ------------------------------------------------------------ */
function drawChart(container, items) {
  container.textContent = "";   // clear whatever was there before

  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "chart-empty";
    empty.textContent = "No data yet.";
    container.appendChild(empty);
    return;
  }

  // Math.max(...) finds the biggest count. The "..." spreads the
  // list out into separate arguments, as Math.max needs.
  const biggest = Math.max.apply(
    null,
    items.map(function (i) { return i.count; })
  );

  items.forEach(function (item) {
    const row = document.createElement("div");
    row.className = "chart-row";

    // The label on the left
    const label = document.createElement("span");
    label.className = "chart-label";
    label.textContent = item.label;

    // The track is the light grey groove; the fill is the navy bar
    const track = document.createElement("div");
    track.className = "chart-track";

    const fill = document.createElement("div");
    fill.className = "chart-fill";

    // Work out how wide this bar should be, as a percentage of the
    // longest one. Guard against dividing by zero.
    const percent = biggest > 0 ? (item.count / biggest) * 100 : 0;

    // Give every bar a sliver of width so a count of 1 is visible.
    fill.style.width = Math.max(percent, 3) + "%";

    track.appendChild(fill);

    // The number on the right
    const count = document.createElement("span");
    count.className = "chart-count";
    count.textContent = item.count;

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(count);
    container.appendChild(row);
  });
}


/* Work out the numbers and put them on the page. */
function renderAnalytics() {
  const stats = computeCreditStats(allSubmissions);

  // ---------- The three headline numbers ----------
  statQualified.textContent = stats.qualified;
  statNotQualified.textContent = stats.notQualified;

  // Percentage, rounded to a whole number. Guard against dividing
  // by zero when there are no students at all.
  const percent =
    stats.total > 0 ? Math.round((stats.qualified / stats.total) * 100) : 0;
  statPercent.textContent = percent + "%";

  // ---------- The breakdown chart ----------
  // Each bar is measured against the total number of students, so
  // a full-width bar means "every student". We pass the total in
  // as an extra item so the scale is consistent.
  drawChart(breakdownChart, [
    { label: "Credit in Sains", count: stats.creditInSains },
    { label: "Credit in Matematik", count: stats.creditInMatematik },
    { label: "Credit in 1+ other", count: stats.creditInOther },
    { label: "All three (qualified)", count: stats.qualified },
    { label: "Total students", count: stats.total },
  ]);
}


/* ------------------------------------------------------------
   STEP 9 — If you already signed in earlier in this tab,
            skip the login box and go straight to the table.
   ------------------------------------------------------------ */

const savedToken = sessionStorage.getItem("adminToken");

if (savedToken) {
  accessToken = savedToken;
  hide(loginCard);
  show(adminCard);
  loadSubmissions();
}
