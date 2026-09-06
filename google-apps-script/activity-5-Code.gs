/* ============================================================
   Flight Line (Activity 5) — Google Sheets backend
   ============================================================
   Four students tap "done" on four phones. This script collects
   those taps and hands them back to the dashboard, which is how
   five devices in a classroom see one production line.

   It is a sibling of activity-4-Code.gs and uses the same two
   CORS tricks for the same reasons. If you have set that one up,
   this will feel familiar.

   ------------------------------------------------------------
   SETUP — about five minutes, once
   ------------------------------------------------------------
   1. Create a new Google Sheet. Name it whatever you like.
      Use a NEW sheet, not the Activity 4 one — this script
      creates its own tabs and they should not share.
   2. Extensions -> Apps Script.
   3. Delete whatever is in Code.gs and paste this whole file in.
   4. Save.
   5. Run -> choose "setup" -> Run. Approve the permission prompt.
      This creates the three tabs with their headings.
   6. Deploy -> New deployment -> gear icon -> Web app.
         Description:     Flight Line
         Execute as:      Me
         Who has access:  Anyone           <-- must be "Anyone"
      Deploy, approve, then COPY THE WEB APP URL.
   7. Paste that URL into production-coordination/line5/line-config.js
      as SCRIPT_URL.

   IF YOU EVER EDIT THIS FILE you must redeploy:
   Deploy -> Manage deployments -> edit (pencil) -> Version: New
   version -> Deploy. Otherwise the activity keeps talking to the
   old code. This catches everybody once.

   ------------------------------------------------------------
   YOU DO NOT NEED ANY OF THIS TO RUN THE ACTIVITY
   ------------------------------------------------------------
   Leave SCRIPT_URL as the placeholder and the dashboard still
   works completely, in solo mode, with all four buttons on one
   screen. The sheet only buys you the four phones.

   ------------------------------------------------------------
   THE TWO THINGS THIS SCRIPT IS TRUSTED WITH
   ------------------------------------------------------------
   1. THE CLOCK. Every reply carries this server's time, and the
      devices measure themselves against it. That is what stops
      four phones with four slightly different clocks producing a
      line where a plane leaves Folding before Marking finished
      it. It matters more than anything else here.

   2. THE ROUND NUMBER. The server decides it, not the laptop, so
      running the dashboard from a different machine does not
      restart the numbering and overwrite last week's round.

   ------------------------------------------------------------
   WHY THE ODD CONTENT TYPE
   ------------------------------------------------------------
   The pages post with Content-Type "text/plain". That is
   deliberate: it keeps the request "simple" in the browser's
   eyes, so no CORS preflight is sent — and Apps Script cannot
   answer a preflight. The body is still JSON; we parse it here.

   ------------------------------------------------------------
   HOW EXPOSED IS THIS?
   ------------------------------------------------------------
   The Web App URL sits in the page's JavaScript, so anyone who
   views source can find it. What it can do is deliberately
   narrow: append a row, or read back one round of taps. It cannot
   reach your other sheets, and nothing here deletes anything —
   an undo is a new row that points at an old one, never a
   deletion.

   SHARED_TOKEN is checked on writes. It is in the page too, so it
   is a speed bump against drive-by junk, not a secret. If the
   sheet ever fills with nonsense, change it here and in
   line-config.js at the same time, then redeploy.
   ============================================================ */

var SHARED_TOKEN = 'flightline-2026-iqa10063';

var ROUNDS_SHEET = 'Rounds';
var EVENTS_SHEET = 'Events';
var VISITS_SHEET = 'Visits';

var ROUND_HEADERS = [
  'timestamp', 'code', 'round_no', 'started_at_ms', 'item_count',
  'takt_ms', 'stations', 'status', 'ended_at_ms', 'notes'
];

var EVENT_HEADERS = [
  'timestamp', 'code', 'round_no', 'event_id', 'seq', 'kind',
  'station', 'item', 'elapsed_ms', 'verdict', 'cause', 'target_id', 'device_at'
];

