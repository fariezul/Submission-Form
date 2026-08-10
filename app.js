/* ============================================================
   app.js — the BEHAVIOUR of the page
   ============================================================
   This file does three things:
     1. Checks the values the user typed (validation)
     2. Sends good data to Supabase
     3. Shows a success message and clears the form
   ============================================================ */

/* "use strict" turns on a safer mode in JavaScript that catches
   common mistakes (like using a variable you forgot to declare). */
"use strict";


/* ------------------------------------------------------------
   STEP 1 — Grab the elements we need from the HTML
   ------------------------------------------------------------
   document.getElementById("x") finds the element whose id="x".
   We store each one in a "const" so we can use it later.
   ------------------------------------------------------------ */

const form = document.getElementById("contactForm");
const submitButton = document.getElementById("submitButton");

// The three input boxes
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const phoneInput = document.getElementById("phone");

// The little red text lines under each input
const nameError = document.getElementById("nameError");
const emailError = document.getElementById("emailError");
const phoneError = document.getElementById("phoneError");

// The green / red banners at the top of the card
const successMessage = document.getElementById("successMessage");
const errorMessage = document.getElementById("errorMessage");

// The SPM results section
const spmRows = document.getElementById("spmRows");
const addSubjectButton = document.getElementById("addSubjectButton");
const spmError = document.getElementById("spmError");

// The share button and its little confirmation line
const shareButton = document.getElementById("shareButton");
const shareStatus = document.getElementById("shareStatus");


/* ------------------------------------------------------------
   STEP 2 — Supabase settings
   ------------------------------------------------------------
   These two values live directly in the code, which is the normal
   and intended way to build a static Supabase site.

   Is it safe to publish the anon key? Yes — that is what it is FOR.
   Any key a browser uses can be seen by anyone who presses F12, so
   Supabase designed the "anon" key to be public. What actually
   protects your data is the Row Level Security (RLS) policy on the
   table: this project allows INSERT only, so visitors can add a
   submission but cannot read, edit, or delete anything.

   The key that must NEVER appear here is the "service_role" key.
   That one bypasses all security rules and belongs only on a server.
   ------------------------------------------------------------ */

const config = {
  SUPABASE_URL: "https://xwjwujyfybjjbatwxoxl.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3and1anlmeWJqamJhdHd4b3hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3ODkyNjAsImV4cCI6MjEwMTM2NTI2MH0.SXauGMuzPe-nD-Ba0ZIaf-d0V2XEFD_ISkcQOBTC_OY",
};


/* ------------------------------------------------------------
   STEP 3 — Small helper functions
   ------------------------------------------------------------
   A "function" is a named block of code you can run again and
   again. Writing helpers keeps the main logic readable.
   ------------------------------------------------------------ */

/* Show an error under one specific field. */
function setFieldError(inputEl, errorEl, message) {
  errorEl.textContent = message;          // put the words on screen
  errorEl.classList.add("is-visible");    // CSS then displays it
  inputEl.classList.add("input-error");   // red border on the input
  // Tells screen readers this field is invalid
  inputEl.setAttribute("aria-invalid", "true");
}

/* Remove the error from one specific field. */
function clearFieldError(inputEl, errorEl) {
  errorEl.textContent = "";
  errorEl.classList.remove("is-visible");
  inputEl.classList.remove("input-error");
  inputEl.removeAttribute("aria-invalid");
}

/* Show one of the banners at the top of the card. */
function showBanner(bannerEl, message) {
  if (message) bannerEl.textContent = message;
  bannerEl.classList.remove("is-hidden");
}

/* Hide a banner. */
function hideBanner(bannerEl) {
  bannerEl.classList.add("is-hidden");
}


/* ------------------------------------------------------------
   STEP 4 — The validation rules
   ------------------------------------------------------------
   Each rule returns an error message (a string) if something is
   wrong, or an empty string "" if the value is fine.
   ------------------------------------------------------------ */

/* NAME: must not be empty, and at least 2 characters. */
function validateName(value) {
  if (value === "") return "Please enter your full name.";
  if (value.length < 2) return "Name must be at least 2 characters.";
  return "";
}

/* EMAIL: must look like  something@something.something
   ------------------------------------------------------------
   The strange-looking thing below is a REGULAR EXPRESSION —
   a pattern for matching text. Reading it piece by piece:
     ^          start of the text
     [^\s@]+    one or more characters that are NOT a space or @
     @          a literal @ symbol
     [^\s@]+    the domain, again no spaces or @
     \.         a literal dot
     [^\s@]{2,} at least 2 more characters (like "com" or "co")
     $          end of the text
   ------------------------------------------------------------ */
