import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAdminDocument extends Document {
  name: string;
  email: string;
  password: string;
  role: 'admin';
  createdAt: Date;
}

const AdminSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin'], default: 'admin' },
  },
  { timestamps: true }
);

export const Admin: Model<IAdminDocument> =
  mongoose.models.Admin || mongoose.model<IAdminDocument>('Admin', AdminSchema);

export default Admin;
