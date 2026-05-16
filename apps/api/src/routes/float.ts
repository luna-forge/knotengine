import { FastifyInstance } from "fastify";
import { z } from "zod";
import { FloatController } from "../controllers/float.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/rbac.middleware.js";

export async function floatRoutes(server: FastifyInstance) {
  server.get(
    "/v1/float/stats",
    {
      preHandler: [requireAuth, requireAdmin],
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              totalBalance: { type: "number" },
              investedAmount: { type: "number" },
              availableAmount: { type: "number" },
              estimatedYield: { type: "number" },
              yieldAPY: { type: "number" },
            },
          },
        },
      },
    },
    FloatController.getStats,
  );

  server.post(
    "/v1/float/invest",
    {
      preHandler: [requireAuth, requireAdmin],
      schema: {
        body: z.object({
          amount: z.number().positive().optional(),
        }),
        response: {
          200: {
            type: "object",
            properties: {
              invested: { type: "number" },
              success: { type: "boolean" },
              error: { type: "string" },
            },
          },
        },
      },
    },
    FloatController.investFloat,
  );

  server.get(
    "/v1/float/health",
    {
      preHandler: [requireAuth, requireAdmin],
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              healthScore: { type: "number" },
              riskLevel: { type: "string", enum: ["low", "medium", "high"] },
              recommendations: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
    },
    FloatController.getHealth,
  );

  server.post(
    "/v1/float/emergency-withdraw",
    {
      preHandler: [requireAuth, requireAdmin],
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              withdrawn: { type: "number" },
              success: { type: "boolean" },
              error: { type: "string" },
            },
          },
        },
      },
    },
    FloatController.emergencyWithdraw,
  );
}
