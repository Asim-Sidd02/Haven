import type { Timestamp } from "firebase/firestore";

export interface WithId { id: string }

export type StaffRole = "owner" | "manager" | "hr" | "bookings" | "finance";

export interface AppUser extends WithId {
  uid: string;
  name: string;
  email: string;
  phone: string;
  photoUrl: string | null;
  role: "customer" | "agency" | "admin";
  agencyId: string | null;
  staffRole: StaffRole | null;
  isActive: boolean;
  createdAt?: Timestamp;
}

export interface Invite extends WithId {
  agencyId: string;
  agencyName: string;
  staffRole: StaffRole;
  name: string;
  invitedBy: string;
  createdAt?: Timestamp;
}

export type ServiceKey =
  | "vip_squad" | "bouncers" | "gun_squad" | "personal_security"
  | "home_security" | "bodyguards" | "corporate_security" | "gate_security";

export interface Service {
  enabled: boolean;
  description: string;
  hourlyRate: number;
  minHours: number;
  requirements: string;
  locations: string[];
}

export type AgencyStatus = "draft" | "pending" | "approved" | "rejected" | "suspended";

export interface Agency extends WithId {
  name: string;
  logoUrl: string | null;
  description: string;
  registrationNo: string;
  licenseNo: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  yearsExperience: number;
  areas: string[];
  workingHours: string;
  services: Partial<Record<ServiceKey, Service>>;
  status: AgencyStatus;
  verified: boolean;
  adminRemarks?: string;
  rating: number;
  ratingTotal: number;
  reviewCount: number;
  personnelCount?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Payout {
  accountName: string;
  accountNumber: string;
  bankName: string;
  ifsc: string;
  upi: string;
}

export type Verification = "draft" | "pending" | "verified" | "rejected" | "expired" | "suspended";
export type Availability = "available" | "assigned" | "on_leave" | "unavailable";

export interface Personnel extends WithId {
  agencyId: string;
  code: string;
  name: string;
  phone: string;
  photoUrl: string | null;
  dob: string;
  gender: string;
  experienceYears: number;
  heightCm: number;
  skills: string[];
  certifications: string[];
  languages: string[];
  employmentType: "full_time" | "part_time" | "contract";
  dailyWage: number;
  verificationStatus: Verification;
  adminRemarks?: string;
  availability: Availability;
  leaveUntil: string | null;
  active: boolean;
  removalRequested: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type DocType = "identity" | "training" | "license" | "background" | "registration" | "other";

export interface AgencyDoc extends WithId {
  agencyId: string;
  ownerType: "agency" | "personnel";
  personnelId: string | null;
  personnelName: string;
  type: DocType;
  name: string;
  fileUrl: string;
  expiresAt: string | null;
  status: "pending" | "verified" | "rejected" | "expired";
  remarks: string;
  uploadedAt?: Timestamp;
}

export type BookingStatus = "pending" | "accepted" | "declined" | "assigned" | "ongoing" | "completed" | "cancelled";

export interface AssignedPerson {
  personnelId: string;
  code: string;
  name: string;
  photoUrl: string | null;
  skills: string[];
}

export interface Booking extends WithId {
  customerId: string;
  customerName: string;
  customerPhone: string;
  agencyId: string;
  agencyName: string;
  service: ServiceKey;
  serviceLabel: string;
  eventType: string;
  eventDate?: Timestamp;
  hours: number;
  location: string;
  guests: number;
  personnelCount: number;
  requirements: string;
  hourlyRate: number;
  subtotal: number;
  platformFee: number;
  tax: number;
  totalAmount: number;
  status: BookingStatus;
  assigned: AssignedPerson[];
  assignedIds: string[];
  clientApproval: "none" | "pending" | "approved" | "changes_requested";
  clientFeedback: string;
  agencyNote: string;
  rescheduleRequest: { date: Timestamp; reason: string; by: "agency" | "customer" } | null;
  cancelReason?: string;
  paymentStatus: "unpaid" | "paid" | "refunded";
  reviewed: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Attendance extends WithId {
  agencyId: string;
  bookingId: string;
  customerId: string;
  personnelId: string;
  personnelName: string;
  date: string;
  scheduledStart?: Timestamp;
  checkIn: Timestamp | null;
  checkOut: Timestamp | null;
  status: "present" | "late" | "absent";
  overtimeHours: number;
  clientConfirmed: boolean;
  correction: { reason: string; status: "open" | "approved" | "rejected" } | null;
}

export interface Agreement extends WithId {
  agencyId: string;
  agencyName: string;
  customerId: string;
  customerName: string;
  bookingId: string | null;
  type: "booking" | "long_term";
  title: string;
  terms: string;
  amount: number;
  startDate: string;
  endDate: string;
  status: "draft" | "sent" | "accepted" | "declined";
  agencyAccepted: boolean;
  clientAccepted: boolean;
  version: number;
  history: { at: Timestamp; by: string; action: string }[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Transaction extends WithId {
  agencyId: string;
  bookingId: string;
  type: "payment" | "refund" | "payout" | "commission";
  amount: number;
  status: "pending" | "completed";
  note: string;
  createdAt?: Timestamp;
}

export interface Payroll extends WithId {
  agencyId: string;
  personnelId: string;
  personnelName: string;
  month: string;
  daysWorked: number;
  dailyWage: number;
  overtimePay: number;
  advance: number;
  deductions: number;
  net: number;
  status: "pending" | "paid";
  paidAt: Timestamp | null;
  createdAt?: Timestamp;
}

export interface Notice extends WithId {
  recipientId: string;
  type: "booking" | "assignment" | "verification" | "agreement" | "payment" | "document" | "message" | "announcement" | "emergency";
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt?: Timestamp;
}

export interface Review extends WithId {
  bookingId: string;
  agencyId: string;
  customerId: string;
  customerName: string;
  rating: number;
  comment: string;
  personnelFeedback?: string;
  reply?: string;
  replyAt?: Timestamp;
  reported?: boolean;
  createdAt?: Timestamp;
}

export interface TicketMsg { by: "agency" | "customer" | "admin"; name: string; text: string; at: Timestamp }

export interface Ticket extends WithId {
  agencyId: string;
  customerId: string | null;
  customerName: string;
  bookingId: string | null;
  subject: string;
  category: "complaint" | "support" | "incident";
  priority: "normal" | "high" | "emergency";
  status: "open" | "in_progress" | "escalated" | "resolved";
  messages: TicketMsg[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Activity extends WithId {
  agencyId: string;
  actorId: string;
  actorName: string;
  action: string;
  target: string;
  createdAt?: Timestamp;
}

export interface AppSettings {
  currency: string;
  commissionPercent: number;
  taxPercent: number;
  supportEmail: string;
  supportPhone: string;
}

export const DEFAULT_SETTINGS: AppSettings = { currency: "INR", commissionPercent: 10, taxPercent: 18, supportEmail: "", supportPhone: "" };

export const SERVICES: { key: ServiceKey; label: string; hint: string; licensed?: boolean }[] = [
  { key: "bouncers", label: "Bouncers", hint: "Door control, crowd management and ID checks" },
  { key: "vip_squad", label: "VIP Squad", hint: "Teams for celebrities, dignitaries and VIP areas" },
  { key: "bodyguards", label: "Bodyguards", hint: "Close protection for individuals" },
  { key: "personal_security", label: "Personal Security", hint: "Escorts and day-to-day personal safety" },
  { key: "corporate_security", label: "Corporate Security", hint: "Offices, events and executive protection" },
  { key: "home_security", label: "Home Security", hint: "Residences and gated communities" },
  { key: "gate_security", label: "Gate Security", hint: "Static guards for entrances and premises" },
  { key: "gun_squad", label: "Armed Guards", hint: "Licensed armed personnel only", licensed: true },
];

export const serviceLabel = (k: string) => SERVICES.find((s) => s.key === k)?.label ?? k;

export const STAFF_ROLES: { key: StaffRole; label: string; desc: string }[] = [
  { key: "owner", label: "Owner", desc: "Full access, including staff and payout details" },
  { key: "manager", label: "Manager", desc: "Full access to every module" },
  { key: "hr", label: "HR", desc: "Personnel, documents, availability, attendance, payroll" },
  { key: "bookings", label: "Bookings", desc: "Bookings, assignments, clients, agreements, support" },
  { key: "finance", label: "Finance", desc: "Payments, payroll and reports" },
];

export const DOC_TYPES: { key: DocType; label: string }[] = [
  { key: "identity", label: "Identity proof" },
  { key: "training", label: "Training certificate" },
  { key: "license", label: "Licence / authorisation" },
  { key: "background", label: "Background verification" },
  { key: "registration", label: "Business registration" },
  { key: "other", label: "Other" },
];
