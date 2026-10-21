/* ============================================================
   alumni.js — what the Alumni page DOES
   ============================================================
   Four jobs, in this order:

     1. Show or hide the follow-up sections as the answer to
        "apa yang anda lakukan?" changes.
     2. Check the answers before anything is sent.
     3. Shrink the photograph in the browser, so a 6 MB picture
        from a phone leaves as roughly 250 KB.
     4. Post everything to the Apps Script, which writes one row
        into the Google Sheet and saves the picture to Drive.

   There is no build step and no framework here. The page is
   plain static files, like every other page on this site.
   ============================================================ */

"use strict";


/* ------------------------------------------------------------
   STEP 1 — Find the pieces of the page we need
   ------------------------------------------------------------ */

const form = document.getElementById("alumniForm");
const submitButton = document.getElementById("submitButton");
const submitStatus = document.getElementById("submitStatus");

const successMessage = document.getElementById("successMessage");
const errorMessage = document.getElementById("errorMessage");

const tamatSesi = document.getElementById("tamatSesi");
const tamatTahun = document.getElementById("tamatTahun");

const branchStudy = document.getElementById("branchStudy");
const branchWork = document.getElementById("branchWork");
const branchPhoto = document.getElementById("branchPhoto");

const photoInput = document.getElementById("gambar");
const photoPreview = document.getElementById("photoPreview");
const photoPreviewImg = document.getElementById("photoPreviewImg");
const photoMeta = document.getElementById("photoMeta");

const shareButton = document.getElementById("shareButton");
const shareStatus = document.getElementById("shareStatus");

/* The settings from alumni-config.js. The "|| {}" keeps the page
   from throwing if that file ever fails to load — we would rather
   show a clear message on submit than a blank screen now. */
const config = window.ALUMNI_CONFIG || {};


/* ------------------------------------------------------------
   STEP 2 — Small helpers
   ------------------------------------------------------------ */

/* Show a red message under one text field. */
function setFieldError(inputEl, errorEl, message) {
  errorEl.textContent = message;
  errorEl.classList.add("is-visible");
  inputEl.classList.add("input-error");
  inputEl.setAttribute("aria-invalid", "true");
}

/* Take that message away again. */
function clearFieldError(inputEl, errorEl) {
  errorEl.textContent = "";
  errorEl.classList.remove("is-visible");
  inputEl.classList.remove("input-error");
  inputEl.removeAttribute("aria-invalid");
}

/* The same, for a group of radio buttons. There is no single
   input to redden, so the whole fieldset is marked instead. */
function setGroupError(fieldsetEl, errorEl, message) {
  errorEl.textContent = message;
  errorEl.classList.add("is-visible");
  fieldsetEl.classList.add("choice-error");
}

function clearGroupError(fieldsetEl, errorEl) {
  errorEl.textContent = "";
  errorEl.classList.remove("is-visible");
  fieldsetEl.classList.remove("choice-error");
}

/* Which radio in a group is ticked? Returns its value, or "" if
   the question has not been answered. */
function radioValue(name) {
  const chosen = form.querySelector('input[name="' + name + '"]:checked');
  return chosen ? chosen.value : "";
}

/* The <fieldset> that surrounds a radio group. */
function radioFieldset(name) {
  const first = form.querySelector('input[name="' + name + '"]');
  return first ? first.closest(".choice-set") : null;
}

/* Clear every answer inside a section we are about to hide, so a
   person who picks "Bekerja", types a salary, then changes to
   "Sambung Belajar" does not quietly send the salary along. */
function clearSection(sectionEl) {
  sectionEl.querySelectorAll("input").forEach(function (input) {
    if (input.type === "radio" || input.type === "checkbox") {
      input.checked = false;
    } else {
      input.value = "";
    }
  });
}

/* Show the progress line under the button. */
function setStatus(message) {
  if (!message) {
    submitStatus.classList.add("is-hidden");
    submitStatus.textContent = "";
    return;
  }
  submitStatus.textContent = message;
  submitStatus.classList.remove("is-hidden");
}

/* The red banner at the top of the card.
   ------------------------------------------------------------
   It always carries the REAL reason underneath the friendly
   sentence. A failure that says only "ralat berlaku" tells you
   nothing when somebody reports it by WhatsApp from a phone you
   cannot inspect.
   ------------------------------------------------------------ */
