import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOtpVerificationDocument extends Document {
  email: string;
  emailOtp: string;
  emailVerified: number; // 0 = Not Verified, 1 = Verified
  emailCreatedAt: Date;
  emailExpiresAt: Date;
  phone: string;
  phoneOtp: string;
  phoneVerified: number; // 0 = Not Verified, 1 = Verified
  phoneCreatedAt: Date;
  phoneExpiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const OtpVerificationSchema: Schema = new Schema(
  {
    email: { type: String, required: true, index: true },
    emailOtp: { type: String, required: true },
    emailVerified: { type: Number, default: 0 }, // 0 or 1
    emailCreatedAt: { type: Date, default: Date.now },
    emailExpiresAt: { type: Date, required: true },
    phone: { type: String, required: true, index: true },
    phoneOtp: { type: String, required: true },
    phoneVerified: { type: Number, default: 0 }, // 0 or 1
    phoneCreatedAt: { type: Date, default: Date.now },
    phoneExpiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Index compound for quick lookup by email and phone
OtpVerificationSchema.index({ email: 1, phone: 1 });

export const OtpVerification: Model<IOtpVerificationDocument> =
  mongoose.models.OtpVerification ||
  mongoose.model<IOtpVerificationDocument>('OtpVerification', OtpVerificationSchema);

export default OtpVerification;
