# Haven — Firestore data model (v3: agency marketplace + bouncer app)

Shared contract between the Flutter client app (`haven_app`), the agency dashboard (`haven_agency`)
and the admin dashboard (`haven_admin`). All timestamps are Firestore `Timestamp`.
Money is a plain number in the currency from `settings/app.currency`.

**Model in one line:** clients book an *agency* for a *service*; the agency assigns its own *personnel*;
the admin verifies agencies and personnel. All personnel live in one central `personnel` collection,
each record linked to its agency by `agencyId`.

## Roles — `users/{uid}`
| field | type | notes |
|---|---|---|
| uid, name, email, phone | string | |
| photoUrl | string \| null | |
| role | `'customer' \| 'agency' \| 'admin' \| 'bouncer'` | `agency` = anyone working in an agency dashboard (owner or staff); `bouncer` = security personnel using the mobile app |
| personnelId | string \| null | bouncer accounts only: their linked `personnel` doc. Set exactly once (rules) |
| agencyId | string \| null | agency accounts only. The owner's `agencyId` is their own uid |
| staffRole | `'owner' \| 'manager' \| 'hr' \| 'bookings' \| 'finance'` \| null | agency accounts only |
| isActive | bool | admin or agency owner can deactivate |
| createdAt | Timestamp | |

Staff permissions (enforced in the dashboard UI; rules restrict owner-only actions):
| staffRole | can manage |
|---|---|
| owner, manager | everything |
| hr | personnel, documents, availability, attendance, payroll |
| bookings | bookings, assignments, availability, clients, agreements, support |
| finance | payments, payroll, reports |

## `invites/{email}` (lower-case email) — staff invitations
`agencyId`, `agencyName`, `staffRole`, `name`, `invitedBy`, `createdAt`.
A person signs up on the agency dashboard with this email → their `users` doc gets `agencyId` and `staffRole` from the invite.

## `agencies/{agencyId}` (doc id = owner uid) — public profile
| field | type | notes |
|---|---|---|
| name, logoUrl, description | string | |
| registrationNo, licenseNo | string | company registration / PSARA licence |
| ownerName, email, phone | string | |
| address, city | string | |
| yearsExperience | int | |
| areas | string[] | areas of operation |
| workingHours | string | e.g. "24/7" or "Mon–Sat 9:00–21:00" |
| services | map<serviceKey, Service> | see below |
| status | `'draft' \| 'pending' \| 'needs_correction' \| 'approved' \| 'rejected' \| 'suspended'` | only `approved` is visible to customers. Agency may move draft/rejected/needs_correction → pending |
| joinCode | string | optional public code (6 upper-case chars) that independent bouncers enter to request joining |
| reviewedBy, reviewedAt | string, Timestamp | admin who last changed `status`, and when |
| verified | bool | admin badge |
| adminRemarks | string | |
| rating, ratingTotal, reviewCount, lastReviewId | | same atomic rating pattern as v1 |
| personnelCount | int | informational, maintained by the dashboard |
| createdAt, updatedAt | Timestamp | |

`Service` = `{ enabled: bool, description: string, hourlyRate: number, minHours: int, requirements: string, locations: string[] }`
Service keys: `vip_squad`, `bouncers`, `gun_squad`, `personal_security`, `home_security`, `bodyguards`, `corporate_security`, `gate_security`.

## `agencies/{agencyId}/private/payout` — agency + admin only
`accountName`, `accountNumber`, `bankName`, `ifsc`, `upi`, `updatedAt`.

## `personnel/{autoId}` — central registry
| field | type | notes |
|---|---|---|
| agencyId | string | owning agency; `''` for an independent bouncer not (yet) in an agency |
| userId | string \| null | uid of the bouncer's app account once linked |
| source | `'agency' \| 'independent'` | how the record was created |
| inviteCode | string \| null | current `personnelInvites` code for this person |
| address | string | |
| workDays | string[] | `'mon'..'sun'` |
| shifts | string[] | `'morning' \| 'evening' \| 'night'` |
| preferredAreas | string[] | |
| consentAt | Timestamp \| null | bouncer accepted the declarations when submitting |
| reviewedBy, reviewedAt | string, Timestamp | admin who last changed `verificationStatus` |
| code | string | personnel ID shown in UI, e.g. `HV-0042` |
| name, phone, photoUrl | string | |
| dob | string | `YYYY-MM-DD` |
| gender | string | |
| experienceYears, heightCm | int | |
| skills, certifications, languages | string[] | |
| employmentType | `'full_time' \| 'part_time' \| 'contract'` | |
| dailyWage | number | used by payroll |
| verificationStatus | `'draft' \| 'pending' \| 'needs_correction' \| 'verified' \| 'rejected' \| 'expired' \| 'suspended'` | only admin sets verified / needs_correction / rejected / suspended; agency or bouncer may (re)submit → pending |
| adminRemarks | string | |
| availability | `'available' \| 'assigned' \| 'on_leave' \| 'unavailable'` | |
| leaveUntil | string \| null | `YYYY-MM-DD` |
| active | bool | deactivated personnel are hidden from assignment |
| removalRequested | bool | agency asks admin to remove the record |
| createdAt, updatedAt | Timestamp | |

