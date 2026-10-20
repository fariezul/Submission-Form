/* ============================================================
   ALUMNI SURVEY — Google Sheets backend
   ============================================================
   This script belongs to the alumni page at
   https://www.farizuljaafar.com/alumni

   Keep it attached to its own spreadsheet. It has nothing to do
   with the quiz sheets, and it must not be pasted over them.

   ------------------------------------------------------------
   SETUP — about ten minutes, once
   ------------------------------------------------------------
   The spreadsheet already exists and its ID is already filled in
   below: "Alumni DTP IAC — Responses", in your Drive. So:

   1. Open that sheet, then: Extensions -> Apps Script.
   2. Delete whatever is in Code.gs and paste this whole file in.
   3. Save.
   4. Run -> choose "setup" -> Run. Approve the permission prompt.
      This creates the Responses tab with its headings, and a
      Drive folder for the photographs.
      The folder is named by PHOTO_FOLDER_NAME below and will sit
      in the top level of your Drive.
   5. Deploy -> New deployment -> gear icon -> Web app.
         Description:     Alumni survey
         Execute as:      Me
         Who has access:  Anyone           <-- must be "Anyone"
      Deploy, approve, then COPY THE WEB APP URL.
   6. Paste that URL into SCRIPT_URL in alumni-config.js, and
      push the site.

   IF YOU EVER EDIT THIS FILE you must redeploy:
   Deploy -> Manage deployments -> edit (pencil) -> Version: New
   version -> Deploy. Otherwise the page keeps talking to the old
   code. This catches everybody once.

   ------------------------------------------------------------
   WHY THE ODD CONTENT TYPE
   ------------------------------------------------------------
   The page posts with Content-Type "text/plain". That is
   deliberate: it keeps the request "simple" in the browser's
   eyes, so no CORS preflight is sent — and Apps Script cannot
   answer a preflight. The body is still JSON; we parse it here.

   ------------------------------------------------------------
   HOW EXPOSED IS THIS?
   ------------------------------------------------------------
   The Web App URL sits in the page's JavaScript, so anyone who
   views source can find it. What it can DO is deliberately
   narrow: append one row and save one picture. There is no read
   endpoint at all — the answers can only be seen by opening the
   sheet, which stays private to you. Nothing here deletes
   anything, and it cannot reach your other sheets.

   SHARED_TOKEN is checked on every write. It is in the page too,
   so it is a speed bump against drive-by junk, not a secret. If
   the sheet ever fills with nonsense, change it here and in
   alumni-config.js at the same time, then redeploy.

   ------------------------------------------------------------
   ABOUT THE PHOTOGRAPHS
   ------------------------------------------------------------
   Each picture is saved into one Drive folder and the row stores
   a link to it. The files are NOT shared publicly: only you, as
   the owner of the folder, can open them. That is the right
   default for pictures of named former students — if you later
   want a public alumni gallery, share that gallery deliberately
   rather than leaving the whole folder open.
   ============================================================ */

var SHARED_TOKEN = 'alumni-dtp-iac-2026';

/* The ID of the alumni spreadsheet — "Alumni DTP IAC — Responses",
   in the top level of your Drive. If you ever move to a different
   sheet, this is the line to change. */
var SPREADSHEET_ID = '11wVpcR__vErrRNDC8ZtiDzNcuEWLmXKQ8_2RvL9KDLM';

var RESPONSES_SHEET = 'Responses';
var PHOTO_FOLDER_NAME = 'Alumni DTP IAC — Gambar';

/* Largest picture the script will accept, in megabytes, after
   the page has already shrunk it. A normal submission is around
   0.25 MB; this is simply a ceiling so one bad request cannot
   fill the Drive. */
var PHOTO_MAX_MB = 10;


var HEADERS = [
  'timestamp',
  'nama',
  'emel',
  'program',
  'tamat_belajar',
  'status_selepas_tamat',
  'program_sambungan',
  'institusi',
  'tajaan',
  'nama_tajaan',
  'syarikat',
  'jawatan',
  'julat_gaji',
  'syarikat_ke',
  'kaitan_komposit',
  'gambar'
];


function alumniSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}


/* ------------------------------------------------------------
   Run this once from the editor.
   ------------------------------------------------------------ */
function setup() {
  var ss = alumniSpreadsheet();

  /* A new spreadsheet is born in whatever timezone Google felt like,
     which for this account was US Pacific. The timestamp column is a
     real Date, so it is DISPLAYED in the sheet's timezone — leave it
     and every row reads eight hours early. */
  ss.setSpreadsheetTimeZone('Asia/Kuala_Lumpur');

  ensureSheet(ss, RESPONSES_SHEET, HEADERS);
  var folder = photoFolder();
  return 'Ready. Photos will go to "' + folder.getName() + '". Now deploy as a Web App.';
}


