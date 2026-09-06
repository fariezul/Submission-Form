/* ============================================================
   Zero Waste Sprint — Google Sheets backend
   ============================================================
   This replaces Supabase for Activity 4. It exists because a free
   Supabase project pauses after about a week of quiet, and the
   first class back finds every result silently failing to save.
   A Google Sheet never sleeps.

   ------------------------------------------------------------
   SETUP — about five minutes, once
   ------------------------------------------------------------
   1. Create a new Google Sheet. Name it whatever you like.
   2. Extensions -> Apps Script.
   3. Delete whatever is in Code.gs and paste this whole file in.
   4. Save.
   5. Run -> choose "setup" -> Run. Approve the permission prompt.
      This creates the two tabs with their headings.
   6. Deploy -> New deployment -> gear icon -> Web app.
         Description:     Zero Waste Sprint
         Execute as:      Me
         Who has access:  Anyone           <-- must be "Anyone"
      Deploy, approve, then COPY THE WEB APP URL.
   7. Paste that URL into quiz4/quiz-config.js.

   IF YOU EVER EDIT THIS FILE you must redeploy:
   Deploy -> Manage deployments -> edit (pencil) -> Version: New
   version -> Deploy. Otherwise the quiz keeps talking to the old
   code. This catches everybody once.

   ------------------------------------------------------------
   WHY THE ODD CONTENT TYPE
   ------------------------------------------------------------
   The quiz posts with Content-Type "text/plain". That is
   deliberate: it keeps the request "simple" in the browser's
   eyes, so no CORS preflight is sent — and Apps Script cannot
   answer a preflight. The body is still JSON; we parse it here.

   ------------------------------------------------------------
   HOW EXPOSED IS THIS?
   ------------------------------------------------------------
   The Web App URL sits in the page's JavaScript, so anyone who
   views source can find it — exactly like the Supabase anon key
   on Activity 3. What it can do is deliberately narrow: append a
   row, or read back a leaderboard and a scoreboard. It cannot
   reach your other sheets, and nothing here deletes anything.

   SHARED_TOKEN is checked on writes. It is in the page too, so it
   is a speed bump against drive-by junk, not a secret. If the
   sheet ever fills with nonsense, change it here and in
   quiz-config.js at the same time, then redeploy.
   ============================================================ */

var SHARED_TOKEN = 'zws-2026-iqa10063';

var ATTEMPTS_SHEET = 'Attempts';
var VISITS_SHEET   = 'Visits';

var ATTEMPT_HEADERS = [
  'timestamp', 'session_id', 'attempt_number', 'student_name', 'class_name',
  'score', 'total_questions', 'percentage', 'duration_seconds',
  'completed', 'timed_out', 'question_set', 'responses'
];

var VISIT_HEADERS = ['timestamp', 'page', 'device'];


/* ------------------------------------------------------------
   Run this once from the editor to create the tabs.
   ------------------------------------------------------------ */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet(ss, ATTEMPTS_SHEET, ATTEMPT_HEADERS);
  ensureSheet(ss, VISITS_SHEET, VISIT_HEADERS);
  return 'Ready. Now deploy as a Web App.';
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

function sheet(name, headers) {
  return ensureSheet(SpreadsheetApp.getActiveSpreadsheet(), name, headers);
}

