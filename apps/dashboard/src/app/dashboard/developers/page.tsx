"use client";

import { Suspense, useCallback, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Key, FlaskConical, Webhook, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SubNavLayout } from "@/components/sub-nav-layout";

import { ApiKeysTab } from "./components/api-keys-tab";
import { TestnetTab } from "./components/testnet-tab";
import { WebhooksTab } from "./components/webhooks-tab";

const sections = [
  { label: "API Keys", value: "api-keys", icon: Key },
  { label: "Simulator", value: "testnet", icon: FlaskConical },
  { label: "Webhooks", value: "webhooks", icon: Webhook },
];

function DevelopersContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "api-keys";

  const { data: session } = useSession();
  const [activeSection, setActiveSection] = useState(initialTab);
  const [copied, setCopied] = useState(false);

  const user = session?.user as { merchantId?: string } | undefined;
  const displayMerchantId = user?.merchantId || "";

  const copyMerchantId = () => {
    if (!displayMerchantId) return;
    navigator.clipboard.writeText(displayMerchantId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    setActiveSection(initialTab);
  }, [initialTab]);

  const handleSectionChange = useCallback((value: string) => {
    setActiveSection(value);
    window.history.replaceState(null, "", `?tab=${value}`);
  }, []);

  return (
    <SubNavLayout
      title="Developers"
      description="API keys, testing tools, and integration resources."
      items={sections}
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
      headerExtra={
        displayMerchantId ? (
          <div className="flex shrink-0 flex-col justify-end gap-1 lg:w-72">
            <Label className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
              Merchant ID
            </Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={displayMerchantId}
                className="bg-muted/30 h-9 font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={copyMerchantId}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        ) : undefined
      }
    >
      {activeSection === "api-keys" && <ApiKeysTab />}
      {activeSection === "testnet" && <TestnetTab />}
      {activeSection === "webhooks" && <WebhooksTab />}
    </SubNavLayout>
  );
}

export default function DevelopersPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <DevelopersContent />
    </Suspense>
  );
}
