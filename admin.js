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
function makeSpmCell(results) {
  const td = document.createElement("td");

  // Older rows were saved before the SPM section existed, so this
  // can be null. Array.isArray() also protects against anything
  // unexpected being in the column.
  if (!Array.isArray(results) || results.length === 0) {
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
