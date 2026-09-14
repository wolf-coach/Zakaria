# CoachFlow — Coaching Platform

A modern React + Vite coaching website with Framer Motion and Firebase-ready authentication/database integration.

## Features

- Public coach landing page
- About, services, coaching packs and reviews
- Customer sign up / login
- Customer dashboard
- Profile information: name, age, height, weight, goals, allergies and health notes
- Monday–Sunday weekly program
- Meal plan
- Package validity
- Admin dashboard
- Add/edit customers
- Add/edit weekly programs and meals
- Firebase Authentication + Firestore integration
- Local demo mode when Firebase is not configured
- Responsive mobile/desktop design
- Framer Motion animations

## Run

```bash
npm install
npm run dev
```

Then open the URL shown by Vite.

## Firebase setup

1. Create a Firebase project.
2. Enable Authentication → Email/Password.
3. Create a Firestore database.
4. Copy `.env.example` to `.env`.
5. Add your Firebase web-app configuration.
6. Replace the demo admin email in `src/lib/firebase.js`.
7. Add the Firestore security rules from `firestore.rules`.

The app intentionally stays usable in demo mode if Firebase is not configured.

## Demo mode

Without Firebase configuration, the app uses browser localStorage so you can test the UI and workflows immediately.

Demo admin:
- Email: `admin@coachflow.demo`
- Password: `admin123`

Demo customer:
- Email: `alex@example.com`
- Password: `demo123`

## Important

The health/allergy fields are sensitive personal information. Before using this in production, configure Firebase security rules, authentication, backups and an appropriate privacy policy/consent process.
