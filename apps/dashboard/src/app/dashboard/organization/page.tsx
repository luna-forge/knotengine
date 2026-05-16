"use client";

import * as React from "react";
import {
  Globe,
  CheckCircle,
  XCircle,
  Loader2,
  Copy,
  ExternalLink,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useActiveOrganization } from "@/components/organization-switcher";

interface OrgData {
  organizationId: string;
  name: string;
  customDomain?: string;
  customDomainVerified: boolean;
  plan: string;
}

export default function OrganizationPage() {
  const { activeOrg } = useActiveOrganization();
  const [orgData, setOrgData] = React.useState<OrgData | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [domainInput, setDomainInput] = React.useState("");
  const [verificationToken, setVerificationToken] = React.useState("");
  const [verificationStatus, setVerificationStatus] = React.useState<
    "idle" | "verifying" | "verified" | "failed"
  >("idle");
  const [verificationMessage, setVerificationMessage] = React.useState("");
  const [savingDomain, setSavingDomain] = React.useState(false);

  const fetchOrg = React.useCallback(async () => {
    if (!activeOrg) return;
    try {
      const res = await fetch(
        `/api/v1/organizations/${activeOrg.organizationId}`,
      );
      if (res.ok) {
        const data = await res.json();
        setOrgData(data.organization);
        setDomainInput(data.organization.customDomain || "");
        setVerificationStatus(
          data.organization.customDomainVerified ? "verified" : "idle",
        );
      }
    } catch (err) {
      console.error("Failed to fetch organization", err);
    }
  }, [activeOrg]);

  React.useEffect(() => {
    fetchOrg();
  }, [fetchOrg]);

  const handleSaveDomain = async () => {
    if (!activeOrg) return;
    setSavingDomain(true);
    try {
      const res = await fetch(
        `/api/v1/organizations/${activeOrg.organizationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customDomain: domainInput || null }),
        },
      );
      if (res.ok) {
        fetchOrg();
        setVerificationToken("");
        setVerificationStatus("idle");
        setVerificationMessage("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingDomain(false);
    }
  };

  const handleGenerateToken = async () => {
    if (!activeOrg) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/v1/organizations/${activeOrg.organizationId}/domain/generate-token`,
        {
          method: "POST",
        },
      );
      if (res.ok) {
        const data = await res.json();
        setVerificationToken(data.token);
        setVerificationMessage(data.instructions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyDomain = async () => {
    if (!activeOrg) return;
    setVerificationStatus("verifying");
    try {
      const res = await fetch(
        `/api/v1/organizations/${activeOrg.organizationId}/domain/verify`,
        {
          method: "POST",
        },
      );
      const data = await res.json();
      if (data.verified) {
        setVerificationStatus("verified");
        fetchOrg();
      } else {
        setVerificationStatus("failed");
        setVerificationMessage(data.message);
      }
    } catch {
      setVerificationStatus("failed");
      setVerificationMessage("Verification request failed");
    }
  };

  const copyToken = () => {
    if (verificationToken) {
      navigator.clipboard.writeText(verificationToken);
    }
  };

  if (!activeOrg) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">No organization selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Organization Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage {activeOrg.name} configuration and custom domain
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="size-5" />
            Custom Checkout Domain
          </CardTitle>
          <CardDescription>
            Use your own domain for checkout pages (e.g. pay.yourbrand.com)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                placeholder="pay.yourbrand.com"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
              />
            </div>
            <Button
              onClick={handleSaveDomain}
              disabled={savingDomain || !domainInput}
              className="mt-8"
            >
              {savingDomain ? "Saving..." : "Save Domain"}
            </Button>
          </div>

          {orgData?.customDomain && (
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="size-4" />
                  <span className="text-sm font-medium">
                    {orgData.customDomain}
                  </span>
                </div>
                <Badge
                  variant={
                    orgData.customDomainVerified ? "default" : "secondary"
                  }
                  className={
                    orgData.customDomainVerified
                      ? "bg-green-500/15 text-green-500"
                      : "bg-yellow-500/15 text-yellow-500"
                  }
                >
                  {orgData.customDomainVerified ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle className="size-3" />
                      Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <XCircle className="size-3" />
                      Pending
                    </span>
                  )}
                </Badge>
              </div>

              {!orgData.customDomainVerified && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button
                      onClick={handleGenerateToken}
                      disabled={isLoading}
                      variant="outline"
                      size="sm"
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        "Generate Verification Token"
                      )}
                    </Button>
                    <Button
                      onClick={handleVerifyDomain}
                      disabled={
                        verificationStatus === "verifying" || !verificationToken
                      }
                      variant="outline"
                      size="sm"
                    >
                      {verificationStatus === "verifying" ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        "Verify Domain"
                      )}
                    </Button>
                  </div>

                  {verificationToken && (
                    <div className="bg-muted rounded-md border p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <Label className="text-xs">Verification Token</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={copyToken}
                          className="size-6 p-0"
                        >
                          <Copy className="size-3" />
                        </Button>
                      </div>
                      <code className="text-xs break-all">
                        {verificationToken}
                      </code>
                    </div>
                  )}

                  {verificationMessage && (
                    <p className="text-muted-foreground text-sm">
                      {verificationMessage}
                    </p>
                  )}

                  <div className="bg-muted rounded-md border p-3">
                    <p className="mb-1 text-xs font-medium">Instructions</p>
                    <ol className="text-muted-foreground list-inside list-decimal space-y-1 text-xs">
                      <li>
                        Create a file at{" "}
                        <code className="bg-background rounded px-1">
                          https://{orgData.customDomain}
                          /.well-known/knotengine-verification.txt
                        </code>
                      </li>
                      <li>
                        Place the verification token as the exact content of the
                        file
                      </li>
                      <li>
                        Click &quot;Verify Domain&quot; to confirm ownership
                      </li>
                    </ol>
                  </div>
                </div>
              )}

              {orgData.customDomainVerified && (
                <div className="rounded-md border bg-green-500/10 p-3">
                  <p className="text-xs font-medium text-green-500">
                    Domain verified successfully! Your checkout pages are now
                    accessible at:
                  </p>
                  <a
                    href={`https://${orgData.customDomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 flex items-center gap-1 text-xs text-green-500 hover:underline"
                  >
                    https://{orgData.customDomain}
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
