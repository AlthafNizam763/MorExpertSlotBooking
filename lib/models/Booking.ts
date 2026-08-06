import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBookingDocument extends Document {
  bookingId: string;
  name: string;
  email: string;
  phone: string;
  resume: string;
  notes?: string;
  date: string;
  slot: string;
  status: string;
  price?: number | null;
  packageName?: string;
  packagePrice?: number;
  remarks?: string;
  privateNotes?: string;
  publicNotes?: string;
  rejectionReason?: string;
  rescheduledFrom?: { date: string; slot: string };
  rescheduledTo?: { date: string; slot: string };
  otpVerified: boolean;
  bookingSource?: 'User' | 'Admin';
  timeline: Array<{ title: string; timestamp: Date; actor: string; notes?: string }>;
  createdAt: Date;
}

const TimelineEventSchema = new Schema(
  {
    title: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    actor: { type: String, default: 'System' },
    notes: { type: String, default: '' },
  },
  { _id: false }
);

const BookingSchema: Schema = new Schema(
  {
    bookingId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, default: '' },
    phone: { type: String, required: true, index: true },
    resume: { type: String, default: '' },
    notes: { type: String, default: '' },
    date: { type: String, required: true, index: true },
    slot: { type: String, required: true },
    status: {
      type: String,
      default: 'Pending Admin Approval',
    },
    price: { type: Number, default: null },
    packageName: { type: String, default: '' },
    packagePrice: { type: Number, default: null },
    remarks: { type: String, default: '' },
    privateNotes: { type: String, default: '' },
    publicNotes: { type: String, default: '' },
    rejectionReason: { type: String, default: '' },
    rescheduledFrom: {
      date: { type: String },
      slot: { type: String },
    },
    rescheduledTo: {
      date: { type: String },
      slot: { type: String },
    },
    otpVerified: { type: Boolean, default: false },
    bookingSource: { type: String, enum: ['User', 'Admin'], default: 'User' },
    timeline: { type: [TimelineEventSchema], default: [] },
  },
  { timestamps: true }
);

if (mongoose.models && mongoose.models.Booking) {
  delete (mongoose.models as any).Booking;
}

export const Booking: Model<IBookingDocument> =
  mongoose.models.Booking || mongoose.model<IBookingDocument>('Booking', BookingSchema);

export default Booking;
