import type { Timestamp } from "firebase/firestore";

export type Role = "customer" | "bouncer" | "admin";
export type BouncerStatus = "pending" | "approved" | "rejected" | "suspended";
export type BookingStatus = "pending" | "accepted" | "declined" | "completed" | "cancelled";

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
  isActive: boolean;
  createdAt?: Timestamp;
}

export interface Bouncer extends WithId {
  uid: string;
  name: string;
  photoUrl: string | null;
  bio: string;
  city: string;
  experienceYears: number;
  hourlyRate: number;
  heightCm: number;
  skills: string[];
  languages: string[];
  available: boolean;
  status: BouncerStatus;
  verified: boolean;
  rating: number;
  ratingTotal: number;
  reviewCount: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Booking extends WithId {
  customerId: string;
  customerName: string;
  customerPhone: string;
  bouncerId: string;
  bouncerName: string;
  bouncerPhotoUrl: string | null;
  eventType: string;
  eventDate?: Timestamp;
  hours: number;
  location: string;
  guests: number;
  notes: string;
  hourlyRate: number;
  totalAmount: number;
  status: BookingStatus;
  bouncerNote?: string;
  reviewed: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Review extends WithId {
  bookingId: string;
  bouncerId: string;
  customerId: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt?: Timestamp;
}

export interface AppSettings {
  currency: string;
  commissionPercent: number;
  supportEmail: string;
  supportPhone: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  currency: "PKR",
  commissionPercent: 10,
  supportEmail: "",
  supportPhone: "",
};

export const BOUNCER_STATUSES: BouncerStatus[] = ["pending", "approved", "rejected", "suspended"];
export const BOOKING_STATUSES: BookingStatus[] = ["pending", "accepted", "declined", "completed", "cancelled"];
export const ROLES: Role[] = ["customer", "bouncer", "admin"];
export const EVENT_TYPES = ["Private party", "Wedding", "Club night", "Corporate event", "Concert", "Other"];
