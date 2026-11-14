# Haven — Safety, booked with care

A platform to book trusted security professionals (bouncers) for weddings, parties, club nights and corporate events.

| Folder | What it is |
|---|---|
| `haven_app/` | Flutter mobile app (Android + iOS) with two modules: **Customers** and **Bouncers** |
| `haven_admin/` | Next.js admin dashboard with full control over all data |
| `firebase/` | Firestore/Storage security rules, indexes and the data model (`SCHEMA.md`) |

## 1. Firebase setup (once)
1. Create a project at https://console.firebase.google.com.
2. Enable **Authentication → Email/Password**.
3. Create a **Firestore** database (production mode).
4. Enable **Storage**. New Storage buckets require the Blaze (pay-as-you-go) plan; usage for this app stays inside the free tier.
5. Deploy the rules and indexes:
   ```bash
   cd firebase
   firebase login
   firebase use --add          # pick your project
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```

## 2. Mobile app
```bash
cd haven_app
dart pub global activate flutterfire_cli
flutterfire configure          # replaces lib/firebase_options.dart with your real keys
flutter pub get
flutter run
```

## 3. Admin dashboard
```bash
cd haven_admin
cp .env.local.example .env.local   # fill in your Firebase web app keys
npm install
npm run dev                         # http://localhost:3000
```
**First admin:** sign up in the app (or create a user in Firebase Auth), then in Firestore set `users/{uid}.role = "admin"`. See `haven_admin/README.md` for details, including the optional service-account keys used to delete Auth accounts.

## How it works
- **Bouncers** sign up, fill in their public profile (photo, bio, city, rate, skills, languages), and wait for admin approval. Once approved, they show up for customers. They accept or decline requests, add a note for the client, mark events complete and switch availability on or off.
- **Customers** browse approved professionals (search, city, verified and available-now filters), view profiles and reviews, request bookings, follow their status, cancel, and leave a review after the event.
- **Admins** approve, reject or suspend bouncers, award the verified badge, edit or delete any user, booking or review, deactivate accounts, and manage app settings (currency, support contacts).
- **Security rules** enforce all of this on the server: nobody can make themselves an admin, bouncers can't approve themselves or change their rating, only the people involved can see a booking, and only a customer whose booking is completed can review it, once.

## Design
Palette: sage `#5B7B6F` (calm, safety) · sand `#C9A98C` (warmth, care) · cream `#F7F5F2` (softness) · ink `#2F3A36`.
Logo: a shield holding a small heart, meaning protection given with care.
