import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISettingsDocument extends Document {
  defaultPrice: number;
  holidayDates: string[];
  workingDays: number[];
  theme: string;
}

const SettingsSchema: Schema = new Schema(
  {
    defaultPrice: { type: Number, default: 500 },
    holidayDates: { type: [String], default: [] },
    workingDays: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] },
    theme: { type: String, default: 'default' },
  },
  { timestamps: true }
);

export const Settings: Model<ISettingsDocument> =
  mongoose.models.Settings || mongoose.model<ISettingsDocument>('Settings', SettingsSchema);

export default Settings;
