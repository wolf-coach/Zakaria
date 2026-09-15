# CoachFlow Coaching Platform — Firebase Customer Manager V7

## What this version does

### V7 authentication/profile fix
- Signup writes the complete signup form to `users/{uid}` in one Realtime Database write.
- The Firebase auth listener no longer creates an empty customer document, preventing a race that could leave only the email saved.
- Customer Dashboard always uses the signed-in Firebase UID and never falls back to Alex/demo data when Firebase is configured.
- Customer profile and weekly program use Realtime Database real-time listeners, so coach edits can appear in the customer dashboard automatically.
- Existing accounts whose Realtime Database document already contains only an email must complete their profile again; old data cannot be recovered if it was never stored.

The Admin dashboard is connected to Realtime Database and treats Firebase as the source of truth for customer profiles.

### Customer workflow
1. A customer creates an account from **Sign Up** (Email/Password or Google).
2. Firebase Authentication creates the account and the app creates `/users/{uid}`.
3. The customer is immediately sent to their Dashboard.
4. The coach opens **Admin → Customers** and sees all customer profiles from the Realtime Database `users` collection (the coach/admin account is filtered out).
5. The coach selects one customer.
6. The coach edits only that customer's profile and saves it to `/users/{customerUid}`.
7. The coach opens **Weekly program** and edits Monday–Sunday for the selected customer.
8. The program is stored at `/programs/{customerUid}`.
9. The customer's Dashboard reads `/programs/{theirUid}`, so each customer sees only their own program.

## Realtime Database structure

```text
users
  ├── CUSTOMER_UID_1
  │   ├── name
  │   ├── email
  │   ├── age
  │   ├── height
  │   ├── weight
  │   ├── goal
  │   ├── allergies
  │   ├── health
  │   ├── package
  │   ├── startDate
  │   └── endDate
  └── CUSTOMER_UID_2

programs
  ├── CUSTOMER_UID_1
  │   ├── Monday
  │   ├── Tuesday
  │   ├── ...
  │   └── Sunday
  └── CUSTOMER_UID_2
      ├── Monday
      ├── Tuesday
      ├── ...
      └── Sunday
```

## Firebase setup

1. Firebase Console → Authentication → Sign-in method → enable **Email/Password**.
2. Optionally enable **Google**.
3. Firebase Console → Realtime Database Database → create the database.
4. Create your coach account in Authentication → Users.
5. Set `.env` with your Firebase web configuration and the exact coach email:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_ADMIN_EMAIL=your-coach-email@example.com
```

6. In `database.rules.json`, replace the admin email with the same coach email and publish the rules in Firebase.
7. Restart Vite after changing `.env`.

## Important

The Admin page cannot securely create a Firebase Authentication user from a browser-only React app. The safe workflow is: **customer signs up first → customer appears automatically in Admin → coach assigns the customer's program**. A later production upgrade can add a Cloud Function/Admin SDK invitation system if you want the coach to create customer accounts from Admin.

## Run

```bash
npm install
npm run dev
```
\n\n## Realtime Database setup\n\nThis V8 uses **Firebase Realtime Database**, not Cloud Firestore. In Firebase Console open **Build → Realtime Database → Create Database**. Then open the **Rules** tab and publish `database.rules.json` from this project. The rules currently use `omar@gmail.com` as the coach email; change it to the exact email of your admin Firebase Authentication account before publishing.\n\nThe customer profile is stored at `users/{uid}` and the weekly program at `programs/{uid}`. The Admin dashboard listens to `/users` in real time, so every customer appears automatically after signup.\n

## V9 critical Realtime Database rule fix

The Admin dashboard reads the entire `users` node with `onValue(ref(db, "users"))`. Realtime Database security rules are not filters: permission granted only at `users/$uid` does not grant permission to read the parent `users` node. The included `database.rules.json` therefore grants the coach/admin email read access at the `users` parent and keeps customer access limited to their own UID.

**Before publishing:** replace every `omar@gmail.com` in `database.rules.json` with the exact email of the Firebase Authentication account used as Coach/Admin, if different. Then Firebase Console → Realtime Database → Rules → paste/publish the file.


### Realtime Database
This version uses Firebase Realtime Database (not Firestore). For the coaching-wolf project the database URL is:
`https://coaching-wolf-default-rtdb.firebaseio.com/`

Publish `database.rules.json` in Firebase → Realtime Database → Rules. Replace `YOUR_ADMIN_EMAIL@example.com` with the exact email of the coach/admin Firebase Authentication account.

After changing `.env`, restart Vite.

## V12 Program Builder update
- Meals are now repeatable: use **Add meal** to add as many meal inputs as needed for each day.
- Exercises are now repeatable description fields: use **Add exercise** and enter sets, reps, rest, and coaching notes in the description.
- Existing Firebase programs saved as strings remain compatible.