var VISIT_HEADERS = ['timestamp', 'page', 'device'];

/* A long round on a busy sheet should not make the dashboard
   re-read a term's worth of history every ten seconds. Only the
   most recent rows are scanned; 20000 is roughly fifty full
   rounds, which is far more than any single lesson. */
var MAX_SCAN_ROWS = 20000;


/* ------------------------------------------------------------
   Run this once from the editor to create the tabs.
   ------------------------------------------------------------ */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet(ss, ROUNDS_SHEET, ROUND_HEADERS);
  ensureSheet(ss, EVENTS_SHEET, EVENT_HEADERS);
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


/* ------------------------------------------------------------
   Every reply carries the server clock. See note 1 at the top —
   this single field is what keeps four phones honest.
   ------------------------------------------------------------ */
function json(obj, callback) {
  obj.server_now = Date.now();
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
    var safe = String(callback).replace(/[^A-Za-z0-9_]/g, '').slice(0, 64);
    if (safe) {
      return ContentService
        .createTextOutput(safe + '(' + body + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
  }

  return ContentService
    .createTextOutput(body)
    .setMimeType(ContentService.MimeType.JSON);
}

function clean(v, max) {
  return String(v === null || v === undefined ? '' : v).slice(0, max || 80);
}

function num(v, fallback) {
  var n = Number(v);
  return isFinite(n) ? n : (fallback === undefined ? null : fallback);
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

    /* Four phones tapping in the same second would otherwise race
       for the same row. The lock makes appends queue instead of
       collide. Twenty seconds is generous — a whole class
       finishing together still clears easily. */
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);

    try {
      if (body.kind === 'visit') return doVisit(body);
      if (body.kind === 'round_start') return doRoundStart(body);
      if (body.kind === 'round_end') return doRoundEnd(body);
      if (body.kind === 'notes') return doNotes(body);
      if (body.kind === 'events') return doEvents(body);
      return json({ ok: false, error: 'unknown kind' });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}


function doVisit(body) {
  sheet(VISITS_SHEET, VISIT_HEADERS).appendRow([
    new Date(),
    clean(body.page || 'activity-5', 40),
    body.is_mobile ? 'phone' : 'desktop'
  ]);
  return json({ ok: true });
}


/* ------------------------------------------------------------
   Starting a round.
   ------------------------------------------------------------
   THE SERVER decides two things the devices must not:

     started_at_ms — time zero, so all five devices count from
                     one instant rather than from whenever each
                     of them noticed.
     round_no      — one past the highest this code has used, so
                     running the dashboard from another laptop
                     does not restart the numbering and collide
                     with a round that already exists.

   Any round still marked live on this code is closed first. A
   teacher who forgets to press "End round" and simply starts the
   next one should not end up with two live rounds and a
   dashboard that cannot tell which is which.
   ------------------------------------------------------------ */
function doRoundStart(body) {
  var r = body.round || {};
  var code = clean(r.code, 12).toUpperCase();
  if (!code) return json({ ok: false, error: 'no code' });

  var sh = sheet(ROUNDS_SHEET, ROUND_HEADERS);
  var rows = readRounds(sh);

  var highest = 0;
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].code !== code) continue;
    if (rows[i].round_no > highest) highest = rows[i].round_no;
    if (rows[i].status === 'live') {
      sh.getRange(rows[i].row, 8).setValue('ended');
      sh.getRange(rows[i].row, 9).setValue(Date.now());
    }
  }

  var startedAt = Date.now();
  var roundNo = highest + 1;

  sh.appendRow([
    new Date(),
    code,
    roundNo,
    startedAt,
    num(r.item_count, 20),
    num(r.takt_ms, ''),
    JSON.stringify(r.stations || []),
    'live',
    '',
    ''
  ]);

  return json({
    ok: true,
    round: {
      code: code,
      round_no: roundNo,
      started_at_ms: startedAt,
      item_count: num(r.item_count, 20),
      takt_ms: num(r.takt_ms, null),
      status: 'live'
    }
  });
}


