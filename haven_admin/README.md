# Haven Admin

The admin dashboard for **Haven**. Its tagline is *Safety, booked with care.* From here, admins can manage every bouncer, user, booking, review and app setting stored in Firebase.

Built with Next.js 15 (App Router), TypeScript, Tailwind CSS v4 and the Firebase Web SDK. All data updates live through Firestore `onSnapshot`.

## Features

| Page | What you can do |
|---|---|
| **Overview** | See total users, bouncer profiles, pending approvals and revenue from completed bookings. Also shows bookings by status, recent bookings, and quick approve/decline for new bouncers. |
| **Bouncers** | Filter by status and search. Edit every profile field (name, bio, city, experience, rate, height, skills, languages, availability, status, verified badge). Approve, reject or suspend. Delete the profile, and optionally the user account too. |
| **Users** | Filter by role and search. Edit name, phone, role and active flag. Activate or deactivate in one click. Delete removes the user doc, the bouncer profile, and the Firebase Auth account if server credentials are set. |
| **Bookings** | Filter by status and search. Edit status, date/time, hours, location, guests, notes, rate, total and bouncer note. Delete. |
| **Reviews** | Filter by stars and search. Edit rating or comment, and the bouncer's average is recalculated. Deleting a review adjusts the bouncer's rating and lets the customer review that booking again. |
| **Settings** | Edit `settings/app` (currency, commission %, support email and phone). The mobile app reads this document. |

Data shapes follow [`../firebase/SCHEMA.md`](../firebase/SCHEMA.md). Access control comes from [`../firebase/firestore.rules`](../firebase/firestore.rules): a signed-in user whose `users/{uid}.role == "admin"` gets full read/write access.

## Setup

1. **Install**
   ```bash
   npm install
   ```
2. **Configure Firebase.** Copy the env template and fill it in:
   ```bash
   cp .env.local.example .env.local
   ```
   - Put the `NEXT_PUBLIC_FIREBASE_*` values in `.env.local`. You find them in Firebase console → Project settings → *Your apps* → add or choose a **Web app**.
   - The `FIREBASE_ADMIN_*` values are *optional*. They let the dashboard delete Firebase **Auth** accounts. To get them, go to Project settings → Service accounts → *Generate new private key*. Copy `project_id`, `client_email` and `private_key` from the JSON file, and keep the `\n` escapes inside quotes. Without these values, deletes still remove the Firestore records, and the dashboard tells you the sign-in account was kept.
3. **Deploy the rules and indexes** from the repo's `firebase/` folder:
   ```bash
   cd ../firebase
   firebase deploy --only firestore:rules,firestore:indexes,storage --project <your-project-id>
   ```
4. **Enable Email/Password sign-in** in Firebase console → Authentication → Sign-in method.

## Creating the first admin

Admin rights can't be granted from the mobile app, because the rules block it.

1. Create an account, using either of these:
   - sign up in the Haven mobile app, or
   - go to Firebase console → Authentication → *Add user*, then copy the new user's **UID**.
2. In Firebase console → Firestore → `users` collection:
   - **If a `users/{uid}` document already exists** (you signed up in the app): set `role` to `"admin"`, and make sure `isActive` is `true`.
   - **If no document exists** (you created the account in the console): create a document with **Document ID = the UID** and these fields:
     ```
     uid: "<UID>"            (string)
     name: "Your Name"       (string)
     email: "you@example.com"(string)
     phone: ""               (string)
     photoUrl: null          (null)
     role: "admin"           (string)
     isActive: true          (boolean)
     createdAt: <now>        (timestamp)
     ```
3. Sign in at `/login`. To promote more admins later, open **Users** → edit → Role → `admin`.

## Run

```bash
npm run dev     # http://localhost:3000  → redirects to /dashboard (or /login)
npm run build   # production build
npm start       # serve the production build
```

You can deploy to Vercel or any Node host. Add the same env vars in the host's settings. The `/api/admin/delete-user` route needs the Node.js runtime, which is already set.

## Project layout

```
src/
  app/
    (admin)/            ← protected section (sidebar layout + admin guard)
      dashboard/ bouncers/ users/ bookings/ reviews/ settings/
    api/admin/delete-user/route.ts   ← verifies ID token + admin role, deletes Auth user
    login/page.tsx
  components/           ← AuthProvider (role check), Toast, Brand, ui kit
  hooks/                ← useCollection / useDoc (live), useSettings
  lib/                  ← firebase (lazy init), firebaseAdmin, actions, types, format
```
