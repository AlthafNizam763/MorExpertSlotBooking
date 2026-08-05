import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IActivityLogDocument extends Document {
  actor: string;
  action: string;
  bookingId?: string;
  oldValue?: string;
  newValue?: string;
  ip?: string;
  timestamp: Date;
}

const ActivityLogSchema: Schema = new Schema(
  {
    actor: { type: String, required: true },
    action: { type: String, required: true },
    bookingId: { type: String, default: '' },
    oldValue: { type: String, default: '' },
    newValue: { type: String, default: '' },
    ip: { type: String, default: '127.0.0.1' },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const ActivityLog: Model<IActivityLogDocument> =
  mongoose.models.ActivityLog || mongoose.model<IActivityLogDocument>('ActivityLog', ActivityLogSchema);

export default ActivityLog;