function doRoundEnd(body) {
  var code = clean(body.code, 12).toUpperCase();
  var roundNo = num(body.round_no, 0);
  var sh = sheet(ROUNDS_SHEET, ROUND_HEADERS);
  var rows = readRounds(sh);

  for (var i = 0; i < rows.length; i++) {
    if (rows[i].code === code && rows[i].round_no === roundNo) {
      sh.getRange(rows[i].row, 8).setValue('ended');
      sh.getRange(rows[i].row, 9).setValue(Date.now());
      if (body.notes) sh.getRange(rows[i].row, 10).setValue(clean(body.notes, 4000));
      return json({ ok: true });
    }
  }
  return json({ ok: false, error: 'round not found' });
}


function doNotes(body) {
  var code = clean(body.code, 12).toUpperCase();
  var roundNo = num(body.round_no, 0);
  var sh = sheet(ROUNDS_SHEET, ROUND_HEADERS);
  var rows = readRounds(sh);

  for (var i = 0; i < rows.length; i++) {
    if (rows[i].code === code && rows[i].round_no === roundNo) {
      sh.getRange(rows[i].row, 10).setValue(clean(body.notes, 4000));
      return json({ ok: true });
    }
  }
  return json({ ok: false, error: 'round not found' });
}


/* ------------------------------------------------------------
   The taps.
   ------------------------------------------------------------
   Arrive in batches, because a phone that has been offline for
   two minutes should upload its backlog in one request rather
   than eight.

   Every tap carries a globally unique event_id, so a batch that
   is sent twice — a flaky connection, a retry that actually did
   get through the first time — appends the same rows twice and
   the dashboard still counts each tap once. Duplicates are
   filtered on read rather than on write, because checking for
   them here would mean reading the whole sheet on every upload.
   ------------------------------------------------------------ */
function doEvents(body) {
  var code = clean(body.code, 12).toUpperCase();
  var roundNo = num(body.round_no, 0);
  var list = body.events || [];
  if (!list.length) return json({ ok: true, saved: 0 });

  // A malformed or hostile request should not be able to write a
  // thousand rows in one go.
  if (list.length > 200) list = list.slice(0, 200);

  var sh = sheet(EVENTS_SHEET, EVENT_HEADERS);
  var rows = [];
  var now = new Date();

  for (var i = 0; i < list.length; i++) {
    var ev = list[i];
    if (!ev || !ev.id) continue;
    rows.push([
      now,
      code,
      roundNo,
      clean(ev.id, 40),
      num(ev.seq, 0),
      clean(ev.k, 12),
      (ev.st === null || ev.st === undefined) ? '' : num(ev.st, ''),
      (ev.item === null || ev.item === undefined) ? '' : num(ev.item, ''),
      (ev.ms === null || ev.ms === undefined) ? '' : num(ev.ms, ''),
      clean(ev.v || '', 10),
      (ev.c === null || ev.c === undefined) ? '' : num(ev.c, ''),
      clean(ev.t || '', 40),
      num(ev.at, '')
    ]);
  }

  if (rows.length) {
    // One setValues beats appendRow in a loop by a wide margin,
    // and a phone uploading a backlog of forty taps is exactly
    // when that matters.
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, EVENT_HEADERS.length)
      .setValues(rows);
  }

  return json({ ok: true, saved: rows.length });
}


/* ============================================================
   READS
   ============================================================ */
function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = String(params.action || '').toLowerCase();
    var cb = params.callback;

    if (action === 'ping') return json({ ok: true, pong: true }, cb);
    if (action === 'round') return getRound(params, cb);
    if (action === 'rounds') return getRounds(params, cb);

    return json({ ok: false, error: 'unknown action' }, cb);
  } catch (err) {
    return json({ ok: false, error: String(err) }, (e && e.parameter) ? e.parameter.callback : null);
  }
}


