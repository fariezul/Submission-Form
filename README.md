# TVETMARA Masjid Tanah — Student Registration Form

A beginner-friendly web form (plain HTML + CSS + JavaScript) that saves
name / email / phone into a Supabase table called `submission`.

This is a **static site**. There is no server, no build step, and nothing
to install. Three files and it runs.

## Files

| File         | What it does |
|--------------|--------------|
| `index.html` | The structure of the page (the skeleton) |
| `style.css`  | How it looks — navy & white corporate styling |
| `app.js`     | Supabase settings + validation + saving |

## The admin page (`admin.html`)

A private page that lists every submission, with search and sorting.

**It requires a login.** This is deliberate. The form page only ever
*writes*, so the public anon key is harmless there. But an admin page
has to *read* — and if reading were allowed with the public key, anyone
on the internet could download every student's name, email and phone
number. Requiring a sign-in means the read permission belongs to a real
user account, not to the public.

### Setting it up — two steps in Supabase

**Step 1: create your admin user**

1. Supabase dashboard → **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Enter your email and a password
4. Tick **Auto Confirm User** (otherwise it waits for an email link)
5. Click **Create user**

**Step 2: allow logged-in users to read**

SQL Editor → paste this **on its own** → Run:

```sql
create policy "Signed-in users can read submissions"
on public.submission
for select
to authenticated
using (true);
```

Note `to authenticated`, not `to anon`. That single word is the
difference between "only people who signed in" and "the whole
internet".

### Opening it

Local: `admin.html` in the project folder.
Online: `https://your-site.netlify.app/admin.html`

Sign in with the user you created in Step 1.

### What it does

- Newest submissions first by default
- **Search box** — filters by name or email as you type
- **Sort button** — flips between newest-first and oldest-first
- **Refresh** — fetches the latest rows without reloading the page
- **Sign Out** — forgets your session

The sign-in is remembered for the current browser tab only. Closing the
tab signs you out.

### If the table loads but is empty

You are signed in, but the SELECT policy is missing — Supabase returns
an empty list rather than an error. Run the SQL in Step 2.

---

## Database columns

The `submission` table needs these columns:

| Column | Type | Notes |
|---|---|---|
| `name` | text | |
| `email` | text | |
| `phone` | text | |
| `spm_results` | **jsonb** | added for the SPM section |

If `spm_results` is missing you will see the error
`PGRST204 — Could not find the 'spm_results' column`. Add it with:

```sql
alter table public.submission add column spm_results jsonb;
```

### What the SPM data looks like

Each submission stores a list of subject/grade pairs, for example:

```json
[
  { "subject": "Matematik", "grade": "A+" },
  { "subject": "Bahasa Melayu", "grade": "A" }
]
```

Because the column is `jsonb` (real structured JSON, not plain text)
you can query inside it. For example, every student who scored A+ in
any subject:

```sql
select name, email
from submission
where spm_results @> '[{"grade": "A+"}]';
```

To change which subjects appear in the dropdown, edit the
`SPM_SUBJECTS` list near the top of the SPM section in `app.js`.

By default at least one subject is required. To make the section
optional, open `app.js`, find `validateSpmResults`, and delete the
`if (results.length === 0)` block.

---

## About the logo

The TVETMARA wordmark in the header is **drawn with HTML and SVG**, not
loaded from an image file. That keeps it sharp on any screen and means
there is no extra file to host.

If you would rather use the official logo image, save it into this folder
as `logo.png`, then in `index.html` replace the whole `<div class="brand">
… </div>` block with:

```html
<img src="logo.png" alt="TVETMARA Masjid Tanah" class="brand-logo" />
```

and add this to `style.css`:

```css
.brand-logo { height: 52px; width: auto; display: block; }
```

---

## How to test it right now (double-click)

1. Open **File Explorer** and go to `D:\CC PLAYGROUND\supabase-form-app`
2. **Double-click `index.html`**

It opens in your default browser. The address bar will show something
like `file:///D:/CC%20PLAYGROUND/supabase-form-app/index.html` — that's
normal and correct. You do NOT need `localhost` any more.

### Test 1 — validation catches bad input

Click **Submit Registration** with everything blank. You should see three
red error messages.

Then try these:

| Field | Type this | Expected error |
|-------|-----------|----------------|
| Email | `hello` | "Please enter a valid email address" |
| Email | `hello@world` | same (no `.com` part) |
| Phone | `012-345 678` | "Phone number must contain numbers only" |
| Phone | `12345` | "must be between 7 and 15 digits" |
| Name  | `A` | "must be at least 2 characters" |

Fix a field while its red error is showing — it disappears as you type.

### Test 2 — a real submission

Enter valid details, for example:

- Name: `Jane Smith`
- Email: `jane@example.com`
- Phone: `60123456789`

Click Submit. You should see the green **"Submission received"** banner
and all three boxes go empty.

### Test 3 — confirm it really saved

Supabase dashboard → **Table Editor** → `submission`. Your row is there.

> Tested and confirmed working by double-clicking the file — the form
> submits to Supabase successfully over `file://`.

---

## Putting it on the internet

Since it's just static files, hosting is free and takes a couple of
minutes. Easiest options:

**Netlify Drop** (no account needed to try): go to
<https://app.netlify.com/drop> and drag the `supabase-form-app` folder
onto the page. You get a public URL immediately.

**GitHub Pages**: push this folder to a GitHub repo, then
Settings → Pages → Source: `main` branch → Save.

**Cloudflare Pages** or **Vercel**: connect the repo, framework preset
"None", output directory `/`.

Nothing needs configuring — no environment variables, no build command.

---

## If something goes wrong

Press **F12** in the browser and click the **Console** tab — the exact
error from Supabase is printed there.

| Message contains | Meaning | Fix |
|---|---|---|
| `row-level security policy` | Insert policy missing or something asked to read the row back (see below) | Check the policy in Supabase |
| `404` / `relation does not exist` | Table name is wrong | Table must be named exactly `submission` |
| `column ... does not exist` | Column names differ | Columns must be `name`, `email`, `phone` |
| `Failed to fetch` | No internet, or the project is paused | Check connection / Supabase dashboard |

### Careful: `Prefer: return=minimal` matters

`app.js` sends the header `Prefer: return=minimal`, which means "save the
row, don't send it back to me".

If you ever change that to `return=representation`, the insert will start
failing with `row-level security policy` — even though the insert policy
is correct. Asking for the row *back* also needs a SELECT policy, and
this table intentionally has none, so nobody can read other people's
submissions using the public key.

So a `42501` error does not always mean the INSERT policy is missing.

---

## About the key in `app.js`

The Supabase **anon** key sits directly in `app.js`, and that is correct
for a static site. Any key a browser uses is visible to anyone who
presses F12 — Supabase designed the anon key to be public.

What protects your data is the **RLS policy**, not secrecy. This table
allows `INSERT` only, so visitors can add a submission but cannot read,
edit, or delete anything.

Never put the **service_role** key in this file. That key ignores all
security rules and belongs only on a server.

### One thing to be aware of once it's public

Anyone who finds your page — or your key — can insert rows, including
with a script. That's the normal trade-off for a public form, but on a
live site it does mean the table can be spammed. If that becomes a
problem, Supabase supports adding CAPTCHA protection, or you can move the
insert behind an Edge Function that validates first.
