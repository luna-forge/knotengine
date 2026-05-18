import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      merchantId?: string;
      apiKey?: string;
      oauthId?: string;
      merchants?: Array<{
        id: string;
        merchantId: string;
        name?: string;
        twoFactorEnabled?: boolean;
        referralCode?: string;
        referralEarningsUsd?: number;
      }>;
      twoFactorRequired?: boolean;
      twoFactorVerified?: boolean;
      referralCode?: string;
      referralEarningsUsd?: number;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    merchantId?: string;
    apiKey?: string;
    oauthId?: string;
    hasNoMerchants?: boolean;
    merchants?: Array<{
      id: string;
      merchantId: string;
      name?: string;
      twoFactorEnabled?: boolean;
      referralCode?: string;
      referralEarningsUsd?: number;
    }>;
    twoFactorRequired?: boolean;
    twoFactorVerified?: boolean;
    referralCode?: string;
    referralEarningsUsd?: number;
  }
}