function readRounds(sh) {
  var last = sh.getLastRow();
  if (last < 2) return [];

  var first = Math.max(2, last - MAX_SCAN_ROWS + 1);
  var values = sh.getRange(first, 1, last - first + 1, ROUND_HEADERS.length).getValues();

  return values.map(function (v, i) {
    return {
      row: first + i,
      code: String(v[1]).toUpperCase(),
      round_no: Number(v[2]) || 0,
      started_at_ms: Number(v[3]) || null,
      item_count: Number(v[4]) || 20,
      takt_ms: v[5] === '' ? null : Number(v[5]),
      stations: String(v[6] || ''),
      status: String(v[7] || 'live'),
      ended_at_ms: v[8] === '' ? null : Number(v[8]),
      notes: String(v[9] || '')
    };
  });
}


/* The dashboard's ten-second question: what is going on, and what
   has been tapped so far? Both answers in one request, because
   two would double the cost for no benefit. */
function getRound(params, cb) {
  var code = clean(params.code, 12).toUpperCase();
  if (!code) return json({ ok: false, error: 'no code' }, cb);

  var wanted = params.round_no ? Number(params.round_no) : null;
  var rounds = readRounds(sheet(ROUNDS_SHEET, ROUND_HEADERS));

  var found = null;
  for (var i = 0; i < rounds.length; i++) {
    if (rounds[i].code !== code) continue;
    if (wanted !== null) {
      if (rounds[i].round_no === wanted) found = rounds[i];
    } else if (!found || rounds[i].round_no >= found.round_no) {
      // No round asked for: the newest one. That is how a station
      // phone finds the round it should be joining.
      found = rounds[i];
    }
  }

  if (!found) return json({ ok: true, round: null, events: [] }, cb);

  return json({
    ok: true,
    round: {
      code: found.code,
      round_no: found.round_no,
      started_at_ms: found.started_at_ms,
      item_count: found.item_count,
      takt_ms: found.takt_ms,
      status: found.status,
      ended_at_ms: found.ended_at_ms,
      notes: found.notes
    },
    events: readEvents(code, found.round_no)
  }, cb);
}


function readEvents(code, roundNo) {
  var sh = sheet(EVENTS_SHEET, EVENT_HEADERS);
  var last = sh.getLastRow();
  if (last < 2) return [];

  var first = Math.max(2, last - MAX_SCAN_ROWS + 1);
  var values = sh.getRange(first, 1, last - first + 1, EVENT_HEADERS.length).getValues();

  var out = [];
  var seen = {};

  for (var i = 0; i < values.length; i++) {
    var v = values[i];
    if (String(v[1]).toUpperCase() !== code) continue;
    if (Number(v[2]) !== roundNo) continue;

    var id = String(v[3]);
    if (!id || seen[id]) continue;   // the same tap uploaded twice
    seen[id] = true;

    out.push({
      id: id,
      seq: Number(v[4]) || 0,
      k: String(v[5]),
      st: v[6] === '' ? null : Number(v[6]),
      item: v[7] === '' ? null : Number(v[7]),
      ms: v[8] === '' ? null : Number(v[8]),
      v: String(v[9] || '') || undefined,
      c: v[10] === '' ? null : Number(v[10]),
      t: String(v[11] || '') || undefined,
      at: v[12] === '' ? null : Number(v[12])
    });
  }

  return out;
}


/* Just the headers, for the comparison tab — no taps, so a term's
   worth of rounds comes back in one small reply. */
function getRounds(params, cb) {
  var code = clean(params.code, 12).toUpperCase();
  var rounds = readRounds(sheet(ROUNDS_SHEET, ROUND_HEADERS));

  var out = rounds
    .filter(function (r) { return r.code === code; })
    .map(function (r) {
      return {
        code: r.code,
        round_no: r.round_no,
        started_at_ms: r.started_at_ms,
        item_count: r.item_count,
        takt_ms: r.takt_ms,
        status: r.status,
        ended_at_ms: r.ended_at_ms,
        notes: r.notes
      };
    })
    .sort(function (a, b) { return a.round_no - b.round_no; });

  return json({ ok: true, rounds: out }, cb);
}


