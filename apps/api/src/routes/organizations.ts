import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

import {
  MAX_TEXT_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_URL_LENGTH,
} from "@qodinger/knot-types";
import { OrganizationController } from "../controllers/organization.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireAdmin, requireOwner } from "../middleware/rbac.middleware.js";

export async function organizationRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.get(
    "/v1/organizations",
    { preHandler: requireAuth },
    OrganizationController.listOrganizations,
  );

  server.post(
    "/v1/organizations",
    {
      preHandler: requireAuth,
      schema: {
        body: z.object({
          name: z.string().min(1).max(MAX_TEXT_LENGTH),
          slug: z.string().min(1).max(50).optional(),
        }),
      },
    },
    OrganizationController.createOrganization,
  );

  server.get(
    "/v1/organizations/:id",
    { preHandler: requireAuth },
    OrganizationController.getOrganization,
  );

  server.patch(
    "/v1/organizations/:id",
    {
      preHandler: [requireAuth, requireAdmin],
      schema: {
        body: z.object({
          name: z.string().min(1).max(MAX_TEXT_LENGTH).optional(),
          slug: z.string().min(1).max(50).optional(),
          logoUrl: z.string().url().max(MAX_URL_LENGTH).nullable().optional(),
          brandColor: z.string().max(7).optional(),
          customDomain: z.string().max(100).nullable().optional(),
          settings: z
            .object({
              defaultCurrency: z.string().max(10).optional(),
              timezone: z.string().max(50).optional(),
              locale: z.string().max(10).optional(),
            })
            .optional(),
          metadata: z.record(z.string()).optional(),
        }),
      },
    },
    OrganizationController.updateOrganization,
  );

  server.delete(
    "/v1/organizations/:id",
    { preHandler: [requireAuth, requireOwner] },
    OrganizationController.deleteOrganization,
  );

  server.get(
    "/v1/organizations/:id/members",
    { preHandler: requireAuth },
    OrganizationController.listMembers,
  );

  server.post(
    "/v1/organizations/:id/members/invite",
    {
      preHandler: [requireAuth, requireAdmin],
      schema: {
        body: z.object({
          email: z.string().email().max(MAX_EMAIL_LENGTH),
          role: z.enum(["admin", "member", "viewer"]),
        }),
      },
    },
    OrganizationController.inviteMember,
  );

  server.post(
    "/v1/organizations/:id/members/:memberId/role",
    {
      preHandler: [requireAuth, requireOwner],
      schema: {
        body: z.object({
          role: z.enum(["admin", "member", "viewer"]),
        }),
      },
    },
    OrganizationController.updateMemberRole,
  );

  server.delete(
    "/v1/organizations/:id/members/:memberId",
    { preHandler: [requireAuth, requireAdmin] },
    OrganizationController.removeMember,
  );

  server.post(
    "/v1/organizations/:id/members/accept",
    {
      preHandler: requireAuth,
      schema: {
        body: z.object({
          inviteToken: z.string(),
        }),
      },
    },
    OrganizationController.acceptInvitation,
  );

  server.get(
    "/v1/organizations/:id/keys",
    { preHandler: [requireAuth, requireAdmin] },
    OrganizationController.listApiKeys,
  );

  server.post(
    "/v1/organizations/:id/keys",
    {
      preHandler: [requireAuth, requireAdmin],
      schema: {
        body: z.object({
          label: z.string().min(1).max(50),
          permissions: z.array(z.string()).default(["read", "write"]),
          expiresAt: z.string().datetime().optional(),
        }),
      },
    },
    OrganizationController.createApiKey,
  );

  server.delete(
    "/v1/organizations/:id/keys/:keyId",
    { preHandler: [requireAuth, requireOwner] },
    OrganizationController.revokeApiKey,
  );

  server.get(
    "/v1/organizations/:id/billing",
    { preHandler: [requireAuth, requireAdmin] },
    OrganizationController.getBillingStatus,
  );

  server.post(
    "/v1/organizations/:id/plan",
    {
      preHandler: [requireAuth, requireOwner],
      schema: {
        body: z.object({
          plan: z.enum(["starter", "professional", "enterprise"]),
        }),
      },
    },
    OrganizationController.updatePlan,
  );

  server.post(
    "/v1/organizations/:id/domain/generate-token",
    { preHandler: [requireAuth, requireAdmin] },
    OrganizationController.generateDomainToken,
  );

  server.post(
    "/v1/organizations/:id/domain/verify",
    { preHandler: [requireAuth, requireAdmin] },
    OrganizationController.verifyDomain,
  );
}
