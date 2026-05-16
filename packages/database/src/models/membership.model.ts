import mongoose, { Schema, Document } from "mongoose";

export interface IMembership extends Document {
  organizationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: "owner" | "admin" | "member" | "viewer";
  invitedAt: Date;
  acceptedAt?: Date;
  inviteToken?: string;
  inviteExpiresAt?: Date;
  invitedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MembershipSchema: Schema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: ["owner", "admin", "member", "viewer"],
      default: "member",
    },
    invitedAt: { type: Date, required: true },
    acceptedAt: { type: Date },
    inviteToken: { type: String },
    inviteExpiresAt: { type: Date },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

MembershipSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
MembershipSchema.index({ userId: 1 });
MembershipSchema.index({ inviteToken: 1 }, { sparse: true });

export const Membership = mongoose.model<IMembership>(
  "Membership",
  MembershipSchema,
);
