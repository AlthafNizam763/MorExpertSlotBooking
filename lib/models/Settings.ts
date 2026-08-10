import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISettingsDocument extends Document {
  defaultPrice: number;
  holidayDates: string[];
  workingDays: number[];
  theme: string;

  // Payment configuration
  upiId: string;
  upiPayeeName: string;
  upiQrImageUrl: string;
  holdMinutes: number;
}

const SettingsSchema: Schema = new Schema(
  {
    defaultPrice: { type: Number, default: 500 },
    holidayDates: { type: [String], default: [] },
    workingDays: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] },
    theme: { type: String, default: 'default' },

    upiId: { type: String, default: '' },
    upiPayeeName: { type: String, default: '' },
    upiQrImageUrl: { type: String, default: '' },
    holdMinutes: { type: Number, default: 10 },
  },
  { timestamps: true }
);

if (mongoose.models && mongoose.models.Settings) {
  delete (mongoose.models as any).Settings;
}

export const Settings: Model<ISettingsDocument> =
  mongoose.models.Settings || mongoose.model<ISettingsDocument>('Settings', SettingsSchema);

export default Settings;
