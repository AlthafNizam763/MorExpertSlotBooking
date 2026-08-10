import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Uploaded files (payment screenshots, resumes, the static UPI QR) are stored as
 * documents rather than as files under public/uploads.
 *
 * The app runs on a serverless host where the bundle directory (/var/task) is
 * read-only and every invocation gets a fresh container, so a file written to disk
 * either fails outright with ENOENT or disappears before an admin can look at it.
 * Keeping the bytes in MongoDB is what makes an uploaded screenshot durable.
 *
 * Documents are capped by the 16 MB BSON limit; saveUploadedFile() enforces a far
 * smaller ceiling per upload kind.
 */
export interface IUploadDocument extends Document {
  filename: string;
  contentType: string;
  size: number;
  hash: string;
  kind: string;
  data: Buffer;
  createdAt: Date;
  updatedAt: Date;
}

const UploadSchema: Schema = new Schema(
  {
    filename: { type: String, required: true },
    contentType: { type: String, default: 'application/octet-stream' },
    size: { type: Number, required: true },
    // SHA-256 of the contents. Not unique: the same screenshot being reused for a
    // second booking is rejected by the PaymentSession proofHash index, not here.
    hash: { type: String, required: true, index: true },
    kind: { type: String, default: 'file', index: true },
    data: { type: Buffer, required: true },
  },
  { timestamps: true }
);

export const Upload: Model<IUploadDocument> =
  (mongoose.models.Upload as Model<IUploadDocument>) ||
  mongoose.model<IUploadDocument>('Upload', UploadSchema);

export default Upload;
