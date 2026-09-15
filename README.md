# CoachFlow — React + Firebase + GitHub Pages

This version is fixed for **Firebase Firestore** and **Vite environment variables**.

## The two problems that were fixed

### 1. GitHub Actions secrets were not automatically available to Vite

Vite only exposes variables whose names start with `VITE_`, and GitHub repository secrets are not automatically injected into the build.

The included workflow `.github/workflows/deploy.yml` maps every GitHub Secret to a `VITE_*` environment variable **before `npm run build`**.

Use these exact secret names:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_ADMIN_EMAIL
```

Important: the old file named `env` was not a Vite `.env` file. Do not rely on it for GitHub Pages.

### 2. The app was mixing Firestore and Realtime Database

`src/lib/firebase.js` creates a Firestore database with `getFirestore()`, but the app was importing Realtime Database functions such as `ref()` and `onValue()`.

That cannot work correctly.

The app now consistently uses Firestore:

```text
/users/{uid}
/programs/{uid}
```

with `collection`, `doc`, `getDoc`, `setDoc`, and `onSnapshot`.

## GitHub Pages setup

1. Push this project to GitHub.
2. Open **Repository → Settings → Secrets and variables → Actions → Secrets**.
3. Create the 7 secrets listed above.
4. Open **Settings → Pages**.
5. Set **Source** to **GitHub Actions**.
6. Push to the `main` branch or manually run the `Deploy React/Vite to GitHub Pages` workflow.
7. Open the URL produced by the Pages deployment.

### Firebase Authentication

In Firebase Console → Authentication → Settings → Authorized domains, add your GitHub Pages domain, for example:

```text
YOUR-GITHUB-USERNAME.github.io
```

Use your real GitHub username.

## Firebase Admin access

The admin email is controlled by:

```text
VITE_ADMIN_EMAIL
```

It must be the **exact same email** as the Firebase Authentication account used by the coach/admin.

The current Firestore rules also use the same email. Update `firestore.rules` if you change the admin email, then publish the rules.

## Firestore rules

Deploy `firestore.rules` to your Firebase project. The application uses Firestore, not Realtime Database.

The old `database.rules.json` file was removed to avoid accidentally configuring the wrong Firebase database.

## Local development

Copy:

```text
.env.example
```

to:

```text
.env.local
```

and fill in the same values.

Then:

```bash
npm install
npm run dev
```

Restart Vite after changing `.env.local`.

## Important security note

Firebase web configuration values such as the API key are normally included in the browser bundle. They are not passwords. **Do not put Firebase Admin SDK private keys or service-account JSON in Vite/GitHub Pages secrets.**

`VITE_ADMIN_EMAIL` is also not a secret security boundary because it is shipped to the browser. Real authorization is enforced by Firebase Authentication + Firestore Rules.

## Current data model

```text
Firestore
├── users
│   ├── CUSTOMER_UID_1
│   └── CUSTOMER_UID_2
└── programs
    ├── CUSTOMER_UID_1
    └── CUSTOMER_UID_2
```

## GitHub Pages deployment (important)

This project uses Vite. GitHub Repository Secrets are **build-time variables**; they are not available to the browser automatically.

Create these exact Repository Secrets under **Settings → Secrets and variables → Actions → Repository secrets**:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_ADMIN_EMAIL
```

Then go to **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**.

Do not use “Deploy from a branch” for this project, because that method does not run the Vite build with the GitHub Secrets.

Push to the `main` branch. The workflow `.github/workflows/deploy.yml` injects the secrets, checks that none are empty, runs `npm run build`, and deploys `dist` to GitHub Pages.

### Firebase Authentication

In Firebase Console → Authentication → Settings → Authorized domains, add the GitHub Pages hostname, for example:

```text
YOUR-USERNAME.github.io
```

The Firestore rules must also contain the same admin email as `VITE_ADMIN_EMAIL`.

### Local Codespace

For Codespaces/local development, create `.env.local` in the repository root using `.env.example`. Do not commit `.env.local`.
