import { FastifyReply, FastifyRequest } from "fastify";
import { FloatManager } from "../core/float-manager.js";
import { Organization } from "@qodinger/knot-database";

async function getOrgPlan(request: FastifyRequest): Promise<string> {
  const merchant = request.merchant;
  if (merchant?.organizationId) {
    const org = await Organization.findById(merchant.organizationId);
    return org?.plan || "starter";
  }

  const org = (request as any).organization;
  if (org) {
    return org.plan || "starter";
  }

  return "starter";
}

function isAuthenticated(request: FastifyRequest): boolean {
  return !!(
    request.merchant ||
    (request as any).organization ||
    (request as any).userId
  );
}

export const FloatController = {
  getStats: async (request: FastifyRequest, reply: FastifyReply) => {
    if (!isAuthenticated(request))
      return reply.code(401).send({ error: "Unauthorized" });

    const plan = await getOrgPlan(request);
    if (plan !== "enterprise") {
      return reply.code(403).send({ error: "Enterprise plan required" });
    }

    try {
      const stats = await FloatManager.getInstance().getFloatStats();
      return reply.send(stats);
    } catch (error) {
      console.error("Float stats error:", error);
      return reply.code(500).send({ error: "Failed to get float statistics" });
    }
  },

  investFloat: async (request: FastifyRequest, reply: FastifyReply) => {
    if (!isAuthenticated(request))
      return reply.code(401).send({ error: "Unauthorized" });

    const plan = await getOrgPlan(request);
    if (plan !== "enterprise") {
      return reply.code(403).send({ error: "Enterprise plan required" });
    }

    try {
      const result = await FloatManager.getInstance().investFloat();
      return reply.send(result);
    } catch (error) {
      console.error("Float investment error:", error);
      return reply.code(500).send({ error: "Failed to invest float" });
    }
  },

  getHealth: async (request: FastifyRequest, reply: FastifyReply) => {
    if (!isAuthenticated(request))
      return reply.code(401).send({ error: "Unauthorized" });

    const plan = await getOrgPlan(request);
    if (plan !== "enterprise") {
      return reply.code(403).send({ error: "Enterprise plan required" });
    }

    try {
      const health = await FloatManager.getInstance().getHealthMetrics();
      return reply.send(health);
    } catch (error) {
      console.error("Float health error:", error);
      return reply.code(500).send({ error: "Failed to get float health" });
    }
  },

  emergencyWithdraw: async (request: FastifyRequest, reply: FastifyReply) => {
    if (!isAuthenticated(request))
      return reply.code(401).send({ error: "Unauthorized" });

    const plan = await getOrgPlan(request);
    if (plan !== "enterprise") {
      return reply.code(403).send({ error: "Enterprise plan required" });
    }

    try {
      const result = await FloatManager.getInstance().emergencyWithdraw();
      return reply.send(result);
    } catch (error) {
      console.error("Emergency withdrawal error:", error);
      return reply.code(500).send({ error: "Failed to emergency withdraw" });
    }
  },
};