## `documents/{autoId}`
`agencyId`, `ownerType` (`'agency' \| 'personnel'`), `personnelId` (or null), `personnelName`,
`type` (`'identity' \| 'training' \| 'license' \| 'background' \| 'registration' \| 'other'`), `name`, `fileUrl`,
`expiresAt` (`YYYY-MM-DD` or null), `status` (`'pending' \| 'needs_correction' \| 'verified' \| 'rejected' \| 'expired'`), `remarks`, `uploadedAt`,
`reviewedBy`, `reviewedAt`. Personnel docs uploaded by the bouncer carry the personnel's current `agencyId` (`''` if independent);
the bouncer app re-syncs `agencyId` on its own non-verified docs after the bouncer joins an agency.
Bouncer document types: `identity`, `other` (address proof), `training`, `background`.

## `bookings/{autoId}`
| field | type | notes |
|---|---|---|
| customerId, customerName, customerPhone | string | |
| agencyId, agencyName | string | |
| service, serviceLabel | string | service key + display name |
| eventType | string | "Wedding", "Club night", "Corporate event", "Concert", "Private party", "Residence", "Other" |
| eventDate | Timestamp | start |
| hours | int | per shift |
| location | string | |
| guests | int | |
| personnelCount | int | how many people the client needs |
| requirements | string | dress code, language, height, etc. |
| hourlyRate | number | per person, snapshot |
| subtotal, platformFee, tax, totalAmount | number | `subtotal = hourlyRate × hours × personnelCount` |
| status | `'pending' \| 'accepted' \| 'declined' \| 'assigned' \| 'confirmed' \| 'ongoing' \| 'completed' \| 'cancelled'` | see lifecycle below |
| acceptedIds, declinedIds | string[] | personnelIds who accepted / declined their assignment offer |
| assigned | `{ personnelId, code, name, photoUrl, skills[] }[]` | denormalised for the client |
| assignedIds | string[] | for overlap checks |
| clientApproval | `'none' \| 'pending' \| 'approved' \| 'changes_requested'` | client reviews the assigned team |
| clientFeedback | string | reason when changes requested |
| agencyNote | string | |
| rescheduleRequest | `{ date: Timestamp, reason: string, by: 'agency' \| 'customer' }` \| null | |
| cancelReason | string | |
| paymentStatus | `'unpaid' \| 'paid' \| 'refunded'` | admin / payment backend sets this |
| reviewed | bool | |
| createdAt, updatedAt | Timestamp | |

Lifecycle (user-facing labels in brackets):
```
pending [Awaiting agency response] ──agency accepts──▶ accepted [Accepted – awaiting assignment]
  ├─agency──▶ declined                                   │ agency assigns team → creates assignments/*
  └─client──▶ cancelled                                  ▼
             assigned [Awaiting bouncer response] ──last assigned bouncer accepts──▶ confirmed [Confirmed]
                ▲   │ a bouncer declines → agency replaces them                       │ first check-in, or agency
                └───┘                                                                 ▼
                                             completed [Completed] ◀──agency── ongoing [In progress]
```
* Client may cancel while pending / accepted / assigned / confirmed. Agency may cancel after accepting (reason required).
* `clientApproval` is feedback only now: the client may request team changes (`changes_requested`); it never gates the flow.
* The agency may record an acceptance on behalf of a bouncer who has no app account.
* Admin may set any status.

## `assignments/{bookingId}_{personnelId}` — one offer per person per booking
`bookingId`, `agencyId`, `agencyName`, `agencyPhone`, `personnelId`, `personnelName`,
`status` (`'offered' \| 'accepted' \| 'declined' \| 'withdrawn'`), `declineReason`, `respondBy` (Timestamp), `respondedAt`,
job snapshot: `serviceLabel`, `eventType`, `eventDate` (Timestamp), `hours`, `location`, `requirements`, `agencyNote`, `customerName`,
`checkIn`, `checkOut` (`{ at: Timestamp, lat, lng, accuracy }` \| null), `createdAt`, `updatedAt`.
The agency creates / withdraws offers. The bouncer accepts (only when their personnel record is `verified`) or declines,
then checks in / out. On accept/decline the bouncer app also updates the booking's `acceptedIds` / `declinedIds` in the same
transaction, and moves `assigned → confirmed` once everyone assigned has accepted. First check-in moves `confirmed → ongoing`.

