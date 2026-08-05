export type BookingStatus =
  | 'Draft'
  | 'OTP Verified'
  | 'Pending Admin Approval'
  | 'Approved'
  | 'Rejected'
  | 'Rescheduled'
  | 'Completed'
  | 'Cancelled'
  | 'Pending'
  | 'Price Assigned'
  | 'Confirmed'
  | 'Resume Under Review';

export type AdminRole = 'super_admin' | 'staff_admin' | 'admin';

export interface ITimelineEvent {
  title: string;
  timestamp: string;
  actor: string;
  notes?: string;
}

export interface IBooking {
  _id?: string;
  bookingId: string;
  name: string;
  email: string;
  phone: string;
  resume: string;
  notes?: string;
  date: string; // YYYY-MM-DD
  slot: string; // e.g. "09:00 AM", "11:00 AM", "03:00 PM"
  status: BookingStatus;
  price?: number | null;
  remarks?: string;
  privateNotes?: string;
  publicNotes?: string;
  rejectionReason?: string;
  rescheduledFrom?: { date: string; slot: string };
  rescheduledTo?: { date: string; slot: string };
  otpVerified?: boolean;
  timeline?: ITimelineEvent[];
  createdAt?: string;
}

export interface ISlot {
  _id?: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. "09:00 AM"
  capacity: number;
  booked: number;
  isAvailable: boolean;
}

export interface ISettings {
  defaultPrice: number;
  holidayDates: string[];
  workingDays: number[];
  theme?: string;
}

export interface IAdmin {
  _id?: string;
  name: string;
  email: string;
  role: AdminRole;
  createdAt?: string;
}

export interface IActivityLog {
  _id?: string;
  actor: string;
  action: string;
  bookingId?: string;
  oldValue?: string;
  newValue?: string;
  ip?: string;
  timestamp: string;
}