function validateEmail(value) {
  if (value === "") return "Please enter your email address.";

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  // .test() returns true if the value matches the pattern.
  if (!emailPattern.test(value)) {
    return "Please enter a valid email address (e.g. name@company.com).";
  }
  return "";
}

/* PHONE: digits only, 7 to 15 of them.
     ^[0-9]+$   means: from start to end, ONLY the characters 0-9 */
function validatePhone(value) {
  if (value === "") return "Please enter your phone number.";

  const digitsOnly = /^[0-9]+$/;

  if (!digitsOnly.test(value)) {
    return "Phone number must contain numbers only.";
  }
  if (value.length < 7 || value.length > 15) {
    return "Phone number must be between 7 and 15 digits.";
  }
  return "";
}


/* ------------------------------------------------------------
   STEP 4b — The SPM results section
   ------------------------------------------------------------
   This part of the form is different from the others: the number
   of inputs is not fixed. A student might add three subjects or
   ten, so JavaScript builds the rows as they click "Add Subject".
   ------------------------------------------------------------ */

/* The subjects offered. "Other" lets a student record anything
   not on the list. Add or remove entries here freely. */
const SPM_SUBJECTS = [
  "Bahasa Melayu",
  "Bahasa Inggeris",
  "Sejarah",
  "Pendidikan Islam",
  "Pendidikan Moral",
  "Matematik",
  "Matematik Tambahan",
  "Sains",
  "Fizik",
  "Kimia",
  "Biologi",
  "Prinsip Perakaunan",
  "Perniagaan",
  "Ekonomi",
  "Geografi",
  "Pendidikan Seni Visual",
  "Sains Komputer",
  "Reka Cipta",
  "Bahasa Arab",
  "Bahasa Cina",
  "Bahasa Tamil",
  "Other",
];

/* SPM grades, best to worst. */
const SPM_GRADES = ["A+", "A", "A-", "B+", "B", "C+", "C", "D", "E", "G"];


/* Helper: build a <select> dropdown from a list of strings.
   ------------------------------------------------------------
   "placeholder" is the greyed-out first line, e.g. "Select subject".
   It has an empty value so we can detect "nothing chosen yet". */
function buildSelect(className, options, placeholder) {
  const select = document.createElement("select");
  select.className = className;

  // The first option is the prompt. "disabled" stops it being
  // re-picked, "selected" makes it show initially.
  const first = document.createElement("option");
  first.value = "";
  first.textContent = placeholder;
  first.disabled = true;
  first.selected = true;
  select.appendChild(first);

  // Now one <option> per entry in the list.
  options.forEach(function (text) {
    const opt = document.createElement("option");
    opt.value = text;
    opt.textContent = text;
    select.appendChild(opt);
  });

  return select;
}


/* Add one subject row to the page. */
function addSubjectRow() {
  const row = document.createElement("div");
  row.className = "spm-row";

  const subject = buildSelect("spm-subject", SPM_SUBJECTS, "Select subject");
  const grade = buildSelect("spm-grade", SPM_GRADES, "Grade");

  // The little "×" button that deletes this row.
  const remove = document.createElement("button");
  remove.type = "button";          // again: must not submit the form
  remove.className = "btn-remove";
  remove.textContent = "×";
  remove.setAttribute("aria-label", "Remove this subject");

  remove.addEventListener("click", function () {
    row.remove();                  // delete this row from the page

    // Never leave the section completely empty — always keep one row
    // so the student has something to fill in.
    if (spmRows.children.length === 0) addSubjectRow();
  });

  // Put the three controls inside the row, then the row on the page.
  row.appendChild(subject);
  row.appendChild(grade);
  row.appendChild(remove);
  spmRows.appendChild(row);

  return row;
}


/* Read every row and return the results as a list of objects, like:
     [ { subject: "Matematik", grade: "A" }, ... ]
   Rows the student left completely blank are skipped. */
function getSpmResults() {
  const results = [];

  // querySelectorAll finds ALL matching elements. It returns something
  // list-like, so Array.from() turns it into a real array we can loop.
  Array.from(spmRows.querySelectorAll(".spm-row")).forEach(function (row) {
    const subject = row.querySelector(".spm-subject").value;
    const grade = row.querySelector(".spm-grade").value;

    // Skip a row where neither box was touched.
    if (subject === "" && grade === "") return;

    results.push({ subject: subject, grade: grade });
  });

  return results;
}


