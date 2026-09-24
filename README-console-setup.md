# CoachWolf — 6-digit password reset (browser-only setup, no CLI)

Everything below is done by clicking through **console.cloud.google.com** in
your normal browser (the same Google login you already use for Firebase) —
no `firebase login`, no terminal.

## Files in this zip

- `App.jsx`, `firebase.js`, `styles.css` — same paths as your existing
  project, just drop them in over the current files.
- `index.js`, `package.json` — the code for the two Cloud Functions, to be
  pasted into the Cloud Console's inline editor (not deployed via CLI).

## 1. Gmail App Password (one-time)

1. Turn on 2-Step Verification on the Gmail account you'll send from:
   https://myaccount.google.com/security
2. Create an App Password: https://myaccount.google.com/apppasswords
   - App: "Mail", Device: "Other" → name it "CoachWolf"
   - Copy the 16-character password — you'll paste it once in step 3.

## 2. Make sure billing is enabled

Cloud Functions need the Blaze plan (still effectively free at low volume).
In the Firebase Console → your project → gear icon → Usage and billing →
Modify plan → Blaze. You only need to do this once.

## 3. Create the first function (requestPasswordReset)

1. Go to https://console.cloud.google.com/functions
2. Make sure the project selector (top left) is set to **coaching-wolf**
3. Click **Create Function**
4. Environment: **2nd gen**
5. Function name: `requestPasswordReset`
6. Region: `us-central1` (or whichever you prefer — just use the same one
   for both functions)
7. Trigger type: **HTTPS**
8. Authentication: choose **Allow unauthenticated invocations**
9. Click **Next**
10. Runtime: **Node.js 20**
11. Source code: choose **Inline Editor**
12. You'll see tabs for `index.js` and `package.json` — replace their
    contents with the matching files from this zip
13. Entry point: `requestPasswordReset`
14. Expand **Runtime, build, connections and security settings** →
    **Runtime environment variables** → add:
    - `GMAIL_EMAIL` = the Gmail address from step 1
    - `GMAIL_PASSWORD` = the 16-character app password from step 1
15. Click **Deploy** and wait ~1-2 minutes
16. Once deployed, open the **Trigger** tab and copy the **Trigger URL**
    (looks like `https://requestpasswordreset-xxxxxxxxxx-uc.a.run.app`)

## 4. Create the second function (confirmPasswordReset)

Repeat step 3 exactly, with two differences:
- Function name and Entry point: `confirmPasswordReset`
- Same `index.js` / `package.json` content (it already contains both
  functions — the Entry point field picks which one runs)

Copy this Trigger URL too.

## 5. Wire the URLs into firebase.js

Open `firebase.js` from this zip and replace these two lines near the top:

```js
const REQUEST_RESET_URL = "https://REPLACE-WITH-YOUR-requestPasswordReset-URL";
const CONFIRM_RESET_URL = "https://REPLACE-WITH-YOUR-confirmPasswordReset-URL";
```

with the two Trigger URLs you copied.

Also open `index.js` and check this line matches your actual GitHub Pages
domain (it's already set correctly for you, just confirm):

```js
const ALLOWED_ORIGIN = "https://wolf-coach.github.io";
```

## 6. Lock down the database (browser only)

Firebase Console → Realtime Database → **Rules** tab. Merge this in
alongside your existing rules (don't replace the whole file):

```json
"passwordResets": {
  ".read": false,
  ".write": false
}
```

Click **Publish**. This blocks any client from reading/writing reset codes
directly — only your Cloud Functions (via the Admin SDK) can touch them.

## 7. Deploy the frontend

Copy `App.jsx` and `firebase.js` over your existing files, rebuild, and
redeploy to GitHub Pages as usual.

## How it works

1. "Forgot password?" → dedicated email-entry page
2. Submits → calls the `requestPasswordReset` function → generates a 6-digit
   code, stores it in Realtime Database (10-minute expiry), emails it
3. User enters the code + new password on one page
4. `confirmPasswordReset` checks the code (max 5 wrong attempts) and sets
   the new password directly — no old password, no link, no domain issues.

## Notes

- To update the function code later, go back to the function in the Cloud
  Console → Edit → update the Inline Editor content → Redeploy.
- `CODE_TTL_MS` and `MAX_ATTEMPTS` at the top of `index.js` control the
  expiry time and attempt limit.
- Runtime environment variables (step 3.14) are simpler than Secret Manager
  but visible to anyone with Editor/Owner access to the GCP project — fine
  for a small team, just don't share project access casually.
