import mongoose, { Schema, Document } from "mongoose";

// ============================================================
// 🏪 MERCHANT MODEL
// Holds merchant settings, public derivation keys, and API auth.
// ============================================================

export interface IMerchant extends Document {
  merchantId: string;
  userId?: mongoose.Types.ObjectId;
  organizationId?: mongoose.Types.ObjectId;
  name: string;
  apiKeyHash?: string;
  oauthId?: string;
  email?: string;
  btcXpub?: string;
  btcXpubTestnet?: string;
  ethAddress?: string;
  ethAddressTestnet?: string;
  ethXpub?: string;
  ethXpubTestnet?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  webhookEvents?: string[];
  logoUrl?: string;
  returnUrl?: string;
  theme: "light" | "dark" | "system";
  brandColor?: string;
  brandingEnabled: boolean;
  removeBranding: boolean;
  brandingAlignment?: "left" | "center";
  enabledCurrencies: string[];
  derivationIndex: number;
  confirmationPolicy: {
    BTC: number;
    LTC: number;
    ETH: number;
  };
  feesAccrued: {
    usd: number;
    BTC: number;
    LTC: number;
    ETH: number;
    USDT_ERC20: number;
    USDT_POLYGON: number;
  };
  feeResponsibility: "merchant" | "client";
  invoiceExpirationMinutes: number;
  underpaymentTolerancePercentage: number;
  bip21Enabled: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MerchantSchema: Schema = new Schema(
  {
    merchantId: { type: String, unique: true, sparse: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },
    name: { type: String, default: "" },
    apiKeyHash: { type: String, sparse: true, unique: true },
    oauthId: { type: String, sparse: true },
    email: { type: String, sparse: true },
    btcXpub: { type: String },
    btcXpubTestnet: { type: String },
    ethAddress: { type: String },
    ethAddressTestnet: { type: String },
    ethXpub: { type: String },
    ethXpubTestnet: { type: String },
    webhookUrl: { type: String },
    webhookSecret: { type: String },
    logoUrl: { type: String },
    returnUrl: { type: String },
    theme: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "system",
    },
    brandColor: { type: String, default: "#ffffff" },
    brandingEnabled: { type: Boolean, default: true },
    removeBranding: { type: Boolean, default: false },
    brandingAlignment: {
      type: String,
      enum: ["left", "center"],
      default: "left",
    },
    enabledCurrencies: { type: [String], default: [] },
    webhookEvents: {
      type: [String],
      default: [
        "invoice.confirmed",
        "invoice.mempool_detected",
        "invoice.partially_paid",
        "invoice.overpaid",
        "invoice.expired",
        "invoice.failed",
      ],
    },
    derivationIndex: { type: Number, default: 0 },
    confirmationPolicy: {
      type: {
        BTC: { type: Number, default: 2 },
        LTC: { type: Number, default: 6 },
        ETH: { type: Number, default: 12 },
      },
      default: { BTC: 2, LTC: 6, ETH: 12 },
    },
    feesAccrued: {
      usd: { type: Number, default: 0 },
      BTC: { type: Number, default: 0 },
      LTC: { type: Number, default: 0 },
      ETH: { type: Number, default: 0 },
      USDT_ERC20: { type: Number, default: 0 },
      USDT_POLYGON: { type: Number, default: 0 },
    },
    feeResponsibility: {
      type: String,
      enum: ["merchant", "client"],
      default: "merchant",
    },
    invoiceExpirationMinutes: { type: Number, default: 30 },
    underpaymentTolerancePercentage: { type: Number, default: 1 },
    bip21Enabled: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// apiKeyHash index is auto-created by unique: true

export const Merchant = mongoose.model<IMerchant>("Merchant", MerchantSchema);
