import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

import { DomainController } from "../controllers/domain.controller.js";

export async function domainRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.get(
    "/v1/internal/domain/:domain",
    {
      schema: {
        params: z.object({
          domain: z.string().min(1).max(100),
        }),
      },
    },
    DomainController.resolveDomain,
  );
}
