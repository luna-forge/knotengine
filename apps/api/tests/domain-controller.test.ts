import { describe, it, expect, beforeEach, vi } from "vitest";
import { DomainController } from "../src/controllers/domain.controller.js";

const mockOrganization = {
  _id: "507f191e810c19729de860ea",
  organizationId: "org_test123",
  name: "Test Org",
  brandColor: "#ffffff",
  customDomain: "pay.testbrand.com",
  customDomainVerified: true,
  deletedAt: null,
};

vi.mock("@qodinger/knot-database", () => ({
  Organization: {
    findOne: vi.fn(),
  },
}));

describe("DomainController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should resolve a verified custom domain to organization", async () => {
    const { Organization } = await import("@qodinger/knot-database");
    (Organization.findOne as any).mockReturnValue({
      select: vi.fn().mockResolvedValue(mockOrganization),
    });

    const mockRequest = {
      params: { domain: "pay.testbrand.com" },
    } as any;

    const mockReply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn(),
    } as any;

    await DomainController.resolveDomain(mockRequest, mockReply);

    expect(Organization.findOne).toHaveBeenCalledWith({
      customDomain: "pay.testbrand.com",
      customDomainVerified: true,
      deletedAt: { $exists: false },
    });

    expect(mockReply.send).toHaveBeenCalledWith({
      organizationId: "org_test123",
      name: "Test Org",
      brandColor: "#ffffff",
      customDomain: "pay.testbrand.com",
      verified: true,
    });
  });

  it("should return 404 for unverified domain", async () => {
    const { Organization } = await import("@qodinger/knot-database");
    (Organization.findOne as any).mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    });

    const mockRequest = {
      params: { domain: "pay.unverified.com" },
    } as any;

    const mockReply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn(),
    } as any;

    await DomainController.resolveDomain(mockRequest, mockReply);

    expect(mockReply.code).toHaveBeenCalledWith(404);
    expect(mockReply.send).toHaveBeenCalledWith({
      error: "Domain not found or not verified",
    });
  });

  it("should return 404 for non-existent domain", async () => {
    const { Organization } = await import("@qodinger/knot-database");
    (Organization.findOne as any).mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    });

    const mockRequest = {
      params: { domain: "nonexistent.com" },
    } as any;

    const mockReply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn(),
    } as any;

    await DomainController.resolveDomain(mockRequest, mockReply);

    expect(mockReply.code).toHaveBeenCalledWith(404);
  });
});
