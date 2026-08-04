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
