import { IMerchant, IOrganization } from "@qodinger/knot-database";

declare module "fastify" {
  interface FastifyRequest {
    merchant?: IMerchant;
    organization?: IOrganization;
    membershipRole?: "owner" | "admin" | "member" | "viewer";
  }
}
