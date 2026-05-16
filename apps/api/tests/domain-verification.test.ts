import { describe, it, expect, beforeEach, vi } from "vitest";
import { OrganizationController } from "../src/controllers/organization.controller.js";

const mockOrg = {
  _id: "507f191e810c19729de860ea",
  organizationId: "org_test123",
  name: "Test Org",
  customDomain: "pay.testbrand.com",
  customDomainVerified: false,
  customDomainToken: null,
  deletedAt: null,
  save: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@qodinger/knot-database", () => ({
  Organization: {
    findOne: vi.fn(),
  },
}));

describe("OrganizationController - Domain Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrg.customDomainToken = null;
    mockOrg.customDomainVerified = false;
  });

  describe("generateDomainToken", () => {
    it("should generate a verification token for a valid org with domain", async () => {
      const { Organization } = await import("@qodinger/knot-database");
      (Organization.findOne as any).mockResolvedValue(mockOrg);

      const mockRequest = {
        params: { id: "org_test123" },
      } as any;

      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as any;

      await OrganizationController.generateDomainToken(mockRequest, mockReply);

      expect(mockOrg.customDomainToken).toContain("knotengine-verification=");
      expect(mockOrg.customDomainVerified).toBe(false);
      expect(mockOrg.save).toHaveBeenCalled();

      const sentData = mockReply.send.mock.calls[0][0];
      expect(sentData.token).toContain("knotengine-verification=");
      expect(sentData.instructions).toContain("pay.testbrand.com");
    });

    it("should return 404 for non-existent organization", async () => {
      const { Organization } = await import("@qodinger/knot-database");
      (Organization.findOne as any).mockResolvedValue(null);

      const mockRequest = {
        params: { id: "org_nonexistent" },
      } as any;

      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as any;

      await OrganizationController.generateDomainToken(mockRequest, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: "Organization not found",
      });
    });

    it("should return 400 if no custom domain configured", async () => {
      const { Organization } = await import("@qodinger/knot-database");
      const orgWithoutDomain = { ...mockOrg, customDomain: undefined };
      (Organization.findOne as any).mockResolvedValue(orgWithoutDomain);

      const mockRequest = {
        params: { id: "org_test123" },
      } as any;

      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as any;

      await OrganizationController.generateDomainToken(mockRequest, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: "No custom domain configured",
      });
    });
  });

  describe("verifyDomain", () => {
    it("should verify domain when token matches", async () => {
      const token = "knotengine-verification=abc123";
      const orgWithToken = {
        ...mockOrg,
        customDomainToken: token,
        save: vi.fn().mockResolvedValue(undefined),
      };

      const { Organization } = await import("@qodinger/knot-database");
      (Organization.findOne as any).mockResolvedValue(orgWithToken);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(token),
      });

      const mockRequest = {
        params: { id: "org_test123" },
      } as any;

      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as any;

      await OrganizationController.verifyDomain(mockRequest, mockReply);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://pay.testbrand.com/.well-known/knotengine-verification.txt",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );

      expect(orgWithToken.customDomainVerified).toBe(true);
      expect(orgWithToken.save).toHaveBeenCalled();
      expect(mockReply.send).toHaveBeenCalledWith({
        verified: true,
        message: "Domain verified successfully",
      });
    });

    it("should fail verification when token does not match", async () => {
      const token = "knotengine-verification=abc123";
      const orgWithToken = {
        ...mockOrg,
        customDomainToken: token,
        save: vi.fn().mockResolvedValue(undefined),
      };

      const { Organization } = await import("@qodinger/knot-database");
      (Organization.findOne as any).mockResolvedValue(orgWithToken);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue("wrong-token"),
      });

      const mockRequest = {
        params: { id: "org_test123" },
      } as any;

      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as any;

      await OrganizationController.verifyDomain(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith({
        verified: false,
        message:
          "Token mismatch. Please ensure the verification file contains the exact token.",
      });
    });

    it("should fail when verification file is not found", async () => {
      const token = "knotengine-verification=abc123";
      const orgWithToken = {
        ...mockOrg,
        customDomainToken: token,
        save: vi.fn().mockResolvedValue(undefined),
      };

      const { Organization } = await import("@qodinger/knot-database");
      (Organization.findOne as any).mockResolvedValue(orgWithToken);

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
      });

      const mockRequest = {
        params: { id: "org_test123" },
      } as any;

      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as any;

      await OrganizationController.verifyDomain(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith({
        verified: false,
        message: "Verification file not found at expected URL",
      });
    });

    it("should return 400 if no verification token generated", async () => {
      const orgWithoutToken = {
        ...mockOrg,
        customDomainToken: null,
      };

      const { Organization } = await import("@qodinger/knot-database");
      (Organization.findOne as any).mockResolvedValue(orgWithoutToken);

      const mockRequest = {
        params: { id: "org_test123" },
      } as any;

      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as any;

      await OrganizationController.verifyDomain(mockRequest, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: "No verification token generated. Please generate one first.",
      });
    });

    it("should handle network errors gracefully", async () => {
      const token = "knotengine-verification=abc123";
      const orgWithToken = {
        ...mockOrg,
        customDomainToken: token,
        save: vi.fn().mockResolvedValue(undefined),
      };

      const { Organization } = await import("@qodinger/knot-database");
      (Organization.findOne as any).mockResolvedValue(orgWithToken);

      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const mockRequest = {
        params: { id: "org_test123" },
      } as any;

      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as any;

      await OrganizationController.verifyDomain(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith({
        verified: false,
        message: expect.stringContaining("Network error"),
      });
    });
  });
});
