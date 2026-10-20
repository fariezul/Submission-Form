# Alumni survey — setup

The page is built and live in the repository. It will collect nothing
until you connect it to **your** Google Sheet, which takes about ten
minutes and is done once.

The survey asks the same questions as the Google Form you sent, in the
same order and with the same wording.

---

## What was added

| File | What it is |
|---|---|
| `alumni.html` | The page itself. Served at `/alumni`. |
| `alumni.css` | Styles used only by this page — radio cards, branch sections, photo picker. |
| `alumni.js` | Branching, validation, photo shrinking, sending. |
| `alumni-config.js` | **The one file you edit.** Where the answers are sent. |
| `google-apps-script/alumni-Code.gs` | The backend. Paste into Apps Script. |
| `tvetmara-logo.png` | The TVETMARA Masjid Tanah wordmark, cropped out of `D:\LOGO MARA\tvetmara logo.png`, background removed, 1000 px wide. |

The Alumni tab was added to the tab bar, the Menu dropdown and the
footer of all 24 pages that have navigation. It sits **second, straight
after Profile**, everywhere.

`vercel.json` now rewrites `/alumni` to `alumni.html`, so the address on
a poster or a WhatsApp message is the short one. A *rewrite* rather than
a redirect: a redirect would bounce visitors to `/alumni.html` and that
is not the address on the poster.

Note for next time: `vercel.json` is checked against a schema that
allows no unknown top-level keys, and JSON has no comments. A `"//"`
note added there fails the build outright — explanations belong here
instead.

---

## Step 1 — The sheet (already done)

The spreadsheet exists in your Drive, in the folder
**[alumni_data](https://drive.google.com/drive/folders/1-NiMuLWp0ZusYnsmGnkt4reXa3nhJzr1)**:

**[Alumni DTP IAC — Responses](https://docs.google.com/spreadsheets/d/11wVpcR__vErrRNDC8ZtiDzNcuEWLmXKQ8_2RvL9KDLM/edit)**

Moving the sheet between folders is safe at any time — the script
finds it by ID, not by where it sits.

It is empty for now. Its ID is already filled into `alumni-Code.gs`,
so there is nothing to copy or paste. The `Responses` tab and its
column headings appear in step 3, when you run `setup`.

## Step 2 — Paste in the script

1. In that sheet: **Extensions → Apps Script**.
2. Delete whatever is in `Code.gs`.
3. Paste in the whole of `google-apps-script/alumni-Code.gs`.
4. Save.

## Step 3 — Run setup once

**Run → choose `setup` → Run**, and approve the permission prompt.

This creates the `Responses` tab with its headings, and a Drive folder
named **Alumni DTP IAC — Gambar** for the photographs.

## Step 4 — Deploy

**Deploy → New deployment → gear icon → Web app**

| Setting | Value |
|---|---|
| Description | Alumni survey |
| Execute as | Me |
| Who has access | **Anyone** |

"Anyone" is required. With anything else the alumni get a Google
sign-in page instead of a saved answer, and the page will tell them so.

Deploy, approve, then copy the **Web App URL**. It looks like:

```
https://script.google.com/macros/s/AKfycb..../exec
```

## Step 5 — Connect the page

Open `alumni-config.js` and paste that URL between the quotes:

```js
SCRIPT_URL: "https://script.google.com/macros/s/AKfycb..../exec",
```

Then push the site. Vercel redeploys on its own.

---

## If you ever edit `alumni-Code.gs`

You must redeploy, or the page keeps talking to the old code:

**Deploy → Manage deployments → pencil → Version: New version → Deploy**

This catches everybody once.

---

## What ends up in the sheet

One row per alumnus, sixteen columns:

`timestamp`, `nama`, `emel`, `program`, `tamat_belajar`,
`status_selepas_tamat`, `program_sambungan`, `institusi`, `tajaan`,
`nama_tajaan`, `syarikat`, `jawatan`, `julat_gaji`, `syarikat_ke`,
`kaitan_komposit`, `gambar`

The branch columns are blank when they do not apply — someone who is
working leaves the study columns empty, and the other way round. The
page clears a section when you switch away from it, so a salary typed
by mistake does not travel with a "Sambung Belajar" answer.

`gambar` holds a link to the picture in your Drive folder.

---

## The photographs

Phone photographs are 4000 pixels wide and several megabytes. The page
shrinks each one to 1400 pixels and about 250 KB **in the browser**,
before it is sent — which is what makes this work on mobile data in a
factory car park.

The files stay **private to you**. The script does not make them
public, because these are named pictures of former students. If you
later want a public alumni gallery, share that gallery deliberately
rather than opening the whole folder.

---

## Differences from the original Google Form

Two, both deliberate:

1. **An e-mail field was added.** The Google Form collected the address
   automatically from the signed-in Google account. A public web page
   has no account to read, so the question is asked outright. It is
   required.
2. **A spelling fix.** The DTP option read "Polimer Komposir" in the
   original; it is written "Polimer Komposit" here.

Everything else — the questions, the order, the option wording, the
hints under each field, which questions are required — matches.

---

## Testing it locally

The repository has a preview server configuration. Serve the folder on
port 5510 and open `http://localhost:5510/alumni`.

Until `SCRIPT_URL` is filled in, the form fills in and validates
perfectly, then says plainly on submit that it is not connected to a
sheet yet. Nobody is left believing their answers were saved when they
were not.
