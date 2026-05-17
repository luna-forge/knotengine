import { Metadata } from "next";
import CheckoutPageClient from "./CheckoutPageClient";

interface PageProps {
  params: Promise<{ invoiceId: string }>;
}

async function getInvoice(invoiceId: string) {
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050";
  try {
    const res = await fetch(`${API_BASE_URL}/v1/invoices/${invoiceId}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error("Error fetching invoice for metadata:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { invoiceId } = await params;
  const invoice = await getInvoice(invoiceId);

  if (!invoice) {
    return {
      title: "Invoice Not Found | KnotEngine",
    };
  }

  const merchantName = invoice.merchant?.name || "Merchant";
  const amount = `${invoice.amount_usd.toFixed(2)} USD`;

  return {
    title: `Pay ${amount} to ${merchantName}`,
    description: `Secure crypto payment request for ${amount} at ${merchantName}. Supported currencies: BTC, LTC, ETH, USDT.`,
    openGraph: {
      title: `Payment Request from ${merchantName}`,
      description: `Amount: ${amount}. Pay securely with crypto via KnotEngine.`,
      images: invoice.merchant?.logo_url
        ? [invoice.merchant.logo_url]
        : undefined,
    },
    twitter: {
      card: "summary",
      title: `Pay ${merchantName}`,
      description: `Securely send ${amount} in crypto.`,
      images: invoice.merchant?.logo_url
        ? [invoice.merchant.logo_url]
        : undefined,
    },
  };
}

export default async function CheckoutPage({ params }: PageProps) {
  const { invoiceId } = await params;
  const initialInvoice = await getInvoice(invoiceId);

  return (
    <CheckoutPageClient invoiceId={invoiceId} initialInvoice={initialInvoice} />
  );
}
