import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISlotDocument extends Document {
  date: string;
  time: string;
  capacity: number;
  booked: number;
  isAvailable: boolean;
}

const SlotSchema: Schema = new Schema(
  {
    date: { type: String, required: true, index: true },
    time: { type: String, required: true },
    capacity: { type: Number, default: 1 },
    booked: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

SlotSchema.index({ date: 1, time: 1 }, { unique: true });

export const Slot: Model<ISlotDocument> =
  mongoose.models.Slot || mongoose.model<ISlotDocument>('Slot', SlotSchema);

export default Slot;