function showError(friendly, detail) {
  errorMessage.textContent = "";

  const strong = document.createElement("strong");
  strong.textContent = friendly + " ";
  errorMessage.appendChild(strong);

  if (detail) {
    const small = document.createElement("span");
    small.textContent = detail;
    errorMessage.appendChild(small);
  }

  errorMessage.classList.remove("is-hidden");
  errorMessage.scrollIntoView({ behavior: "smooth", block: "center" });
}


/* ------------------------------------------------------------
   STEP 2b — Fill the year dropdown
   ------------------------------------------------------------
   Newest first, because a recent graduate is the likeliest
   person to be filling this in and should not have to scroll
   seventeen years to find their own.
   ------------------------------------------------------------ */
(function fillYears() {
  const from = config.GRADUATION_YEAR_FROM || 2008;
  const to = config.GRADUATION_YEAR_TO || 2025;

  for (let year = to; year >= from; year--) {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = String(year);
    tamatTahun.appendChild(option);
  }
})();


/* ------------------------------------------------------------
   STEP 3 — The branching questions
   ------------------------------------------------------------
   Each answer to "apa yang anda lakukan?" carries a data-branch
   attribute in the HTML: "study", "work", or "none". We simply
   show the section it names and hide the other one.
   ------------------------------------------------------------ */

function updateBranches() {
  const chosen = form.querySelector('input[name="status"]:checked');
  const branch = chosen ? chosen.dataset.branch : "";

  const showStudy = branch === "study";
  const showWork = branch === "work";

  // The photograph is asked of alumni who are studying or working,
  // and of nobody else. Someone who answers "Tiada Buat Apa @
  // Menganggur" is not held up by it, and until a choice is made
  // there is nothing to ask about yet.
  const showPhoto = showStudy || showWork;

  // Empty a section on the way out, not on the way in, so that
  // somebody who flicks back and forth by accident does not lose
  // what they have already typed in the section they return to.
  if (!showStudy && !branchStudy.hidden) clearSection(branchStudy);
  if (!showWork && !branchWork.hidden) clearSection(branchWork);
  if (!showPhoto && !branchPhoto.hidden) clearPhoto();

  branchStudy.hidden = !showStudy;
  branchWork.hidden = !showWork;
  branchPhoto.hidden = !showPhoto;
}


/* Forget the chosen picture: the file, the preview and any error.
   Used when the photo section is hidden again, and after a
   successful send. */
function clearPhoto() {
  photoInput.value = "";
  photoPreview.classList.add("is-hidden");
  photoPreviewImg.removeAttribute("src");
  photoMeta.textContent = "";
  clearFieldError(photoInput, document.getElementById("gambarError"));
}

form.querySelectorAll('input[name="status"]').forEach(function (radio) {
  radio.addEventListener("change", updateBranches);
});

// Run once at load, in case the browser restored a choice after a
// refresh — Firefox does this routinely.
updateBranches();


/* Picking any radio clears that group's red state straight away. */
form.querySelectorAll('input[type="radio"]').forEach(function (radio) {
  radio.addEventListener("change", function () {
    const fieldset = radio.closest(".choice-set");
    if (!fieldset) return;
    const errorEl = fieldset.querySelector(".error-text");
    if (errorEl) clearGroupError(fieldset, errorEl);
  });
});


/* ------------------------------------------------------------
   STEP 4 — The photograph
   ------------------------------------------------------------
   Two things happen to the picture before it is sent.

   First the preview: the person sees what they chose, which
   catches the wrong-photo mistake while it is still cheap.

   Then the shrink, on submit: the file is drawn into a canvas at
   a smaller size and read back as a JPEG. A 6 MB phone photo
   becomes roughly 250 KB. That matters because the whole thing
   travels as text inside one request, and because alumni will be
   filling this in on mobile data.
   ------------------------------------------------------------ */

/* Read a File into a data URL — "data:image/jpeg;base64,...."
   FileReader is used rather than URL.createObjectURL because the
   data URL can be handed straight to an <img>, previewed, and
   reused, with nothing to revoke afterwards. */
function readFileAsDataUrl(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onload = function () {
      resolve(reader.result);
    };
    reader.onerror = function () {
      reject(new Error("Gambar tidak dapat dibaca daripada peranti anda."));
    };
    reader.readAsDataURL(file);
  });
}

