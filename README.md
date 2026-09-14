# CoachFlow Coaching Platform — Firebase Customer Manager

## What this version does

The Admin dashboard is connected to Firestore and treats Firebase as the source of truth for customer profiles.

### Customer workflow
1. A customer creates an account from **Sign Up** (Email/Password or Google).
2. Firebase Authentication creates the account and the app creates `/users/{uid}`.
3. The customer is immediately sent to their Dashboard.
4. The coach opens **Admin → Customers** and sees all customer profiles from the Firestore `users` collection (the coach/admin account is filtered out).
5. The coach selects one customer.
6. The coach edits only that customer's profile and saves it to `/users/{customerUid}`.
7. The coach opens **Weekly program** and edits Monday–Sunday for the selected customer.
8. The program is stored at `/programs/{customerUid}`.
9. The customer's Dashboard reads `/programs/{theirUid}`, so each customer sees only their own program.

## Firestore structure

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
3. Firebase Console → Firestore Database → create the database.
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

6. In `firestore.rules`, replace the admin email with the same coach email and publish the rules in Firebase.
7. Restart Vite after changing `.env`.

## Important

The Admin page cannot securely create a Firebase Authentication user from a browser-only React app. The safe workflow is: **customer signs up first → customer appears automatically in Admin → coach assigns the customer's program**. A later production upgrade can add a Cloud Function/Admin SDK invitation system if you want the coach to create customer accounts from Admin.

## Run

```bash
npm install
npm run dev
```
