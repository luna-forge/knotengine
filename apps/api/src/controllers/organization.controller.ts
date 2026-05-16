import { FastifyReply, FastifyRequest } from "fastify";
import {
  Organization,
  Membership,
  User,
  ApiKey,
  IOrganization,
} from "@qodinger/knot-database";
import { SubscriptionBilling } from "../core/subscription-billing.js";
import * as crypto from "crypto";
import { isValidHttpUrl } from "../utils/crypto.js";

async function ensureUserHasOrganization(
  userId: string,
): Promise<IOrganization> {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  if (user.organizationId) {
    const existingOrg = await Organization.findById(user.organizationId);
    if (existingOrg && !existingOrg.deletedAt) {
      return existingOrg;
    }
  }

  const org = await Organization.create({
    organizationId: `org_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    name: user.email || "My Organization",
    createdBy: userId,
    plan: "starter",
    maxSeats: 1,
  });

  await Membership.create({
    organizationId: org._id,
    userId,
    role: "owner",
    invitedAt: new Date(),
    acceptedAt: new Date(),
  });

  await User.findByIdAndUpdate(userId, { $set: { organizationId: org._id } });

  return org;
}

export class OrganizationController {
  static async listOrganizations(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).userId;
    if (!userId) return reply.code(401).send({ error: "Unauthorized" });

    const memberships = await Membership.find({ userId }).populate(
      "organizationId",
    );

    const orgs = memberships.map((m) => ({
      ...(m.organizationId as any).toObject(),
      role: m.role,
      acceptedAt: m.acceptedAt,
    }));

    return reply.send({ organizations: orgs });
  }

  static async createOrganization(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const userId = (request as any).userId;
    if (!userId) return reply.code(401).send({ error: "Unauthorized" });

    const body = request.body as { name: string; slug?: string };

    const org = await Organization.create({
      organizationId: `org_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: body.name,
      slug: body.slug?.toLowerCase().trim(),
      createdBy: userId,
      plan: "starter",
      maxSeats: 1,
    });

    await Membership.create({
      organizationId: org._id,
      userId,
      role: "owner",
      invitedAt: new Date(),
      acceptedAt: new Date(),
    });

    await User.findByIdAndUpdate(userId, { $set: { organizationId: org._id } });

    return reply.code(201).send({ organization: org });
  }

  static async getOrganization(request: FastifyRequest, reply: FastifyReply) {
    const orgId = (request.params as { id: string }).id;

    const org = await Organization.findOne({
      organizationId: orgId,
      deletedAt: { $exists: false },
    });

    if (!org) return reply.code(404).send({ error: "Organization not found" });

    const merchant = (request as any).merchant;
    const userId = (request as any).userId;

    if (
      merchant?.organizationId &&
      String(merchant.organizationId) !== String(org._id)
    ) {
      return reply
        .code(403)
        .send({ error: "Forbidden: no access to this organization" });
    }

    if (userId) {
      const membership = await Membership.findOne({
        userId,
        organizationId: org._id,
      });
      if (!membership) {
        return reply
          .code(403)
          .send({ error: "Forbidden: no access to this organization" });
      }
    }

    return reply.send({ organization: org });
  }

  static async updateOrganization(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const orgId = (request.params as { id: string }).id;
    const body = request.body as Partial<{
      name: string;
      slug: string;
      logoUrl: string;
      brandColor: string;
      customDomain: string;
      settings: { defaultCurrency: string; timezone: string; locale: string };
      metadata: Record<string, string>;
    }>;

    const org = await Organization.findOneAndUpdate(
      { organizationId: orgId, deletedAt: { $exists: false } },
      { $set: body },
      { new: true },
    );

    if (!org) return reply.code(404).send({ error: "Organization not found" });

    return reply.send({ organization: org });
  }

  static async deleteOrganization(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const orgId = (request.params as { id: string }).id;

    const org = await Organization.findOneAndUpdate(
      { organizationId: orgId, deletedAt: { $exists: false } },
      { $set: { deletedAt: new Date() } },
      { new: true },
    );

    if (!org) return reply.code(404).send({ error: "Organization not found" });

    return reply.send({ message: "Organization deleted" });
  }

  static async listMembers(request: FastifyRequest, reply: FastifyReply) {
    const orgId = (request.params as { id: string }).id;

    const org = await Organization.findOne({
      organizationId: orgId,
      deletedAt: { $exists: false },
    });
    if (!org) return reply.code(404).send({ error: "Organization not found" });

    const memberships = await Membership.find({
      organizationId: org._id,
    }).populate("userId", "email oauthId");

    const members = memberships.map((m) => ({
      id: m._id,
      user: m.userId,
      role: m.role,
      invitedAt: m.invitedAt,
      acceptedAt: m.acceptedAt,
    }));

    return reply.send({ members });
  }

  static async inviteMember(request: FastifyRequest, reply: FastifyReply) {
    const orgId = (request.params as { id: string }).id;
    const userId = (request as any).userId;
    const body = request.body as { email: string; role: string };

    const org = await Organization.findOne({
      organizationId: orgId,
      deletedAt: { $exists: false },
    });
    if (!org) return reply.code(404).send({ error: "Organization not found" });

    const existing = await Membership.findOne({
      organizationId: org._id,
      userId,
      role: "owner",
    });
    if (!existing) return reply.code(403).send({ error: "Not authorized" });

    const targetUser = await User.findOne({ email: body.email });
    if (!targetUser) {
      return reply.code(404).send({ error: "User not found" });
    }

    const existingMembership = await Membership.findOne({
      organizationId: org._id,
      userId: targetUser._id,
    });
    if (existingMembership) {
      return reply.code(409).send({ error: "User is already a member" });
    }

    const inviteToken = crypto.randomBytes(32).toString("hex");
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const membership = await Membership.create({
      organizationId: org._id,
      userId: targetUser._id,
      role: body.role,
      invitedAt: new Date(),
      inviteToken,
      inviteExpiresAt,
      invitedBy: userId,
    });

    return reply.code(201).send({
      membership,
      inviteUrl: `${process.env.DASHBOARD_URL || "http://localhost:5052"}/invite?token=${inviteToken}`,
    });
  }

  static async updateMemberRole(request: FastifyRequest, reply: FastifyReply) {
    const orgId = (request.params as { id: string }).id;
    const memberId = (request.params as { memberId: string }).memberId;
    const body = request.body as { role: string };

    const membership = await Membership.findOneAndUpdate(
      { _id: memberId, organizationId: { $in: [orgId] } },
      { $set: { role: body.role } },
      { new: true },
    );

    if (!membership)
      return reply.code(404).send({ error: "Membership not found" });

    return reply.send({ membership });
  }

  static async removeMember(request: FastifyRequest, reply: FastifyReply) {
    const orgId = (request.params as { id: string }).id;
    const memberId = (request.params as { memberId: string }).memberId;

    const membership = await Membership.findOne({
      _id: memberId,
      organizationId: { $in: [orgId] },
    });

    if (!membership)
      return reply.code(404).send({ error: "Membership not found" });

    if (membership.role === "owner") {
      return reply
        .code(400)
        .send({ error: "Cannot remove organization owner" });
    }

    await Membership.deleteOne({ _id: membership._id });

    return reply.send({ message: "Member removed" });
  }

  static async acceptInvitation(request: FastifyRequest, reply: FastifyReply) {
    const orgId = (request.params as { id: string }).id;
    const userId = (request as any).userId;
    const body = request.body as { inviteToken: string };

    const org = await Organization.findOne({
      organizationId: orgId,
      deletedAt: { $exists: false },
    });
    if (!org) return reply.code(404).send({ error: "Organization not found" });

    const membership = await Membership.findOne({
      organizationId: org._id,
      userId,
      inviteToken: body.inviteToken,
    });

    if (!membership)
      return reply.code(404).send({ error: "Invalid invitation" });

    if (membership.inviteExpiresAt && new Date() > membership.inviteExpiresAt) {
      return reply.code(410).send({ error: "Invitation expired" });
    }

    membership.acceptedAt = new Date();
    membership.inviteToken = undefined;
    await membership.save();

    return reply.send({ message: "Invitation accepted", membership });
  }

  static async listApiKeys(request: FastifyRequest, reply: FastifyReply) {
    const orgId = (request.params as { id: string }).id;

    const org = await Organization.findOne({
      organizationId: orgId,
      deletedAt: { $exists: false },
    });
    if (!org) return reply.code(404).send({ error: "Organization not found" });

    const keys = await ApiKey.find({
      organizationId: org._id,
      revokedAt: { $exists: false },
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } },
      ],
    }).select("id label permissions createdAt expiresAt");

    return reply.send({ keys });
  }

  static async createApiKey(request: FastifyRequest, reply: FastifyReply) {
    const orgId = (request.params as { id: string }).id;
    const userId = (request as any).userId;
    const body = request.body as {
      label: string;
      permissions: string[];
      expiresAt?: string;
    };

    const org = await Organization.findOne({
      organizationId: orgId,
      deletedAt: { $exists: false },
    });
    if (!org) return reply.code(404).send({ error: "Organization not found" });

    const rawKey = `org_${crypto.randomBytes(24).toString("hex")}`;
    const hash = crypto.createHash("sha256").update(rawKey).digest("hex");

    const newKey = await ApiKey.create({
      organizationId: org._id,
      label: body.label,
      hash,
      permissions: body.permissions,
      createdBy: userId,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });

    return reply.code(201).send({
      key: rawKey,
      id: newKey.id,
      message: "Save this key now. It will not be shown again.",
    });
  }

  static async revokeApiKey(request: FastifyRequest, reply: FastifyReply) {
    const orgId = (request.params as { id: string }).id;
    const keyId = (request.params as { keyId: string }).keyId;

    const org = await Organization.findOne({
      organizationId: orgId,
      deletedAt: { $exists: false },
    });
    if (!org) return reply.code(404).send({ error: "Organization not found" });

    const apiKey = await ApiKey.findOne({
      _id: keyId,
      organizationId: org._id,
    });

    if (!apiKey) return reply.code(404).send({ error: "API key not found" });

    apiKey.revokedAt = new Date();
    await apiKey.save();

    return reply.send({ message: "API key revoked" });
  }

  static async getBillingStatus(request: FastifyRequest, reply: FastifyReply) {
    const orgId = (request.params as { id: string }).id;

    const org = await Organization.findOne({
      organizationId: orgId,
      deletedAt: { $exists: false },
    });

    if (!org) {
      return reply.code(404).send({ error: "Organization not found" });
    }

    const status = await SubscriptionBilling.getInstance().getOrgBillingStatus(
      org._id.toString(),
    );

    return reply.send(status);
  }

  static async updatePlan(request: FastifyRequest, reply: FastifyReply) {
    const orgId = (request.params as { id: string }).id;
    const body = request.body as { plan: string };

    const org = await Organization.findOne({
      organizationId: orgId,
      deletedAt: { $exists: false },
    });
    if (!org) return reply.code(404).send({ error: "Organization not found" });

    const planCosts = { starter: 0, professional: 39, enterprise: 149 };
    const cost = planCosts[body.plan as keyof typeof planCosts];

    if (body.plan !== "starter" && org.creditBalance < cost) {
      return reply.code(402).send({
        error: "Insufficient balance",
        required: cost,
        available: org.creditBalance,
      });
    }

    if (body.plan !== "starter") {
      await Organization.findByIdAndUpdate(org._id, {
        $inc: { creditBalance: -cost },
        $set: { plan: body.plan, planStartedAt: new Date() },
      });
    } else {
      await Organization.findByIdAndUpdate(org._id, {
        $set: { plan: body.plan, planStartedAt: new Date() },
      });
    }

    return reply.send({ message: "Plan updated", plan: body.plan });
  }

  static async generateDomainToken(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const orgId = (request.params as { id: string }).id;

    const org = await Organization.findOne({
      organizationId: orgId,
      deletedAt: { $exists: false },
    });
    if (!org) return reply.code(404).send({ error: "Organization not found" });
    if (!org.customDomain)
      return reply.code(400).send({ error: "No custom domain configured" });

    const token = `knotengine-verification=${crypto.randomBytes(16).toString("hex")}`;
    org.customDomainToken = token;
    org.customDomainVerified = false;
    await org.save();

    return reply.send({
      token,
      instructions: `Create a file at https://${org.customDomain}/.well-known/knotengine-verification.txt with the exact content: ${token}`,
    });
  }

  static async verifyDomain(request: FastifyRequest, reply: FastifyReply) {
    const orgId = (request.params as { id: string }).id;

    const org = await Organization.findOne({
      organizationId: orgId,
      deletedAt: { $exists: false },
    });
    if (!org) return reply.code(404).send({ error: "Organization not found" });
    if (!org.customDomain)
      return reply.code(400).send({ error: "No custom domain configured" });

    const domain = org.customDomain;
    const expectedToken = org.customDomainToken;

    if (!expectedToken) {
      return reply.code(400).send({
        error: "No verification token generated. Please generate one first.",
      });
    }

    try {
      const verificationUrl = `https://${domain}/.well-known/knotengine-verification.txt`;

      if (!isValidHttpUrl(verificationUrl)) {
        return reply.code(400).send({ error: "Invalid domain format" });
      }

      const hostname = new URL(verificationUrl).hostname;
      const blockedPatterns = [
        /^localhost$/i,
        /^127\./,
        /^10\./,
        /^192\.168\./,
        /^172\.(1[6-9]|2\d|3[01])\./,
        /^::1$/,
        /^fe80:/,
        /^fc00:/,
        /internal/i,
        /metadata/i,
      ];

      if (blockedPatterns.some((pattern) => pattern.test(hostname))) {
        return reply.code(400).send({
          error: "Domain verification not allowed for internal addresses",
        });
      }

      const res = await fetch(verificationUrl, {
        signal: AbortSignal.timeout(10000),
        redirect: "error",
      });

      if (!res.ok) {
        return reply.send({
          verified: false,
          message: "Verification file not found at expected URL",
        });
      }

      const body = await res.text();
      const trimmedBody = body.trim();
      const trimmedToken = expectedToken.trim();

      if (trimmedBody === trimmedToken) {
        org.customDomainVerified = true;
        await org.save();
        return reply.send({
          verified: true,
          message: "Domain verified successfully",
        });
      } else {
        return reply.send({
          verified: false,
          message:
            "Token mismatch. Please ensure the verification file contains the exact token.",
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.send({
        verified: false,
        message: `Failed to reach domain: ${message}`,
      });
    }
  }

  static async ensureUserHasOrganization(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const userId = (request as any).userId;
    if (!userId) return reply.code(401).send({ error: "Unauthorized" });

    const org = await ensureUserHasOrganization(userId);

    return reply.send({ organization: org });
  }
}
