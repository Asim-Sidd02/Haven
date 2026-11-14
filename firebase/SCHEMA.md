# Haven — Firestore data model

Shared contract between the Flutter app (`haven_app`) and the admin dashboard (`haven_admin`).
All timestamps are Firestore `Timestamp`.

## `users/{uid}`
| field | type | notes |
|---|---|---|
| uid | string | same as doc id |
| name | string | |
| email | string | |
| phone | string | |
| photoUrl | string \| null | |
| role | `'customer' \| 'bouncer' \| 'admin'` | admin can only be set from the dashboard / console |
| isActive | bool | admin can deactivate; app signs out inactive users |
| createdAt | Timestamp | |

## `bouncers/{uid}` (public profile, doc id = the bouncer's user uid)
| field | type | notes |
|---|---|---|
| uid | string | |
| name | string | |
| photoUrl | string \| null | |
| bio | string | |
| city | string | |
| experienceYears | int | |
| hourlyRate | number | in local currency |
| heightCm | int | |
| skills | string[] | e.g. "Crowd control", "VIP protection", "First aid" |
| languages | string[] | |
| available | bool | bouncer toggles "taking bookings" |
| status | `'pending' \| 'approved' \| 'rejected' \| 'suspended'` | admin moderation; only `approved` is visible to customers |
| verified | bool | admin-granted badge |
| rating | number | ratingTotal / reviewCount (0 when none) |
| ratingTotal | int | sum of stars |
| reviewCount | int | |
| lastReviewId | string \| null | internal marker written atomically with a new review |
| createdAt | Timestamp | |
| updatedAt | Timestamp | |

## `bookings/{autoId}`
| field | type | notes |
|---|---|---|
| customerId, customerName, customerPhone | string | denormalized |
| bouncerId, bouncerName | string | denormalized |
| bouncerPhotoUrl | string \| null | |
| eventType | string | "Private party", "Wedding", "Club night", "Corporate event", "Concert", "Other" |
| eventDate | Timestamp | start date + time |
| hours | int | |
| location | string | |
| guests | int | |
| notes | string | |
| hourlyRate | number | snapshot at booking time |
| totalAmount | number | hourlyRate × hours |
| status | `'pending' \| 'accepted' \| 'declined' \| 'completed' \| 'cancelled'` | |
| bouncerNote | string | optional message from bouncer |
| reviewed | bool | |
| createdAt, updatedAt | Timestamp | |

## `reviews/{bookingId}` (one per booking)
| field | type |
|---|---|
| bookingId, bouncerId, customerId, customerName | string |
| rating | int 1–5 |
| comment | string |
| createdAt | Timestamp |

## `settings/app`
| field | type | notes |
|---|---|---|
| currency | string | e.g. "PKR" |
| commissionPercent | number | informational |
| supportEmail | string | |
| supportPhone | string | |

## Status flow
```
pending ──bouncer──▶ accepted ──bouncer──▶ completed ──customer──▶ (review)
   │                    │
   ├──bouncer──▶ declined
   └──customer─▶ cancelled ◀──customer──┘
admin may set any status.
```