/* Check the SPM section. Returns an error message, or "" if fine. */
function validateSpmResults(results) {
  // At least one subject is required.
  if (results.length === 0) {
    return "Please add at least one SPM subject and grade.";
  }

  // Every row that exists must be filled in on both sides.
  const incomplete = results.some(function (r) {
    return r.subject === "" || r.grade === "";
  });
  if (incomplete) {
    return "Each row needs both a subject and a grade.";
  }

  // The same subject must not appear twice.
  const seen = [];
  for (let i = 0; i < results.length; i++) {
    const subject = results[i].subject;

    // "Other" is allowed more than once, since it can mean different
    // subjects each time.
    if (subject !== "Other" && seen.indexOf(subject) !== -1) {
      return 'You have added "' + subject + '" more than once.';
    }
    seen.push(subject);
  }

  return "";
}


/* Wipe the section back to a single empty row (used after a save). */
function resetSpmRows() {
  spmRows.innerHTML = "";   // remove every row at once
  addSubjectRow();          // put one fresh row back
}


// Wire up the "+ Add Subject" button, and create the first row so the
// section is never empty when the page loads.
addSubjectButton.addEventListener("click", function () {
  addSubjectRow();
});

addSubjectRow();


/* Runs all the rules and returns true only if everything passed. */
function validateForm() {
  // .value is what the user typed. .trim() removes stray spaces
  // at the start and end.
  const nameValue = nameInput.value.trim();
  const emailValue = emailInput.value.trim();
  const phoneValue = phoneInput.value.trim();

  const nameMsg = validateName(nameValue);
  const emailMsg = validateEmail(emailValue);
  const phoneMsg = validatePhone(phoneValue);

  // Show or clear each field's message.
  if (nameMsg) setFieldError(nameInput, nameError, nameMsg);
  else clearFieldError(nameInput, nameError);

  if (emailMsg) setFieldError(emailInput, emailError, emailMsg);
  else clearFieldError(emailInput, emailError);

  if (phoneMsg) setFieldError(phoneInput, phoneError, phoneMsg);
  else clearFieldError(phoneInput, phoneError);

  // The SPM section is a group, not a single input, so it gets its own
  // message line rather than a red border on one box.
  const spmMsg = validateSpmResults(getSpmResults());
  if (spmMsg) {
    spmError.textContent = spmMsg;
    spmError.classList.add("is-visible");
  } else {
    spmError.textContent = "";
    spmError.classList.remove("is-visible");
  }

  // If every message is an empty string, the form is valid.
  return !nameMsg && !emailMsg && !phoneMsg && !spmMsg;
}


/* ------------------------------------------------------------
   STEP 5 — Live feedback while typing
   ------------------------------------------------------------
   Once a field has shown an error, re-check it as the user types
   so the red message disappears the moment they fix it.
   "addEventListener" means: when EVENT happens, run this function.
   ------------------------------------------------------------ */

function watchField(inputEl, errorEl, validateFn) {
  inputEl.addEventListener("input", function () {
    // Only re-check if an error is currently showing —
    // otherwise we'd nag the user before they finish typing.
    if (!errorEl.classList.contains("is-visible")) return;

    const message = validateFn(inputEl.value.trim());
    if (message) setFieldError(inputEl, errorEl, message);
    else clearFieldError(inputEl, errorEl);
  });
}

watchField(nameInput, nameError, validateName);
watchField(emailInput, emailError, validateEmail);
watchField(phoneInput, phoneError, validatePhone);


/* ------------------------------------------------------------
   STEP 6 — Saving to Supabase
   ------------------------------------------------------------
   Supabase gives every table a web address (a REST API). To add
   a row we send a POST request to:
       <PROJECT URL>/rest/v1/<TABLE NAME>
   with the row as JSON, plus our anon key in the headers so
   Supabase knows which project we mean.

   "async" + "await" let us wait for the network without freezing
   the page. Think of await as "pause here until this finishes".
   ------------------------------------------------------------ */

async function saveToSupabase(record) {
  const endpoint = config.SUPABASE_URL + "/rest/v1/submission";

  const response = await fetch(endpoint, {
    method: "POST",                     // POST = "create something new"
    headers: {
      "Content-Type": "application/json",   // we're sending JSON
      "apikey": config.SUPABASE_ANON_KEY,   // identifies the project
      "Authorization": "Bearer " + config.SUPABASE_ANON_KEY,
      "Prefer": "return=minimal",           // don't send the row back
    },
    // The browser can only send text, so we convert our object
    // into a JSON string.
    body: JSON.stringify(record),
  });

  // response.ok is true for status codes 200-299.
  if (!response.ok) {
    // Try to read Supabase's explanation of what went wrong.
    const details = await response.text();
    throw new Error(
      "Supabase returned " + response.status + ": " + details
    );
  }
}


/* ------------------------------------------------------------
   STEP 7 — What happens when the user clicks Submit
   ------------------------------------------------------------ */

