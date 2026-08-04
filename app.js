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


/* Runs all three rules and returns true only if everything passed. */
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

  // If all three messages are empty strings, the form is valid.
  return !nameMsg && !emailMsg && !phoneMsg;
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
