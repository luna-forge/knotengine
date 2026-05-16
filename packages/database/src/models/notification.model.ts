import mongoose, { Schema, Document } from "mongoose";

// ============================================================
// 🔔 NOTIFICATION MODEL
// Persists in-app notifications for merchants.
// ============================================================

export interface INotification extends Document {
  merchantId?: mongoose.Types.ObjectId;
  organizationId?: mongoose.Types.ObjectId;
  title: string;
  description: string;
  type: "success" | "warning" | "error" | "info";
  isRead: boolean;
  link?: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: "Merchant" },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: {
      type: String,
      enum: ["success", "warning", "error", "info"],
      default: "info",
    },
    isRead: { type: Boolean, default: false },
    link: { type: String },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

NotificationSchema.index({ merchantId: 1, isRead: 1 });
NotificationSchema.index({ merchantId: 1, "meta.invoiceId": 1, isRead: 1 });
// 30-day Retention: MongoDB will auto-delete notifications older than 30 days
NotificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 30 },
);

export const Notification = mongoose.model<INotification>(
  "Notification",
  NotificationSchema,
);
