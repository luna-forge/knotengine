import { FastifyReply, FastifyRequest } from "fastify";
import { Organization } from "@qodinger/knot-database";

export class DomainController {
  static async resolveDomain(request: FastifyRequest, reply: FastifyReply) {
    const domain = (request.params as { domain: string }).domain;

    const org = await Organization.findOne({
      customDomain: domain,
      customDomainVerified: true,
      deletedAt: { $exists: false },
    }).select("organizationId name brandColor customDomain");

    if (!org) {
      return reply
        .code(404)
        .send({ error: "Domain not found or not verified" });
    }

    return reply.send({
      organizationId: org.organizationId,
      name: org.name,
      brandColor: org.brandColor,
      customDomain: org.customDomain,
      verified: true,
    });
  }
}
