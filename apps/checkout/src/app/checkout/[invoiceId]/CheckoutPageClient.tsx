"use client";

import React, { useState, useEffect } from "react";
import { CheckoutCard } from "@/components/CheckoutCard";
import { Loader2, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";
import { Invoice } from "@/types/invoice";

interface CheckoutPageClientProps {
  invoiceId: string;
  initialInvoice: Invoice | null;
}

export default function CheckoutPageClient({
  invoiceId,
  initialInvoice,
}: CheckoutPageClientProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(initialInvoice);
  const [loading, setLoading] = useState(!initialInvoice);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050";

  const fetchInvoice = React.useCallback(
    async (isManualRetry = false) => {
      if (isManualRetry) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await fetch(`${API_BASE_URL}/v1/invoices/${invoiceId}`);
        if (!res.ok) throw new Error("Invoice not found");
        const data = await res.json();
        setInvoice(data);
        setError(null);
        setLoading(false);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setLoading(false);
      }
    },
    [invoiceId, API_BASE_URL],
  );

  useEffect(() => {
    if (invoice?.merchant?.theme) {
      const theme = invoice.merchant.theme;
      if (theme === "light") {
        document.documentElement.classList.remove("dark");
      } else if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
    }
  }, [invoice?.merchant?.theme]);

  useEffect(() => {
    if (!invoiceId) return;

    if (!initialInvoice) {
      fetchInvoice();
    }

    const socket = io(API_BASE_URL);

    socket.on("connect", () => {
      socket.emit("join_invoice", invoiceId);
    });

    socket.on(
      "status_update",
      (data: {
        status: string;
        confirmations: number;
        txHash: string | null;
        cryptoAmountReceived?: number;
      }) => {
        setInvoice((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: data.status,
            confirmations: data.confirmations,
            tx_hash: data.txHash,
            crypto_amount_received:
              data.cryptoAmountReceived ?? prev.crypto_amount_received,
          };
        });
        // If we get a socket update, the connection is clearly working
        setError(null);
      },
    );

    const interval = setInterval(() => fetchInvoice(false), 30000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [invoiceId, API_BASE_URL, initialInvoice, fetchInvoice]);

  if (loading) {
    return (
      <div className="bg-background text-foreground flex min-h-screen items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 size={32} className="text-primary" />
        </motion.div>
      </div>
    );
  }

  const handleRetry = () => {
    fetchInvoice(true);
  };

  if (error) {
    return (
      <div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <div className="bg-card border-border max-w-sm rounded-xl border p-8 shadow-2xl">
          <h1 className="mb-2 text-xl font-bold tracking-tight">
            Connection Error
          </h1>
          <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
            {error}. Please verify the Invoice ID or contact the merchant.
          </p>
          <button
            onClick={handleRetry}
            className="bg-foreground text-background flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  return (
    <>
      {invoice.merchant?.brand_color &&
        invoice.merchant.brand_color !== "#ffffff" && (
          <style
            dangerouslySetInnerHTML={{
              __html: `
          :root {
            --brand-color: ${invoice.merchant.brand_color};
            --brand-color-muted: ${invoice.merchant.brand_color}20;
          }
          .brand-bg { background-color: var(--brand-color) !important; border-color: var(--brand-color) !important; color: #fff !important; }
          .brand-text { color: var(--brand-color) !important; }
          .brand-border { border-color: var(--brand-color) !important; }
          .brand-bg-muted { background-color: var(--brand-color-muted) !important; }
          .group:hover .group-hover-brand-border { border-color: var(--brand-color) !important; }
          .group:hover .group-hover-brand-text { color: var(--brand-color) !important; }
          .hover-brand-text:hover { color: var(--brand-color) !important; }
          .hover-brand-bg:hover { background-color: var(--brand-color) !important; color: #fff !important; border-color: var(--brand-color) !important; }
        `,
            }}
          />
        )}
      <main className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center p-6">
        <div className="relative z-10 w-full max-w-md">
          <AnimatePresence mode="wait">
            {["confirmed", "overpaid"].includes(invoice.status) ? (
              <motion.div
                key="success"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-card border-border w-full rounded-xl border p-8 pb-4 text-center shadow-2xl"
              >
                <div className="brand-bg-muted mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                  <ShieldCheck
                    size={28}
                    className="brand-text text-emerald-500"
                  />
                </div>
                <h2 className="mb-2 text-2xl font-bold tracking-tight">
                  {invoice.status === "overpaid"
                    ? "Overpayment Confirmed"
                    : "Payment Confirmed"}
                </h2>

                {invoice.description && (
                  <div className="bg-muted/20 border-border/40 mx-auto mb-6 inline-block rounded-lg border px-4 py-2.5">
                    <p className="text-muted-foreground text-xs leading-relaxed italic">
                      “{invoice.description}”
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Transaction has been verified on-chain. You may now close
                    this window
                    {invoice.merchant?.return_url
                      ? " or return to the merchant."
                      : "."}
                  </p>

                  {invoice.status === "overpaid" && (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-left">
                      <p className="mb-1 text-xs font-medium text-amber-500">
                        Overpayment Detected
                      </p>
                      <p className="text-[11px] leading-relaxed text-amber-200/60">
                        We detected that you sent more than the required amount.
                        Please contact{" "}
                        <span className="font-bold text-amber-500">
                          {invoice.merchant?.name || "the merchant"}
                        </span>{" "}
                        regarding your overpayment of{" "}
                        <span className="font-bold text-amber-500">
                          {parseFloat(
                            (
                              (invoice.crypto_amount_received || 0) -
                              invoice.crypto_amount
                            ).toFixed(8),
                          )}{" "}
                          {invoice.crypto_currency}
                        </span>
                        .
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 mb-6 flex flex-col gap-1">
                  <span className="text-muted-foreground mb-1 text-[10px] font-bold tracking-wider uppercase">
                    Transaction Hash
                  </span>
                  <div className="bg-secondary/50 border-border flex items-center justify-center rounded-lg border p-2">
                    <code className="text-foreground font-mono text-[11px] break-all">
                      {invoice.tx_hash ? (
                        invoice.tx_hash
                      ) : invoice.status === "confirmed" ||
                        invoice.status === "overpaid" ? (
                        <span className="text-muted-foreground font-sans">
                          Manual Resolution
                        </span>
                      ) : (
                        <span className="text-muted-foreground animate-pulse font-sans">
                          Processing...
                        </span>
                      )}
                    </code>
                  </div>
                </div>

                {invoice.merchant?.return_url && (
                  <button
                    onClick={() => {
                      const returnUrl = invoice.merchant?.return_url;
                      if (!returnUrl) return;
                      let url = returnUrl;
                      if (
                        !url.startsWith("http://") &&
                        !url.startsWith("https://") &&
                        !url.startsWith("/")
                      ) {
                        url = `https://${url}`;
                      }
                      window.location.href = url;
                    }}
                    className="brand-bg mb-4 w-full rounded-lg bg-emerald-500 py-3 text-sm font-bold text-black shadow-lg shadow-emerald-500/20 transition-colors hover:opacity-90 active:scale-[0.98]"
                  >
                    Return to {invoice.merchant?.name || "Merchant"}
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="card"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
              >
                <CheckoutCard invoice={invoice} />
              </motion.div>
            )}
          </AnimatePresence>

          <footer className="mt-8 flex flex-col items-center gap-2 opacity-50 transition-opacity hover:opacity-100">
            {/* Show "Powered by KnotEngine" unless merchant toggled it off (Pro+ only) */}
            {(invoice.merchant?.plan === "starter" ||
              invoice.merchant?.remove_branding !== true) && (
              <div className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-medium tracking-widest uppercase">
                <ShieldCheck size={12} />
                <span>Powered by</span>
                <span className="text-foreground font-bold">KnotEngine</span>
              </div>
            )}
          </footer>
        </div>
      </main>
    </>
  );
}
