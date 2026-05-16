import { FastifyRequest, FastifyReply } from "fastify";
import { Organization, Membership } from "@qodinger/knot-database";

const ROLE_HIERARCHY: Record<string, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

export const requireRole = (minimumRole: string) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const membershipRole = (request as any).membershipRole;
    if (!membershipRole) {
      return reply
        .code(403)
        .send({ error: "Forbidden: no organization context" });
    }

    if (ROLE_HIERARCHY[membershipRole] < ROLE_HIERARCHY[minimumRole]) {
      return reply.code(403).send({
        error: `Forbidden: ${minimumRole} role required`,
      });
    }
  };
};

export const requireAdmin = requireRole("admin");
export const requireOwner = requireRole("owner");

export const requireCrossOrgAccess = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const targetOrgId = (request.params as { id?: string })?.id;
  if (!targetOrgId) return;

  const currentOrg = (request as any).organization;
  if (!currentOrg) return;

  const targetOrg = await Organization.findOne({
    organizationId: targetOrgId,
    deletedAt: { $exists: false },
  });

  if (targetOrg && String(targetOrg._id) !== String(currentOrg._id)) {
    const userId = (request as any).userId;
    if (!userId) {
      return reply
        .code(403)
        .send({ error: "Forbidden: cross-org access denied" });
    }

    const membership = await Membership.findOne({
      userId,
      organizationId: targetOrg._id,
    });

    if (!membership) {
      return reply
        .code(403)
        .send({ error: "Forbidden: cross-org access denied" });
    }

    (request as any).organization = targetOrg;
    (request as any).membershipRole = membership.role;
  }
};
