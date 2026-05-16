import mongoose, { Schema, Document } from "mongoose";

export interface IApiKey extends Document {
  organizationId: mongoose.Types.ObjectId;
  label: string;
  hash: string;
  permissions: string[];
  createdBy: mongoose.Types.ObjectId;
  expiresAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema: Schema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    label: { type: String, required: true },
    hash: { type: String, required: true },
    permissions: { type: [String], default: ["read", "write"] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    expiresAt: { type: Date },
    revokedAt: { type: Date },
  },
  { timestamps: true },
);

ApiKeySchema.index({ organizationId: 1, revokedAt: 1 });
ApiKeySchema.index({ hash: 1 }, { unique: true });

export const ApiKey = mongoose.model<IApiKey>("ApiKey", ApiKeySchema);