/* Turn a data URL into a loaded <img> element. */
function loadImage(dataUrl) {
  return new Promise(function (resolve, reject) {
    const img = new Image();
    img.onload = function () {
      resolve(img);
    };
    img.onerror = function () {
      reject(new Error("Fail ini bukan gambar yang boleh dibuka."));
    };
    img.src = dataUrl;
  });
}

/* Draw the image smaller and read it back as a JPEG data URL.
   If the picture is already small enough we keep the original
   bytes rather than re-compressing them for nothing. */
async function shrinkImage(file) {
  const maxSide = config.PHOTO_MAX_SIDE || 1400;
  const quality = config.PHOTO_QUALITY || 0.85;

  const originalDataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(originalDataUrl);

  const longestSide = Math.max(img.naturalWidth, img.naturalHeight);

  if (longestSide <= maxSide && file.size <= 1024 * 1024) {
    return { dataUrl: originalDataUrl, mimeType: file.type || "image/jpeg" };
  }

  const scale = Math.min(1, maxSide / longestSide);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);

  const ctx = canvas.getContext("2d");

  // A PNG or a photo with transparency would otherwise come out
  // with black edges once it becomes a JPEG, so we lay white down
  // underneath first.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return {
    dataUrl: canvas.toDataURL("image/jpeg", quality),
    mimeType: "image/jpeg",
  };
}

/* How many KB or MB is this many bytes? Just for the preview. */
function readableSize(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return Math.round(bytes / 1024) + " KB";
}

photoInput.addEventListener("change", async function () {
  const errorEl = document.getElementById("gambarError");
  clearFieldError(photoInput, errorEl);

  photoPreview.classList.add("is-hidden");
  photoPreviewImg.removeAttribute("src");
  photoMeta.textContent = "";

  const file = photoInput.files && photoInput.files[0];
  if (!file) return;

  // accept="image/*" filters the picker, but a file can still
  // arrive by other routes, so the type is checked here too.
  if (file.type && file.type.indexOf("image/") !== 0) {
    setFieldError(photoInput, errorEl, "Sila pilih fail gambar (JPG atau PNG).");
    photoInput.value = "";
    return;
  }

  const maxMb = config.PHOTO_MAX_MB || 15;
  if (file.size > maxMb * 1024 * 1024) {
    setFieldError(
      photoInput,
      errorEl,
      "Gambar terlalu besar (" + readableSize(file.size) + "). Maksimum " + maxMb + " MB."
    );
    photoInput.value = "";
    return;
  }

  try {
    const dataUrl = await readFileAsDataUrl(file);
    photoPreviewImg.src = dataUrl;
    photoMeta.textContent = file.name + " — " + readableSize(file.size);
    photoPreview.classList.remove("is-hidden");
  } catch (error) {
    setFieldError(photoInput, errorEl, error.message);
  }
});


/* ------------------------------------------------------------
   STEP 5 — Checking the answers
   ------------------------------------------------------------
   Five things are required, exactly as on the original survey:
   name, e-mail, programme, graduating session, and what the
   person did next. The photograph is required too.

   Everything inside the two branch sections is optional, so an
   alumnus who would rather not say what they earn can still
   send the form.
   ------------------------------------------------------------ */

