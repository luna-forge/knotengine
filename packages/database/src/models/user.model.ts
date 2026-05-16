import mongoose, { Schema, Document } from "mongoose";

// ============================================================
// 👤 USER MODEL
// Represents an identity (OAuth user) that can own multiple merchants.
// Holds the shared credit balance and yield earnings.
// ============================================================

export interface IUser extends Document {
  oauthId: string;
  email?: string;
  emailVerified: boolean;
  creditBalance: number;
  yieldAccruedUsd: number;
  lastYieldSyncAt?: Date;
  welcomeBonusClaimed: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  twoFactorBackupCodes?: string[];
  referralCode?: string;
  referredBy?: mongoose.Types.ObjectId;
  referralEarningsUsd: number;
  organizationId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    oauthId: { type: String, unique: true, required: true },
    email: { type: String, sparse: true },
    emailVerified: { type: Boolean, default: false },
    creditBalance: { type: Number, default: 0 },
    yieldAccruedUsd: { type: Number, default: 0 },
    lastYieldSyncAt: { type: Date },
    welcomeBonusClaimed: { type: Boolean, default: false },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String },
    twoFactorBackupCodes: { type: [String], default: [] },
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: Schema.Types.ObjectId, ref: "User" },
    referralEarningsUsd: { type: Number, default: 0 },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },
  },
  { timestamps: true },
);

export const User = mongoose.model<IUser>("User", UserSchema);
