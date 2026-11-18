# Haven — Safety, booked with care

A marketplace where clients book verified **security agencies** (bouncers, bodyguards, VIP squads, gate and corporate security) for weddings, parties, club nights, residences and corporate events. Agencies assign their own personnel; Haven admins verify agencies, personnel and documents.

| Folder | What it is |
|---|---|
| `haven_app/` | Flutter client app (Android + iOS) — **customers only**: browse agencies, book, approve the assigned team, review |
| `haven_agency/` | Next.js agency dashboard (being built separately): profile, services, personnel, documents, bookings & assignments, staff, payroll, support |
| `haven_admin/` | Next.js admin dashboard: verifies agencies, personnel and documents; full control over all data |
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

## 2. Client app
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
## 4. Agency dashboard
See `haven_agency/README.md` once that app lands. It uses the same Firebase project and env keys as the admin dashboard.

**First admin:** sign up in the client app (or create a user in Firebase Auth), then in Firestore set `users/{uid}.role = "admin"`. See `haven_admin/README.md` for details, including the optional service-account keys used to delete Auth accounts.

## How it works
Data model: [`firebase/SCHEMA.md`](firebase/SCHEMA.md) (v2).
- **Customers** (client app) browse approved agencies and their services, book a service with a date, hours and the number of personnel needed, review the team the agency assigns (approve or request changes), follow the booking, cancel or request a reschedule, raise support tickets and review the agency after the event.
- **Agencies** (agency dashboard) sign up as an owner, invite staff (manager, HR, bookings, finance), fill in their profile, services and company documents, and submit for review. They keep their personnel in the central `personnel` registry, upload their documents, accept bookings and assign teams, and track attendance, agreements, payroll and payments.
- **Admins** (admin dashboard) approve, reject or suspend agencies (with remarks), award the verified badge, verify or reject personnel and individual documents, handle removal requests, set booking payment status, answer escalated support tickets, and manage app settings (currency, commission, tax, support contacts). Each verification decision notifies the agency.
- **Security rules** enforce this on the server: nobody can make themselves an admin, agencies can't approve or verify themselves or change ratings, agency staff only see their own agency's data, prices and payment status can't be changed by agencies, and only a customer whose booking is completed can review it, once.

## Design
Palette: sage `#5B7B6F` (calm, safety) · sand `#C9A98C` (warmth, care) · cream `#F7F5F2` (softness) · ink `#2F3A36`.
Logo: a shield holding a small heart, meaning protection given with care.