## `personnelInvites/{code}` — doc id is the secret 8-char invite code
`code`, `personnelId`, `agencyId`, `agencyName`, `name`, `phone`, `usedBy` (uid \| null), `usedAt`, `createdAt`.
The agency creates it and sets `personnel.inviteCode = code`. The bouncer redeems it in one batch:
`personnelInvites/{code}` `{usedBy: uid, usedAt}` + `personnel` `{userId: uid, updatedAt}` + `users/{uid}` `{personnelId}`.

## `joinRequests/{personnelId}` — an independent bouncer asks to join an approved agency
`personnelId`, `userId`, `agencyId`, `agencyName`, `name`, `phone`, `photoUrl`, `experienceYears`, `skills`,
`status` (`'pending' \| 'accepted' \| 'rejected'`), `createdAt`, `respondedAt`.
The bouncer finds the agency with `agencies where joinCode == X and status == 'approved'`.
Independent personnel docs use the bouncer's uid as the doc id. On accept the agency owner/manager, in one batch, sets
`personnel` `{agencyId, code, employmentType, dailyWage, updatedAt}` and the request `{status: 'accepted', respondedAt}`.

## `attendance/{autoId}`
`agencyId`, `bookingId`, `personnelId`, `personnelName`, `date` (`YYYY-MM-DD`), `scheduledStart` (Timestamp),
`checkIn`, `checkOut` (Timestamp \| null), `status` (`'present' \| 'late' \| 'absent'`), `overtimeHours`,
`clientConfirmed` (bool), `correction` (`{ reason, status: 'open' \| 'approved' \| 'rejected' }` \| null), `customerId`,
`source` (`'agency' \| 'app'`), `checkInLocation`, `checkOutLocation` (`{ lat, lng, accuracy }` \| null).
A bouncer's self check-in creates `attendance/{bookingId}_{personnelId}` (must include `checkOut: null`, `clientConfirmed: false`);
afterwards the bouncer may only set `checkOut` / `checkOutLocation` once. An accepted assignment with no check-in
30 minutes after the start time is a *missed check-in* and is flagged to the agency.

## `agreements/{autoId}`
`agencyId`, `agencyName`, `customerId`, `customerName`, `bookingId` (or null), `type` (`'booking' \| 'long_term'`),
`title`, `terms`, `amount`, `startDate`, `endDate` (`YYYY-MM-DD`), `status` (`'draft' \| 'sent' \| 'accepted' \| 'declined'`),
`agencyAccepted`, `clientAccepted` (bool), `version` (int), `history` (`{ at, by, action }[]`), `createdAt`, `updatedAt`.

## `transactions/{autoId}` — written by admin / payment backend, read by the agency
`agencyId`, `bookingId`, `type` (`'payment' \| 'refund' \| 'payout' \| 'commission'`), `amount`, `status` (`'pending' \| 'completed'`), `note`, `createdAt`.

## `payroll/{autoId}`
`agencyId`, `personnelId`, `personnelName`, `month` (`YYYY-MM`), `daysWorked`, `dailyWage`, `overtimePay`,
`advance`, `deductions`, `net`, `status` (`'pending' \| 'paid'`), `paidAt`, `createdAt`.

## `notifications/{autoId}`
`recipientId` (a user uid **or** an agencyId), `type` (`'booking' \| 'assignment' \| 'verification' \| 'agreement' \| 'payment' \| 'document' \| 'message' \| 'announcement' \| 'emergency'`),
`title`, `body`, `link`, `read` (bool), `createdAt`.

## `reviews/{bookingId}` (one per booking)
`bookingId`, `agencyId`, `customerId`, `customerName`, `rating` (1–5), `comment`,
`personnelFeedback` (string), `reply`, `replyAt`, `reported` (bool), `createdAt`.

## `tickets/{autoId}` — complaints & support
`agencyId`, `customerId` (or null), `customerName`, `reporterId` (bouncer uid; absent otherwise), `reporterName`, `bookingId` (or null), `subject`, `category` (`'complaint' \| 'support' \| 'incident'`),
`priority` (`'normal' \| 'high' \| 'emergency'`), `status` (`'open' \| 'in_progress' \| 'escalated' \| 'resolved'`),
`messages` (`{ by: 'agency' \| 'customer' \| 'admin' \| 'bouncer', name, text, at }[]`), `createdAt`, `updatedAt`.
Bouncer tickets have `customerId: null`, `customerName: ''` and `agencyId` = their agency (`''` → handled by Haven admin).

## `activity/{autoId}` — agency audit log
`agencyId`, `actorId`, `actorName`, `action`, `target`, `createdAt`.

## `settings/app`
`currency`, `commissionPercent`, `taxPercent`, `supportEmail`, `supportPhone`.

## Queries & indexes
New code uses only single-field equality queries (plus `where('status','==','approved')` on agencies) and sorts on the
client, so no new composite index is needed.