function ensureSheet(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);

  if (sh.getLastRow() === 0) {
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}


/* The Drive folder for the pictures.
   ------------------------------------------------------------
   Found by name, created only if it does not already exist, so
   running setup() twice does not leave you with two folders.
   ------------------------------------------------------------ */
function photoFolder() {
  var existing = DriveApp.getFoldersByName(PHOTO_FOLDER_NAME);
  if (existing.hasNext()) return existing.next();
  return DriveApp.createFolder(PHOTO_FOLDER_NAME);
}


function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


/* Trim a value to a sane length before it goes in the sheet. A
   public endpoint should never write an unbounded string. */
function clean(value, maxLength) {
  return String(value === undefined || value === null ? '' : value).slice(0, maxLength || 200);
}


/* ------------------------------------------------------------
   Save one picture, return a link to it.
   ------------------------------------------------------------
   The page sends the photograph as a data URL:
     data:image/jpeg;base64,/9j/4AAQSk....
   We split off the header, decode the rest, and write the bytes
   to Drive under a filename that says who sent it and when.
   ------------------------------------------------------------ */
function savePhoto(dataUrl, mimeType, nama) {
  if (!dataUrl) return '';

  var match = String(dataUrl).match(/^data:([^;]+);base64,(.*)$/);
  if (!match) throw new Error('Gambar tidak sah (bukan data URL).');

  /* The type is taken from the data URL itself, NOT from the
     separate photoMimeType the page sends. Both arrive from a
     public page and neither can be trusted, but the data URL
     header is the one that actually describes the bytes that
     follow it. Reading the other one first would let a text
     file labelled "image/jpeg" straight through. */
  var type = match[1] || mimeType || 'image/jpeg';
  if (type.indexOf('image/') !== 0) throw new Error('Fail yang dihantar bukan gambar.');

  var base64 = match[2];

  /* base64 is about 4 characters for every 3 bytes, so this
     estimates the real size without decoding first. */
  var approxBytes = base64.length * 0.75;
  if (approxBytes > PHOTO_MAX_MB * 1024 * 1024) {
    throw new Error('Gambar terlalu besar.');
  }

  var extension = type === 'image/png' ? 'png' : (type === 'image/webp' ? 'webp' : 'jpg');

  var safeName = clean(nama, 60).replace(/[^\w\s.-]/g, '').trim() || 'alumni';
  var stamp = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyyMMdd-HHmmss');
  var filename = safeName + ' — ' + stamp + '.' + extension;

  var blob = Utilities.newBlob(Utilities.base64Decode(base64), type, filename);
  var file = photoFolder().createFile(blob);

  /* No setSharing call here — the file stays private to you.
     See "ABOUT THE PHOTOGRAPHS" at the top of this file. */
  return file.getUrl();
}


/* ============================================================
   THE ONLY ENDPOINT: one submission in, one row out
   ============================================================ */
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    if (body.token !== SHARED_TOKEN) {
      return json({ ok: false, error: 'bad token' });
    }

    /* Required on the page, so required here too. A public
       endpoint cannot assume the page did its job. */
    if (clean(body.nama, 120).trim() === '') {
      return json({ ok: false, error: 'nama kosong' });
    }

    /* Two alumni submitting in the same second would otherwise
       race for the same row. The lock makes appends queue
       instead of collide. */
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);

    try {
      /* The picture is saved FIRST. If Drive refuses, the error
         travels back to the page and no half-row is written
         claiming a photograph that does not exist. */
      var photoUrl = savePhoto(body.photoDataUrl, body.photoMimeType, body.nama);

      ensureSheet(alumniSpreadsheet(), RESPONSES_SHEET, HEADERS).appendRow([
        new Date(),
        clean(body.nama, 120),
        clean(body.emel, 120),
        clean(body.program, 120),
        clean(body.tamat, 60),
        clean(body.status, 80),
        clean(body.programSambung, 150),
        clean(body.institusi, 150),
        clean(body.tajaan, 60),
        clean(body.namaTajaan, 120),
        clean(body.syarikat, 150),
        clean(body.jawatan, 120),
        clean(body.gaji, 40),
        clean(body.syarikatKe, 30),
        clean(body.komposit, 10),
        photoUrl
      ]);

      return json({ ok: true });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}


/* ------------------------------------------------------------
   There is deliberately no read endpoint.
   ------------------------------------------------------------
   Opening the Web App URL in a browser should not hand anybody
   the alumni list, so a GET says only that the script is alive.
   ------------------------------------------------------------ */
function doGet() {
  return json({ ok: true, service: 'alumni', message: 'POST only.' });
}