function validate() {
  let firstProblem = null;

  /* ---- Nama ---- */
  const namaInput = document.getElementById("nama");
  const namaError = document.getElementById("namaError");
  const nama = namaInput.value.trim();

  if (nama === "") {
    setFieldError(namaInput, namaError, "Sila isi nama anda.");
    firstProblem = firstProblem || namaInput;
  } else if (nama.length < 3) {
    setFieldError(namaInput, namaError, "Nama kelihatan terlalu pendek.");
    firstProblem = firstProblem || namaInput;
  } else {
    clearFieldError(namaInput, namaError);
  }

  /* ---- Emel ---- */
  const emelInput = document.getElementById("emel");
  const emelError = document.getElementById("emelError");
  const emel = emelInput.value.trim();

  // Deliberately loose: something, an @, something, a dot,
  // something. Strict e-mail patterns reject valid addresses.
  const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emel);

  /* Optional — an alumnus without an e-mail address, or who would
     rather not give one, should still be recorded. But if they do
     type something it has to look like an address, because a typo
     is worse than a blank: it looks contactable and is not. */
  if (emel === "") {
    clearFieldError(emelInput, emelError);
  } else if (!looksLikeEmail) {
    setFieldError(emelInput, emelError, "Alamat emel ini tidak lengkap.");
    firstProblem = firstProblem || emelInput;
  } else {
    clearFieldError(emelInput, emelError);
  }

  /* ---- Lepasan Program ---- */
  const programError = document.getElementById("programError");
  const programSet = radioFieldset("program");

  if (radioValue("program") === "") {
    setGroupError(programSet, programError, "Sila pilih program anda.");
    firstProblem = firstProblem || programSet;
  } else {
    clearGroupError(programSet, programError);
  }

  /* ---- Tamat belajar: both halves, or neither counts ---- */
  const tamatError = document.getElementById("tamatError");
  const tamatSet = tamatSesi.closest(".choice-set");

  if (tamatSesi.value === "" || tamatTahun.value === "") {
    setGroupError(tamatSet, tamatError, "Sila pilih sesi dan tahun anda tamat belajar.");
    tamatSesi.classList.add("input-error");
    tamatTahun.classList.add("input-error");
    firstProblem = firstProblem || tamatSesi;
  } else {
    clearGroupError(tamatSet, tamatError);
    tamatSesi.classList.remove("input-error");
    tamatTahun.classList.remove("input-error");
  }

  /* ---- Apa yang anda lakukan ---- */
  const statusError = document.getElementById("statusError");
  const statusSet = radioFieldset("status");

  if (radioValue("status") === "") {
    setGroupError(statusSet, statusError, "Sila pilih satu jawapan.");
    firstProblem = firstProblem || statusSet;
  } else {
    clearGroupError(statusSet, statusError);
  }

  /* ---- The branch questions ----
     Each is required, but ONLY while its section is on screen. A
     hidden field must never be able to block a submission — an
     error nobody can see is an error nobody can fix.

     Two small helpers, because the same shape repeats six times
     and six copies is six chances to get one of them wrong. */

  function requireText(id, message, sectionVisible) {
    const input = document.getElementById(id);
    const errorEl = document.getElementById(id + "Error");

    if (sectionVisible && input.value.trim() === "") {
      setFieldError(input, errorEl, message);
      firstProblem = firstProblem || input;
    } else {
      clearFieldError(input, errorEl);
    }
  }

  function requireChoice(name, message, sectionVisible) {
    const fieldset = radioFieldset(name);
    const errorEl = document.getElementById(name + "Error");
    if (!fieldset || !errorEl) return;

    if (sectionVisible && radioValue(name) === "") {
      setGroupError(fieldset, errorEl, message);
      firstProblem = firstProblem || fieldset;
    } else {
      clearGroupError(fieldset, errorEl);
    }
  }

  // Sambung Belajar
  const studying = !branchStudy.hidden;
  requireText("programSambung", "Sila nyatakan program yang anda sambung.", studying);
  requireText("institusi", "Sila nyatakan nama institusi anda.", studying);

  // Bekerja
  const working = !branchWork.hidden;
  requireText("syarikat", "Sila nyatakan nama syarikat anda.", working);
  requireText("jawatan", "Sila nyatakan posisi atau jawatan anda.", working);
  requireChoice("gaji", "Sila pilih julat gaji anda.", working);
  requireChoice("komposit", "Sila pilih sama ada ia berkaitan bidang komposit.", working);

  /* ---- Gambar ----
     Not required of anybody. A missing photograph must never stop
     an alumnus from being recorded — the answers are worth more
     than the picture. The file picker still refuses a file that is
     not an image or is too large; that check lives in the change
     handler above and is about bad files, not missing ones. */
  clearFieldError(photoInput, document.getElementById("gambarError"));

  return firstProblem;
}


/* ------------------------------------------------------------
   STEP 6 — Sending it
   ------------------------------------------------------------
   The request goes out as Content-Type "text/plain". That is
   deliberate: it keeps the request "simple" in the browser's
   eyes, so no CORS preflight is sent — and an Apps Script web
   app cannot answer a preflight. The body is still JSON, and
   alumni-Code.gs parses it as JSON at the other end.
   ------------------------------------------------------------ */

