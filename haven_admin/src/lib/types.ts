import type { Timestamp } from "firebase/firestore";

// v2 data model — see ../firebase/SCHEMA.md (source of truth).

export type Role = "customer" | "agency" | "admin";
export type StaffRole = "owner" | "manager" | "hr" | "bookings" | "finance";
export type AgencyStatus = "draft" | "pending" | "approved" | "rejected" | "suspended";
export type VerificationStatus = "draft" | "pending" | "verified" | "rejected" | "expired" | "suspended";
export type Availability = "available" | "assigned" | "on_leave" | "unavailable";
export type EmploymentType = "full_time" | "part_time" | "contract";
export type DocStatus = "pending" | "verified" | "rejected" | "expired";
export type DocType = "identity" | "training" | "license" | "background" | "registration" | "other";
export type BookingStatus = "pending" | "accepted" | "declined" | "assigned" | "ongoing" | "completed" | "cancelled";
export type PaymentStatus = "unpaid" | "paid" | "refunded";
export type ClientApproval = "none" | "pending" | "approved" | "changes_requested";
export type TicketStatus = "open" | "in_progress" | "escalated" | "resolved";
export type TicketPriority = "normal" | "high" | "emergency";
export type NotificationType =
  | "booking"
  | "assignment"
  | "verification"
  | "agreement"
  | "payment"
  | "document"
  | "message"
  | "announcement"
  | "emergency";

export interface WithId {
  id: string;
}

export interface AppUser extends WithId {
  uid: string;
  name: string;
  email: string;
  phone: string;
  photoUrl: string | null;
  role: Role;
  agencyId?: string | null;
  staffRole?: StaffRole | null;
  isActive: boolean;
  createdAt?: Timestamp;
}

export interface Service {
  enabled: boolean;
  description: string;
  hourlyRate: number;
  minHours: number;
  requirements: string;
  locations: string[];
}

export interface Agency extends WithId {
  name: string;
  logoUrl: string;
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
  services: Partial<Record<string, Service>>;
  status: AgencyStatus;
  verified: boolean;
  adminRemarks: string;
  rating: number;
  ratingTotal: number;
  reviewCount: number;
  lastReviewId?: string;
  personnelCount: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Personnel extends WithId {
  agencyId: string;
  code: string;
  name: string;
  phone: string;
  photoUrl: string;
  dob: string;
  gender: string;
  experienceYears: number;
  heightCm: number;
  skills: string[];
  certifications: string[];
  languages: string[];
  employmentType: EmploymentType;
  dailyWage: number;
  verificationStatus: VerificationStatus;
  adminRemarks: string;
  availability: Availability;
  leaveUntil: string | null;
  active: boolean;
  removalRequested: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface AgencyDocument extends WithId {
  agencyId: string;
  ownerType: "agency" | "personnel";
  personnelId: string | null;
  personnelName: string;
  type: DocType;
  name: string;
  fileUrl: string;
  expiresAt: string | null;
  status: DocStatus;
  remarks: string;
  uploadedAt?: Timestamp;
}

export interface AssignedPerson {
  personnelId: string;
  code: string;
  name: string;
  photoUrl: string;
  skills: string[];
}

export interface Booking extends WithId {
  customerId: string;
  customerName: string;
  customerPhone: string;
  agencyId: string;
  agencyName: string;
  service: string;
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
  clientApproval: ClientApproval;
  clientFeedback: string;
  agencyNote: string;
  rescheduleRequest: { date: Timestamp; reason: string; by: "agency" | "customer" } | null;
  cancelReason: string;
  paymentStatus: PaymentStatus;
  reviewed: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
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

export interface TicketMessage {
  by: "agency" | "customer" | "admin";
  name: string;
  text: string;
  at: Timestamp;
}

export interface Ticket extends WithId {
  agencyId: string;
  customerId: string | null;
  customerName: string;
  bookingId: string | null;
  subject: string;
  category: "complaint" | "support" | "incident";
  priority: TicketPriority;
  status: TicketStatus;
  messages: TicketMessage[];
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

export interface AppSettings {
  currency: string;
  commissionPercent: number;
  taxPercent: number;
  supportEmail: string;
  supportPhone: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  currency: "PKR",
  commissionPercent: 10,
  taxPercent: 0,
  supportEmail: "",
  supportPhone: "",
};

export const ROLES: Role[] = ["customer", "agency", "admin"];
export const STAFF_ROLES: StaffRole[] = ["owner", "manager", "hr", "bookings", "finance"];
export const AGENCY_STATUSES: AgencyStatus[] = ["draft", "pending", "approved", "rejected", "suspended"];
export const VERIFICATION_STATUSES: VerificationStatus[] = ["draft", "pending", "verified", "rejected", "expired", "suspended"];
export const DOC_STATUSES: DocStatus[] = ["pending", "verified", "rejected", "expired"];
export const BOOKING_STATUSES: BookingStatus[] = ["pending", "accepted", "declined", "assigned", "ongoing", "completed", "cancelled"];
export const PAYMENT_STATUSES: PaymentStatus[] = ["unpaid", "paid", "refunded"];
export const TICKET_STATUSES: TicketStatus[] = ["open", "in_progress", "escalated", "resolved"];
export const EVENT_TYPES = ["Wedding", "Club night", "Corporate event", "Concert", "Private party", "Residence", "Other"];

export const SERVICE_LABELS: Record<string, string> = {
  vip_squad: "VIP squad",
  bouncers: "Bouncers",
  gun_squad: "Gun squad",
  personal_security: "Personal security",
  home_security: "Home security",
  bodyguards: "Bodyguards",
  corporate_security: "Corporate security",
  gate_security: "Gate security",
};
