# Haven — Firestore data model (v2: agency marketplace)

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
| role | `'customer' \| 'agency' \| 'admin'` | `agency` = anyone working in an agency dashboard (owner or staff) |
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
| status | `'draft' \| 'pending' \| 'approved' \| 'rejected' \| 'suspended'` | only `approved` is visible to customers |
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
| agencyId | string | owning agency |
| code | string | personnel ID shown in UI, e.g. `HV-0042` |
| name, phone, photoUrl | string | |
| dob | string | `YYYY-MM-DD` |
| gender | string | |
| experienceYears, heightCm | int | |
| skills, certifications, languages | string[] | |
| employmentType | `'full_time' \| 'part_time' \| 'contract'` | |
| dailyWage | number | used by payroll |
| verificationStatus | `'draft' \| 'pending' \| 'verified' \| 'rejected' \| 'expired' \| 'suspended'` | admin sets verified/rejected/suspended |
| adminRemarks | string | |
| availability | `'available' \| 'assigned' \| 'on_leave' \| 'unavailable'` | |
| leaveUntil | string \| null | `YYYY-MM-DD` |
| active | bool | deactivated personnel are hidden from assignment |
| removalRequested | bool | agency asks admin to remove the record |
| createdAt, updatedAt | Timestamp | |

## `documents/{autoId}`
`agencyId`, `ownerType` (`'agency' \| 'personnel'`), `personnelId` (or null), `personnelName`,
`type` (`'identity' \| 'training' \| 'license' \| 'background' \| 'registration' \| 'other'`), `name`, `fileUrl`,
`expiresAt` (`YYYY-MM-DD` or null), `status` (`'pending' \| 'verified' \| 'rejected' \| 'expired'`), `remarks`, `uploadedAt`.

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
| status | `'pending' \| 'accepted' \| 'declined' \| 'assigned' \| 'ongoing' \| 'completed' \| 'cancelled'` | |
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

```
pending ─agency─▶ accepted ─agency assigns─▶ assigned ─(client approves)─▶ ongoing ─agency─▶ completed ─client─▶ review
   ├─agency─▶ declined                 ▲            │
   └─client─▶ cancelled ◀─client───────┴────────────┘     client "changes_requested" ─▶ agency re-assigns
admin may set any status.
```

## `attendance/{autoId}`
`agencyId`, `bookingId`, `personnelId`, `personnelName`, `date` (`YYYY-MM-DD`), `scheduledStart` (Timestamp),
`checkIn`, `checkOut` (Timestamp \| null), `status` (`'present' \| 'late' \| 'absent'`), `overtimeHours`,
`clientConfirmed` (bool), `correction` (`{ reason, status: 'open' \| 'approved' \| 'rejected' }` \| null), `customerId`.

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
`agencyId`, `customerId` (or null), `customerName`, `bookingId` (or null), `subject`, `category` (`'complaint' \| 'support' \| 'incident'`),
`priority` (`'normal' \| 'high' \| 'emergency'`), `status` (`'open' \| 'in_progress' \| 'escalated' \| 'resolved'`),
`messages` (`{ by: 'agency' \| 'customer' \| 'admin', name, text, at }[]`), `createdAt`, `updatedAt`.

## `activity/{autoId}` — agency audit log
`agencyId`, `actorId`, `actorName`, `action`, `target`, `createdAt`.

## `settings/app`
`currency`, `commissionPercent`, `taxPercent`, `supportEmail`, `supportPhone`.
