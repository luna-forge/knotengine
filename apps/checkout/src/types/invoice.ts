export interface Invoice {
  invoice_id: string;
  amount_usd: number;
  crypto_amount: number;
  crypto_amount_received?: number;
  crypto_currency: string;
  pay_address: string;
  status: string;
  expires_at: string;
  fee_usd?: number;
  fee_crypto?: number;
  tx_hash?: string | null;
  confirmations?: number;
  required_confirmations?: number;
  paid_at?: string | null;
  created_at?: string;
  metadata?: {
    isTestnet?: boolean;
    feeResponsibility?: "client" | "merchant";
    network?: string;
    baseAmountUsd?: number;
  };
  merchant?: {
    name: string;
    logo_url?: string | null;
    return_url?: string | null;
    theme?: "light" | "dark" | "system";
    brand_color?: string;
    branding_enabled?: boolean;
    remove_branding?: boolean;
    bip21_enabled?: boolean;
    branding_alignment?: "left" | "center";
    plan?: "starter" | "professional" | "enterprise";
  };
  description?: string | null;
  checkout_url?: string;
}
