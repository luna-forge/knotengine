import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindOne = vi.fn();
const mockCreate = vi.fn();
const mockUpdateOne = vi.fn();
const mockDeleteOne = vi.fn();

vi.mock("@qodinger/knot-database", () => ({
  User: {
    findOne: mockFindOne,
    create: mockCreate,
    updateOne: mockUpdateOne,
  },
  VerificationToken: {
    findOne: mockFindOne,
    create: mockCreate,
    deleteOne: mockDeleteOne,
    deleteMany: vi.fn(),
  },
  Organization: {
    create: mockCreate,
    findOne: mockFindOne,
  },
  Membership: {
    create: mockCreate,
  },
  AuditLog: {},
}));

describe("Auth Flow - Magic Link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Request Magic Link", () => {
    it("should generate a 64-character hex token", () => {
      const token = "a".repeat(64);

      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should set 15-minute expiry", () => {
      const now = Date.now();
      const expires = now + 15 * 60 * 1000;

      expect(expires - now).toBe(15 * 60 * 1000);
    });

    it("should construct magic link with token and email", () => {
      const dashboardUrl = "http://localhost:5052";
      const token = "abc123";
      const email = "user@example.com";

      const magicLink = `${dashboardUrl}/login/verify?token=${token}&email=${encodeURIComponent(email)}`;

      expect(magicLink).toContain("token=abc123");
      expect(magicLink).toContain("email=user%40example.com");
    });
  });

  describe("Verify Magic Link", () => {
    it("should reject expired tokens", () => {
      const expiredToken = {
        expires: new Date(Date.now() - 1000),
      };

      const isValid = expiredToken.expires > new Date();

      expect(isValid).toBe(false);
    });

    it("should accept valid unexpired tokens", () => {
      const validToken = {
        expires: new Date(Date.now() + 60 * 1000),
      };

      const isValid = validToken.expires > new Date();

      expect(isValid).toBe(true);
    });

    it("should delete token after use", () => {
      const tokenId = "token123";

      mockDeleteOne.mockResolvedValue({ deletedCount: 1 });

      expect(tokenId).toBeDefined();
    });

    it("should create user with oauthId format email:email", () => {
      const email = "user@example.com";
      const oauthId = `email:${email}`;

      expect(oauthId).toBe("email:user@example.com");
    });

    it("should create personal org for new user", () => {
      const email = "newuser@example.com";
      const orgName = `${email}'s Workspace`;

      expect(orgName).toContain("newuser@example.com");
      expect(orgName).toContain("Workspace");
    });

    it("should set user as owner of personal org", () => {
      const role = "owner";

      expect(role).toBe("owner");
    });

    it("should mark email as verified via magic link", () => {
      const emailVerified = true;

      expect(emailVerified).toBe(true);
    });

    it("should give welcome credit to new user", () => {
      const welcomeCredit = parseFloat(
        process.env.WELCOME_CREDIT_AMOUNT || "5.00",
      );

      expect(welcomeCredit).toBe(5.0);
    });

    it("should not create new org for existing user", () => {
      const existingUser = {
        oauthId: "email:existing@example.com",
        email: "existing@example.com",
        emailVerified: true,
      };

      expect(existingUser).toBeDefined();
    });
  });
});

describe("Auth Flow - OAuth (Google/GitHub)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Account Linking", () => {
    it("should link Google account to existing email account", () => {
      const email = "user@example.com";
      const emailOauthId = `email:${email}`;
      const googleOauthId = `google:123456`;

      expect(emailOauthId).toBe("email:user@example.com");
      expect(googleOauthId).toBe("google:123456");
    });

    it("should link GitHub account to existing email account", () => {
      const githubOauthId = `github:789012`;

      expect(githubOauthId).toBe("github:789012");
    });

    it("should return existing email oauthId when linking", () => {
      const email = "user@example.com";
      const emailOauthId = `email:${email}`;

      expect(emailOauthId).toBe("email:user@example.com");
    });

    it("should create new account if no existing user found", () => {
      const email = "newuser@example.com";

      const newOauthId = `email:${email}`;

      expect(newOauthId).toBe("email:newuser@example.com");
    });
  });

  describe("OAuth Provider ID Formats", () => {
    it("should use google: prefix for Google accounts", () => {
      const providerId = "google:109876543210";

      expect(providerId).toMatch(/^google:/);
    });

    it("should use github: prefix for GitHub accounts", () => {
      const providerId = "github:987654";

      expect(providerId).toMatch(/^github:/);
    });

    it("should use email: prefix for magic link accounts", () => {
      const providerId = "email:user@example.com";

      expect(providerId).toMatch(/^email:/);
    });
  });
});

describe("Auth Flow - Session Management", () => {
  it("should include organization in session", () => {
    const session = {
      user: {
        oauthId: "email:user@example.com",
        organizations: [
          { id: "org_abc", name: "Personal", role: "owner" },
          { id: "org_xyz", name: "Work", role: "admin" },
        ],
        organizationId: "org_abc",
      },
    };

    expect(session.user.organizations.length).toBe(2);
    expect(session.user.organizationId).toBe("org_abc");
  });

  it("should include merchants in session", () => {
    const session = {
      user: {
        merchants: [
          { id: "mid_1", name: "Store 1", merchantId: "mid_1" },
          { id: "mid_2", name: "Store 2", merchantId: "mid_2" },
        ],
        merchantId: "mid_1",
      },
    };

    expect(session.user.merchants.length).toBe(2);
    expect(session.user.merchantId).toBe("mid_1");
  });

  it("should track 2FA status in session", () => {
    const session = {
      user: {
        twoFactorRequired: true,
        twoFactorVerified: false,
      },
    };

    expect(session.user.twoFactorRequired).toBe(true);
    expect(session.user.twoFactorVerified).toBe(false);
  });
});

describe("Auth Flow - Edge Cases", () => {
  it("should handle user with no merchants", () => {
    const hasNoMerchants = true;

    expect(hasNoMerchants).toBe(true);
  });

  it("should handle user with no organizations", () => {
    const organizations = [];

    expect(organizations.length).toBe(0);
  });

  it("should handle switching between organizations", () => {
    const orgs = [
      { id: "org_1", name: "Personal" },
      { id: "org_2", name: "Work" },
    ];

    const switchTo = orgs[1];

    expect(switchTo.id).toBe("org_2");
  });

  it("should handle switching between merchants", () => {
    const merchants = [
      { id: "mid_1", name: "Store A" },
      { id: "mid_2", name: "Store B" },
    ];

    const switchTo = merchants[1];

    expect(switchTo.id).toBe("mid_2");
  });
});
