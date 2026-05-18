import { describe, it, expect } from "vitest";
import { Merchant, mongoose } from "@qodinger/knot-database";

describe("Merchant Model", () => {
  describe("Schema Validation", () => {
    it("should create a valid merchant with required fields", () => {
      const merchant = new Merchant({
        merchantId: "mid_test123",
        name: "Test Merchant",
      });

      expect(merchant.merchantId).toBe("mid_test123");
      expect(merchant.name).toBe("Test Merchant");
      expect(merchant.plan).toBe("starter");
      expect(merchant.isActive).toBe(true);
      expect(merchant.theme).toBe("system");
    });

    it("should default name to empty string", () => {
      const merchant = new Merchant({
        merchantId: "mid_test456",
      });

      expect(merchant.name).toBe("");
    });

    it("should accept all valid plan values", () => {
      const plans = ["starter", "professional", "enterprise"] as const;

      plans.forEach((plan) => {
        const merchant = new Merchant({
          merchantId: `mid_${plan}`,
          name: `${plan} merchant`,
          plan,
        });
        expect(merchant.plan).toBe(plan);
      });
    });

    it("should default to starter plan", () => {
      const merchant = new Merchant({
        merchantId: "mid_default",
        name: "Default Plan",
      });

      expect(merchant.plan).toBe("starter");
    });
  });

  describe("Payment Configuration", () => {
    it("should default fee responsibility to merchant", () => {
      const merchant = new Merchant({
        merchantId: "mid_fees",
        name: "Fee Test",
      });

      expect(merchant.feeResponsibility).toBe("merchant");
    });

    it("should allow client fee responsibility", () => {
      const merchant = new Merchant({
        merchantId: "mid_fees2",
        name: "Client Fees",
        feeResponsibility: "client",
      });

      expect(merchant.feeResponsibility).toBe("client");
    });

    it("should default invoice expiration to 30 minutes", () => {
      const merchant = new Merchant({
        merchantId: "mid_expiry",
        name: "Expiry Test",
      });

      expect(merchant.invoiceExpirationMinutes).toBe(30);
    });

    it("should default underpayment tolerance to 1%", () => {
      const merchant = new Merchant({
        merchantId: "mid_tolerance",
        name: "Tolerance Test",
      });

      expect(merchant.underpaymentTolerancePercentage).toBe(1);
    });

    it("should default BIP21 to enabled", () => {
      const merchant = new Merchant({
        merchantId: "mid_bip21",
        name: "BIP21 Test",
      });

      expect(merchant.bip21Enabled).toBe(true);
    });
  });

  describe("Confirmation Policy", () => {
    it("should have default confirmation requirements", () => {
      const merchant = new Merchant({
        merchantId: "mid_confirm",
        name: "Confirmation Test",
      });

      expect(merchant.confirmationPolicy.BTC).toBe(2);
      expect(merchant.confirmationPolicy.LTC).toBe(6);
      expect(merchant.confirmationPolicy.ETH).toBe(12);
    });
  });

  describe("Branding", () => {
    it("should default branding to enabled", () => {
      const merchant = new Merchant({
        merchantId: "mid_brand",
        name: "Branding Test",
      });

      expect(merchant.brandingEnabled).toBe(true);
    });

    it("should default removeBranding to false", () => {
      const merchant = new Merchant({
        merchantId: "mid_remove",
        name: "Remove Branding Test",
      });

      expect(merchant.removeBranding).toBe(false);
    });

    it("should default brand color to white", () => {
      const merchant = new Merchant({
        merchantId: "mid_color",
        name: "Color Test",
      });

      expect(merchant.brandColor).toBe("#ffffff");
    });

    it("should default branding alignment to left", () => {
      const merchant = new Merchant({
        merchantId: "mid_align",
        name: "Alignment Test",
      });

      expect(merchant.brandingAlignment).toBe("left");
    });

    it("should accept valid themes", () => {
      const themes = ["light", "dark", "system"] as const;

      themes.forEach((theme) => {
        const merchant = new Merchant({
          merchantId: `mid_${theme}`,
          name: `${theme} theme`,
          theme,
        });
        expect(merchant.theme).toBe(theme);
      });
    });
  });

  describe("Webhook Configuration", () => {
    it("should have default webhook events", () => {
      const merchant = new Merchant({
        merchantId: "mid_webhook",
        name: "Webhook Test",
      });

      expect(merchant.webhookEvents).toContain("invoice.confirmed");
      expect(merchant.webhookEvents).toContain("invoice.mempool_detected");
      expect(merchant.webhookEvents).toContain("invoice.partially_paid");
      expect(merchant.webhookEvents).toContain("invoice.overpaid");
      expect(merchant.webhookEvents).toContain("invoice.expired");
      expect(merchant.webhookEvents).toContain("invoice.failed");
    });
  });

  describe("Email Notifications", () => {
    it("should have all notifications enabled by default", () => {
      const merchant = new Merchant({
        merchantId: "mid_notify",
        name: "Notification Test",
      });

      expect(merchant.emailNotifications.paymentReceived).toBe(true);
      expect(merchant.emailNotifications.paymentConfirmed).toBe(true);
      expect(merchant.emailNotifications.paymentOverpaid).toBe(true);
      expect(merchant.emailNotifications.paymentExpired).toBe(true);
      expect(merchant.emailNotifications.subscriptionCharged).toBe(true);
      expect(merchant.emailNotifications.lowBalance).toBe(true);
      expect(merchant.emailNotifications.securityAlerts).toBe(true);
    });
  });

  describe("IP Allowlist", () => {
    it("should default IP allowlist to disabled", () => {
      const merchant = new Merchant({
        merchantId: "mid_ip",
        name: "IP Test",
      });

      expect(merchant.ipAllowlistEnabled).toBe(false);
    });

    it("should default allowed addresses to empty array", () => {
      const merchant = new Merchant({
        merchantId: "mid_ip2",
        name: "IP Test 2",
      });

      expect(merchant.allowedIpAddresses).toEqual([]);
    });
  });

  describe("Fees Accrued", () => {
    it("should default all fee counters to 0", () => {
      const merchant = new Merchant({
        merchantId: "mid_fees_accrued",
        name: "Fees Accrued Test",
      });

      expect(merchant.feesAccrued.usd).toBe(0);
      expect(merchant.feesAccrued.BTC).toBe(0);
      expect(merchant.feesAccrued.LTC).toBe(0);
      expect(merchant.feesAccrued.ETH).toBe(0);
      expect(merchant.feesAccrued.USDT_ERC20).toBe(0);
      expect(merchant.feesAccrued.USDT_POLYGON).toBe(0);
    });
  });

  describe("User Linking", () => {
    it("should allow linking merchant to user", () => {
      const userId = new mongoose.Types.ObjectId();

      const merchant = new Merchant({
        merchantId: "mid_user_link",
        name: "User Merchant",
        userId,
      });

      expect(merchant.userId?.toString()).toBe(userId.toString());
    });
  });
});

describe("Merchant ID Generation", () => {
  it("should use mid_ prefix", () => {
    const merchantId = "mid_abc123";

    expect(merchantId).toMatch(/^mid_/);
  });

  it("should use base58 characters", () => {
    const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

    const merchantId =
      "mid_" + Array.from({ length: 12 }, () => chars[0]).join("");

    expect(merchantId).toMatch(/^mid_[1-9A-HJ-NP-Za-km-z]+$/);
  });
});