function json(obj, callback) {
  var body = JSON.stringify(obj);

  /* JSONP when a callback name is given. The reads need it:
     Apps Script redirects a GET to googleusercontent.com, and
     that hop does not reliably carry CORS headers, so fetch can
     be refused permission to read a response that arrived
     perfectly well. A script tag has no such rule.

     The name is stripped to letters, digits and underscores
     before being echoed back, so nothing arbitrary can be
     injected into the page that loads it. */
  if (callback) {
    var safe = String(callback).replace(/[^A-Za-z0-9_]/g, "").slice(0, 64);
    if (safe) {
      return ContentService
        .createTextOutput(safe + "(" + body + ");")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
  }

  return ContentService
    .createTextOutput(body)
    .setMimeType(ContentService.MimeType.JSON);
}


/* ============================================================
   WRITES
   ============================================================ */
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    if (body.token !== SHARED_TOKEN) {
      return json({ ok: false, error: 'bad token' });
    }

    /* Two students finishing in the same second would otherwise
       race for the same row. The lock makes appends queue instead
       of collide. 20 s is generous — a class of 40 finishing
       together still clears easily. */
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);

    try {
      if (body.kind === 'visit') {
        sheet(VISITS_SHEET, VISIT_HEADERS).appendRow([
          new Date(),
          String(body.page || 'activity-4').slice(0, 40),
          body.is_mobile ? 'phone' : 'desktop'
        ]);
        return json({ ok: true });
      }

      var a = body.attempt || {};

      /* The same rule the database enforced on Activity 3: a row
         may not claim completion unless the score really is full
         marks. Recomputed here rather than trusted, because the
         page that sent it is public. */
      var score = Number(a.score) || 0;
      var total = Number(a.total_questions) || 20;
      var completed = (score === total);

      sheet(ATTEMPTS_SHEET, ATTEMPT_HEADERS).appendRow([
        new Date(),
        String(a.session_id || '').slice(0, 40),
        Number(a.attempt_number) || 1,
        String(a.student_name || '').slice(0, 80),
        String(a.class_name || '').slice(0, 40),
        score,
        total,
        Number(a.percentage) || 0,
        Math.max(0, Math.min(Number(a.duration_seconds) || 0, 3600)),
        completed,
        a.timed_out === true,
        JSON.stringify(a.question_set || []),
        JSON.stringify(a.responses || [])
      ]);

      return json({ ok: true });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}


/* ============================================================
   READS
   ============================================================
   Both return scores only — never the stored responses — so
   nothing revealing which questions a student missed ever leaves
   the sheet.
   ============================================================ */
function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = String(params.action || '').toLowerCase();
    var limit = Math.max(1, Math.min(Number(params.limit) || 15, 50));
    var cb = params.callback;

    if (action === 'leaderboard') return json({ ok: true, rows: leaderboard(limit) }, cb);
    if (action === 'recent')      return json({ ok: true, rows: recent(limit) }, cb);
    if (action === 'ping')        return json({ ok: true, pong: true }, cb);

    return json({ ok: false, error: 'unknown action' }, cb);
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function readAttempts() {
  var sh = sheet(ATTEMPTS_SHEET, ATTEMPT_HEADERS);
  var last = sh.getLastRow();
  if (last < 2) return [];

  // Columns 1..11 only — question_set and responses are columns
  // 12 and 13 and are deliberately never read here.
  var values = sh.getRange(2, 1, last - 1, 11).getValues();

  return values.map(function (r) {
    return {
      at: r[0],
      name: String(r[3]),
      klass: String(r[4]),
      score: Number(r[5]),
      total: Number(r[6]),
      percentage: Number(r[7]),
      duration: Number(r[8]),
      completed: r[9] === true || String(r[9]).toLowerCase() === 'true',
      timedOut: r[10] === true || String(r[10]).toLowerCase() === 'true'
    };
  });
}

/* Fastest perfect scores, one row per student (their best time),
   so one quick student cannot fill every place. */
function leaderboard(limit) {
  var best = {};

  readAttempts().forEach(function (r) {
    if (!r.completed || r.score !== r.total) return;
    var key = (r.name + '|' + r.klass).toLowerCase().replace(/\s+/g, ' ').trim();
    if (!best[key] || r.duration < best[key].duration_seconds) {
      best[key] = {
        student_name: r.name,
        class_name: r.klass,
        duration_seconds: r.duration,
        achieved_at: r.at
      };
    }
  });

  return Object.keys(best)
    .map(function (k) { return best[k]; })
    .sort(function (a, b) { return a.duration_seconds - b.duration_seconds; })
    .slice(0, limit)
    .map(function (row, i) { row.rank = i + 1; return row; });
}

/* The live class scoreboard: newest attempts, pass or fail. */
function recent(limit) {
  var all = readAttempts();
  return all
    .slice(Math.max(0, all.length - limit))
    .reverse()
    .map(function (r) {
      return {
        student_name: r.name,
        class_name: r.klass,
        score: r.score,
        total_questions: r.total,
        percentage: r.percentage,
        duration_seconds: r.duration,
        completed: r.completed,
        timed_out: r.timedOut,
        attempted_at: r.at
      };
    });
}