form.addEventListener("submit", async function (event) {
  // Stop the browser's default behaviour (reloading the page).
  event.preventDefault();

  // Clear any banners left over from a previous attempt.
  hideBanner(successMessage);
  hideBanner(errorMessage);

  // If anything is invalid, stop here — the messages are already
  // on screen thanks to validateForm().
  if (!validateForm()) return;

  // Build the object we want to store. The property names MUST
  // match your Supabase column names exactly: name, email, phone.
  const record = {
    name: nameInput.value.trim(),
    email: emailInput.value.trim(),
    phone: phoneInput.value.trim(),

    // An array of { subject, grade } objects. Because the Supabase
    // column is JSONB, Postgres stores this as real structured data
    // that you can query later — not just a lump of text.
    spm_results: getSpmResults(),
  };

  // Lock the button so a fast double-click can't send twice.
  submitButton.disabled = true;
  submitButton.textContent = "Submitting…";

  try {
    // Wait for the save to finish.
    await saveToSupabase(record);

    // SUCCESS: show the green banner and empty the form.
    showBanner(successMessage);
    form.reset();                       // clears all the inputs

    // Also clear any leftover red styling.
    clearFieldError(nameInput, nameError);
    clearFieldError(emailInput, emailError);
    clearFieldError(phoneInput, phoneError);

    // form.reset() cannot remove rows that JavaScript created, so we
    // rebuild the SPM section by hand.
    spmError.textContent = "";
    spmError.classList.remove("is-visible");
    resetSpmRows();

    // Scroll the banner into view in case the user is on a phone.
    successMessage.scrollIntoView({ behavior: "smooth", block: "nearest" });

  } catch (error) {
    // FAILURE: something went wrong (no internet, wrong table
    // name, blocked by Supabase security rules, etc.)
    console.error(error);   // full details go to the browser console (F12)
    showBanner(
      errorMessage,
      "Sorry, we could not save your submission. Please try again. " +
      "(Technical details are in the browser console — press F12.)"
    );

  } finally {
    // "finally" always runs, whether it worked or failed —
    // so the button never stays stuck on "Submitting…".
    submitButton.disabled = false;
    submitButton.textContent = "Submit Registration";
  }
});


/* ============================================================
   STEP 8 — THE SHARE BUTTON
   ============================================================
   Sharing works differently on phones and on computers, so we try
   the best option available:

   1. PHONES (and some tablets) have a built-in share sheet — the
      panel that slides up offering WhatsApp, Telegram, email and
      so on. We reach it with navigator.share(). This is the nicest
      option because the person picks whichever app they like.

   2. COMPUTERS usually don't have that. So instead we copy the
      link straight to the clipboard and tell them we've done it.

   3. If even copying is blocked, we show the link on screen so it
      can be copied by hand.

   Checking what the browser supports before using it is called
   "feature detection", and it's how you write code that works
   everywhere without breaking on older browsers.
   ============================================================ */

/* The address we want people to share.
   ------------------------------------------------------------
   We build it from origin + pathname rather than using the full
   location.href, because href would include any "?something=..."
   bits on the end — and we want a clean link.
   ------------------------------------------------------------ */
function getShareUrl() {
  return window.location.origin + window.location.pathname;
}


/* Show a short message under the buttons, then hide it again. */
function showShareStatus(message) {
  shareStatus.textContent = message;
  shareStatus.classList.remove("is-hidden");

  // setTimeout runs something later. 4000 = 4000 milliseconds,
  // so the message disappears after four seconds.
  setTimeout(function () {
    shareStatus.classList.add("is-hidden");
  }, 4000);
}


shareButton.addEventListener("click", async function () {
  const url = getShareUrl();

  // What we want to share: a title, a sentence, and the link.
  const shareData = {
    title: "TVETMARA Masjid Tanah — Student Registration",
    text: "Register here for TVETMARA Masjid Tanah:",
    url: url,
  };

  // ---------- Option 1: the phone's own share sheet ----------
  // navigator.share only exists on browsers that support it, so we
  // check before calling it.
  if (navigator.share) {
    try {
      await navigator.share(shareData);
      // Success — the share sheet handled everything, so there is
      // nothing more for us to say.
      return;
    } catch (error) {
      // The person tapped "Cancel". That is not a real error, so we
      // quietly stop instead of showing a warning.
      if (error && error.name === "AbortError") return;

      // Anything else: fall through and try copying instead.
    }
  }

  // ---------- Option 2: copy to the clipboard ----------
  // navigator.clipboard only works on secure (https) pages.
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      showShareStatus("Link copied. Paste it anywhere to share.");
      return;
    } catch (error) {
      // Copying was blocked — fall through to the last option.
    }
  }

  // ---------- Option 3: show the link to copy by hand ----------
  showShareStatus(url);
});
