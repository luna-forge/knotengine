import { FastifyRequest, FastifyReply } from "fastify";
import {
  Merchant,
  Organization,
  Membership,
  ApiKey,
  User,
} from "@qodinger/knot-database";
import * as crypto from "crypto";

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function resolveOrganizationContext(merchant: any) {
  if (!merchant.organizationId) {
    return null;
  }

  const organization = await Organization.findOne({
    _id: merchant.organizationId,
    deletedAt: { $exists: false },
  });

  if (!organization) {
    return null;
  }

  const membership = await Membership.findOne({
    organizationId: organization._id,
    userId: merchant.userId,
  });

  return {
    organization,
    membershipRole: membership?.role || "member",
  };
}

async function findOrgByApiKey(apiKeyHash: string) {
  const apiKey = await ApiKey.findOne({
    hash: apiKeyHash,
    revokedAt: { $exists: false },
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } },
    ],
  }).populate("organizationId");

  if (!apiKey) return null;

  const org = apiKey.organizationId as any;
  if (!org || org.deletedAt) return null;

  return { organization: org, apiKey };
}

export const requireAuth = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const apiKey = request.headers["x-api-key"] as string;
  if (apiKey) {
    const apiKeyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

    const merchant = await Merchant.findOne({ apiKeyHash, isActive: true });
    if (merchant) {
      request.merchant = merchant;
      const orgContext = await resolveOrganizationContext(merchant);
      if (orgContext) {
        request.organization = orgContext.organization;
        request.membershipRole = orgContext.membershipRole;
      }
      return;
    }

    const orgResult = await findOrgByApiKey(apiKeyHash);
    if (orgResult) {
      request.organization = orgResult.organization;
      request.membershipRole = "admin";
      return;
    }

    return reply.code(401).send({ error: "Invalid API Key" });
  }

  const oauthId = request.headers["x-oauth-id"] as string;
  const merchantId = request.headers["x-merchant-id"] as string;
  const secret = request.headers["x-internal-secret"] as string;

  if (oauthId && secret?.trim() === process.env.INTERNAL_SECRET?.trim()) {
    const query: Record<string, unknown> = {
      oauthId: { $regex: new RegExp(`^${escapeRegExp(oauthId)}(:|$)`) },
      isActive: true,
    };
    if (merchantId) {
      if (merchantId.startsWith("mid_")) {
        query.merchantId = merchantId;
      } else {
        query._id = merchantId;
      }
    }

    const merchant = await Merchant.findOne(query);
    if (merchant) {
      request.merchant = merchant;

      const params = request.params as Record<string, string> | undefined;
      const orgIdParam = params?.id;
      const isOrgEndpoint = request.url.startsWith("/v1/organizations/");

      if (isOrgEndpoint && orgIdParam) {
        const targetOrg = await Organization.findOne({
          organizationId: orgIdParam,
          deletedAt: { $exists: false },
        });

        if (targetOrg) {
          const membership = await Membership.findOne({
            userId: merchant.userId,
            organizationId: targetOrg._id,
          });

          if (membership) {
            request.organization = targetOrg;
            request.membershipRole = membership.role;
            return;
          }
        }
      }

      const activeOrgId = request.headers["x-active-org-id"] as string;
      if (activeOrgId) {
        const activeOrg = await Organization.findOne({
          organizationId: activeOrgId,
          deletedAt: { $exists: false },
        });

        if (activeOrg) {
          const membership = await Membership.findOne({
            userId: merchant.userId,
            organizationId: activeOrg._id,
          });

          if (membership) {
            request.organization = activeOrg;
            request.membershipRole = membership.role;
            return;
          }
        }
      }

      const orgContext = await resolveOrganizationContext(merchant);
      if (orgContext) {
        request.organization = orgContext.organization;
        request.membershipRole = orgContext.membershipRole;
      }
      return;
    }

    let user = await User.findOne({
      oauthId: { $regex: new RegExp(`^${escapeRegExp(oauthId)}(:|$)`) },
    });

    if (!user) {
      const email = oauthId.startsWith("email:") ? oauthId.slice(6) : undefined;
      user = await User.create({
        oauthId,
        email,
        emailVerified: !!email,
        creditBalance: parseFloat(process.env.WELCOME_CREDIT_AMOUNT || "5.00"),
        welcomeBonusClaimed: true,
        referralCode:
          "REF_" + crypto.randomBytes(4).toString("hex").toUpperCase(),
      });
    }

    (request as any).userId = user._id.toString();

    const params = request.params as Record<string, string> | undefined;
    const orgIdParam = params?.id;
    if (orgIdParam) {
      const org = await Organization.findOne({
        organizationId: orgIdParam,
        deletedAt: { $exists: false },
      });

      if (org) {
        const membership = await Membership.findOne({
          userId: user._id,
          organizationId: org._id,
        });

        if (membership) {
          request.organization = org;
          request.membershipRole = membership.role;
        }
      }
    }

    return;
  }

  return reply.code(401).send({ error: "Unauthorized" });
};
