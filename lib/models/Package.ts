import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPackageDocument extends Document {
  name: string;
  price: number;
  description: string;
  includedDocuments: string[];
  includedServices: string[];
  gradientTheme?: string;
  isPopular?: boolean;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const PackageSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String, required: true },
    includedDocuments: { type: [String], default: [] },
    includedServices: { type: [String], default: [] },
    gradientTheme: { type: String, default: 'from-blue-600 to-indigo-600' },
    isPopular: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const PackageModel: Model<IPackageDocument> =
  mongoose.models.Package || mongoose.model<IPackageDocument>('Package', PackageSchema);

export default PackageModel;
