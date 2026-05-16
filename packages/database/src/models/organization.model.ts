import mongoose, { Schema, Document } from "mongoose";

export interface IOrganization extends Document {
  organizationId: string;
  name: string;
  slug?: string;
  logoUrl?: string;
  brandColor?: string;
  plan: "starter" | "professional" | "enterprise";
  creditBalance: number;
  yieldAccruedUsd: number;
  lastYieldSyncAt?: Date;
  planStartedAt?: Date;
  planExpiresAt?: Date;
  trialStartsAt?: Date;
  trialEndsAt?: Date;
  lastProratedAmount?: number;
  lastProratedDate?: Date;
  gracePeriodStarted?: Date;
  gracePeriodEnds?: Date;
  maxSeats: number;
  customDomain?: string;
  customDomainVerified: boolean;
  customDomainToken?: string;
  referralCode?: string;
  referredBy?: mongoose.Types.ObjectId;
  referralEarningsUsd: number;
  welcomeBonusClaimed: boolean;
  settings: {
    defaultCurrency: string;
    timezone: string;
    locale: string;
  };
  metadata?: Record<string, string>;
  deletedAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema: Schema = new Schema(
  {
    organizationId: { type: String, unique: true, sparse: true },
    name: { type: String, required: true },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    logoUrl: { type: String },
    brandColor: { type: String, default: "#ffffff" },
    plan: {
      type: String,
      enum: ["starter", "professional", "enterprise"],
      default: "starter",
    },
    creditBalance: { type: Number, default: 0 },
    yieldAccruedUsd: { type: Number, default: 0 },
    lastYieldSyncAt: { type: Date },
    planStartedAt: { type: Date, default: Date.now },
    planExpiresAt: { type: Date },
    trialStartsAt: { type: Date },
    trialEndsAt: { type: Date },
    lastProratedAmount: { type: Number },
    lastProratedDate: { type: Date },
    gracePeriodStarted: { type: Date },
    gracePeriodEnds: { type: Date },
    maxSeats: { type: Number, default: 1 },
    customDomain: { type: String, sparse: true },
    customDomainVerified: { type: Boolean, default: false },
    customDomainToken: { type: String, sparse: true },
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: Schema.Types.ObjectId, ref: "User" },
    referralEarningsUsd: { type: Number, default: 0 },
    welcomeBonusClaimed: { type: Boolean, default: false },
    settings: {
      type: {
        defaultCurrency: { type: String, default: "USD" },
        timezone: { type: String, default: "UTC" },
        locale: { type: String, default: "en" },
      },
      default: { defaultCurrency: "USD", timezone: "UTC", locale: "en" },
    },
    metadata: { type: Map, of: String },
    deletedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

OrganizationSchema.index({ plan: 1, deletedAt: -1 });
OrganizationSchema.index(
  { trialEndsAt: 1 },
  { partialFilterExpression: { trialEndsAt: { $exists: true } } },
);

export const Organization = mongoose.model<IOrganization>(
  "Organization",
  OrganizationSchema,
);