/* ============================================================
   HOUSEKEEPING — EDITOR ONLY, NEVER THE WEB
   ============================================================
   Everything above this line is reachable from the internet.
   Everything below it is not, and that distinction is the whole
   point of this section.

   doGet and doPost between them will append a row, read a round
   back, and mark one ended. They will not delete anything, ever.
   That is deliberate: the Web App URL and the shared token both
   sit in a file the browser downloads, so anyone who views source
   has them. An endpoint that could delete rows would hand a
   bored student the ability to wipe a term of class data.

   The functions below CAN delete. They are safe only because
   nothing routes to them — no action name in doGet, no kind in
   doPost. The sole way to run one is to open this editor, pick it
   from the dropdown, and press Run, which requires being signed
   in as you.

   IF YOU EVER ADD A CASE FOR ONE OF THESE TO doGet OR doPost,
   you have made your class data deletable by anyone with the URL.
   Do not.

   Because they are not part of the web-facing surface, adding
   them needs NO redeployment. Paste, save, run.
   ------------------------------------------------------------
   HOW TO USE
   ------------------------------------------------------------
   1. Set the dropdown at the top of the editor to "cleanupTests".
   2. Press Run.
   3. Read the result in the Execution log — it names the counts.

   It removes the ZZTEST rows left behind by a connection check.
   To clear a different line, edit the code in cleanupTests, or
   run deleteLineCode('DTP3A') from the editor the same way.
   ============================================================ */

/* The one you will actually run. */
function cleanupTests() {
  return deleteLineCode('ZZTEST');
}

/* Removes every Round and Event row carrying one line code.
   ------------------------------------------------------------
   Says what it did through console.log, NOT just by returning it.
   A returned value does not appear in the Execution log — the log
   shows "Execution completed" and nothing else, which tells you
   the function ran but not whether it found anything. That is the
   one thing you actually want to know after running a delete. */
function deleteLineCode(code) {
  var wanted = String(code || '').toUpperCase();
  if (!wanted) return say('No code given — nothing done.');

  /* Guard against the obvious accident. Clearing every row in the
     sheet should not be one typo away. */
  if (wanted === '*' || wanted === 'ALL') {
    return say('Refused: pass a single line code, not a wildcard.');
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    var rounds = purge(ROUNDS_SHEET, ROUND_HEADERS, 1, wanted);
    var events = purge(EVENTS_SHEET, EVENT_HEADERS, 1, wanted);

    if (rounds === 0 && events === 0) {
      return say('Nothing to delete — no rows carry the line code "' +
                 wanted + '".');
    }

    return say('Deleted ' + rounds + ' row(s) from ' + ROUNDS_SHEET +
               ' and ' + events + ' row(s) from ' + EVENTS_SHEET +
               ' for line "' + wanted + '".');
  } finally {
    lock.releaseLock();
  }
}

/* Puts a line in the Execution log AND hands it back, so the
   message is visible whether you ran this from the editor or
   called it from another function. */
function say(message) {
  console.log(message);
  return message;
}

/* Deletes rows whose column `col` (1-based) matches `wanted`.
   ------------------------------------------------------------
   Walks BOTTOM UP. Deleting row 5 shifts row 6 up into its place,
   so a top-down loop skips every row that follows a deleted one —
   which on a run of consecutive matches quietly leaves half of
   them behind. Going upwards, the rows still to be examined are
   all above the one being removed and their positions do not
   move. */
function purge(sheetName, headers, col, wanted) {
  var sh = sheet(sheetName, headers);
  var last = sh.getLastRow();
  if (last < 2) return 0;

  var values = sh.getRange(2, col, last - 1, 1).getValues();
  var removed = 0;

  for (var i = values.length - 1; i >= 0; i--) {
    if (String(values[i][0]).toUpperCase() === wanted) {
      sh.deleteRow(i + 2);   // +2: skip the header, and 0-based to 1-based
      removed++;
    }
  }

  return removed;
}