async function sendToSheet(payload) {
  const url = config.SCRIPT_URL;

  if (!url) {
    throw new Error(
      "SCRIPT_URL masih kosong dalam alumni-config.js — borang belum disambung ke Google Sheet."
    );
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });

  // Apps Script answers with 200 and a JSON body even for its own
  // errors, so both the status AND the body have to be checked.
  const text = await response.text();

  if (!response.ok) {
    throw new Error("HTTP " + response.status + " — " + text.slice(0, 200));
  }

  let result;
  try {
    result = JSON.parse(text);
  } catch (error) {
    // Almost always the Google sign-in page coming back as HTML,
    // which means the deployment is not set to "Anyone".
    throw new Error(
      "Jawapan bukan JSON. Semak tetapan deployment (Who has access: Anyone). " +
        text.slice(0, 120)
    );
  }

  if (!result.ok) {
    throw new Error(result.error || "Apps Script menolak permintaan ini.");
  }

  return result;
}


form.addEventListener("submit", async function (event) {
  // Stop the browser reloading the page, which is what a form
  // does if left to itself.
  event.preventDefault();

  errorMessage.classList.add("is-hidden");
  successMessage.classList.add("is-hidden");

  const firstProblem = validate();

  if (firstProblem) {
    firstProblem.scrollIntoView({ behavior: "smooth", block: "center" });
    // A fieldset cannot take focus, so only focus real inputs.
    if (typeof firstProblem.focus === "function" && firstProblem.tagName === "INPUT") {
      firstProblem.focus();
    }
    return;
  }

  submitButton.disabled = true;

  try {
    // No photograph on the "Menganggur" path, so there is nothing
    // to shrink and the picture fields go up empty.
    let photo = { dataUrl: "", mimeType: "" };

    if (photoInput.files && photoInput.files.length > 0 && !branchPhoto.hidden) {
      setStatus("Memproses gambar…");
      photo = await shrinkImage(photoInput.files[0]);
    }

    setStatus("Menghantar…");

    const payload = {
      token: config.SHARED_TOKEN,

      nama: document.getElementById("nama").value.trim(),
      emel: document.getElementById("emel").value.trim(),
      program: radioValue("program"),
      // The two dropdowns join into the one phrase the sheet has
      // always held: "Sesi Julai 2019".
      tamat: "Sesi " + tamatSesi.value + " " + tamatTahun.value,
      status: radioValue("status"),

      // Sambung Belajar — empty strings when that section is hidden
      programSambung: document.getElementById("programSambung").value.trim(),
      institusi: document.getElementById("institusi").value.trim(),
      tajaan: radioValue("tajaan"),

      // Bekerja — likewise
      syarikat: document.getElementById("syarikat").value.trim(),
      jawatan: document.getElementById("jawatan").value.trim(),
      gaji: radioValue("gaji"),
      syarikatKe: radioValue("syarikatKe"),
      komposit: radioValue("komposit"),

      // The picture, as text
      photoDataUrl: photo.dataUrl,
      photoMimeType: photo.mimeType,
    };

    await sendToSheet(payload);

    // ---- It worked ----
    setStatus("");
    form.reset();
    clearPhoto();
    updateBranches();

    successMessage.classList.remove("is-hidden");
    successMessage.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (error) {
    setStatus("");
    // The real message, every time — see showError above.
    showError(
      "Maklumat anda tidak dapat dihantar.",
      error && error.message ? error.message : String(error)
    );
  } finally {
    submitButton.disabled = false;
  }
});


/* ------------------------------------------------------------
   STEP 7 — The share button
   ------------------------------------------------------------
   On a phone this opens the normal share sheet, which is how
   alumni will actually pass this on — WhatsApp. On a desktop it
   copies the link instead.
   ------------------------------------------------------------ */

function getShareUrl() {
  // The tidy address, not whatever happens to be in the bar.
  return "https://www.farizuljaafar.com/alumni";
}

function showShareStatus(message) {
  shareStatus.textContent = message;
  shareStatus.classList.remove("is-hidden");
  window.setTimeout(function () {
    shareStatus.classList.add("is-hidden");
  }, 4000);
}

shareButton.addEventListener("click", async function () {
  const url = getShareUrl();

  const shareData = {
    title: "Kaji Selidik Alumni — TVETMARA Masjid Tanah",
    text: "Alumni DTP & IAC, sila isi borang ini:",
    url: url,
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch (error) {
      // "AbortError" just means they tapped Cancel.
      if (error && error.name === "AbortError") return;
    }
  }

  // Clipboard access needs a secure context; it fails on plain
  // http, so the link is shown as a fallback either way.
  try {
    await navigator.clipboard.writeText(url);
    showShareStatus("Pautan telah disalin.");
  } catch (error) {
    showShareStatus(url);
  }
});
