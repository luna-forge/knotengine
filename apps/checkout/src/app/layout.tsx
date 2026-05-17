import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "KnotEngine | Secure Crypto Checkout",
    template: "%s | KnotEngine Checkout",
  },
  description:
    "Non-custodial, ultra-secure crypto payment gateway. Pay with BTC, LTC, ETH, and USDT directly to the merchant.",
  keywords: [
    "crypto checkout",
    "bitcoin payment",
    "ethereum payment",
    "web3 payments",
    "non-custodial",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://checkout.knotengine.com",
    siteName: "KnotEngine Checkout",
    title: "KnotEngine | Secure Crypto Checkout",
    description: "Accept crypto payments directly into your own wallet.",
  },
  twitter: {
    card: "summary_large_image",
    title: "KnotEngine | Secure Crypto Checkout",
    description: "Accept crypto payments directly into your own wallet.",
    creator: "@knotengine",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const customDomain = headersList.get("x-custom-domain");
  const brandColor = headersList.get("x-org-brand-color") || "#ffffff";

  return (
    <html lang="en" className="dark">
      <head>
        {customDomain && (
          <style
            dangerouslySetInnerHTML={{
              __html: `
                :root {
                  --brand-color: ${brandColor};
                  --brand-color-muted: ${brandColor}20;
                }
              `,
            }}
          />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
