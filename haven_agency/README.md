# Haven for Agencies

The control centre where a registered security agency runs its business on Haven: personnel, verification, bookings, team assignments, availability, attendance, agreements, payments, payroll, reviews, support, reports and staff access.

## Run it
```bash
cp .env.local.example .env.local   # same Firebase web keys as haven_admin
npm install
npm run dev                         # http://localhost:3001
```
Deploy the rules in `../firebase` first (`firebase deploy --only firestore:rules,firestore:indexes,storage`).

## Accounts
- **Agency owner**: choose "Register your agency" on the sign-in page. It creates a `users` doc (`role: agency`, `staffRole: owner`, `agencyId = uid`) and a draft `agencies` doc. The overview checklist guides the owner to complete the profile, set up services, upload documents, add personnel and **Submit for review**. An admin approves the agency in `haven_admin`.
- **Staff**: owners and managers invite people from **Staff & roles**. The invitee registers with the invited email and joins automatically with the chosen role (manager, hr, bookings, finance). The sidebar and the security rules limit what each role sees.

## Design notes
- Monochrome UI (black, white and greys); a single red is used only for destructive actions and emergencies.
- The **Overview** answers "what needs me right now?": urgent items first, then KPIs, upcoming bookings and team activity.
- **Ctrl/⌘ K** opens a command palette to jump to any page, person or booking.
- Long lists use tabs with counts, search, bulk selection and Excel export. Edits happen in side drawers, so you never lose your place.
- Assignment blocks unverified, on-leave and double-booked people (with a 2-hour rest buffer) and shows the reason, instead of failing later.
- Every change is written to the `activity` audit log.

Data model: `../firebase/SCHEMA.md`.
