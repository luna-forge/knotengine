"use client";

import {
  Copy,
  Check,
  MoreHorizontal,
  RefreshCw,
  AlertTriangle,
  Terminal,
  ExternalLink,
  Key,
  Plus,
  Shield,
  Clock,
} from "lucide-react";
import { cn, dedent } from "@/lib/utils";
import { CodeBlock } from "@/components/ui/code-block";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApiKeys } from "../hooks/use-api-keys";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050";

const SCOPE_LABELS: Record<string, string> = {
  full_access: "Full Access",
  read_only: "Read Only",
  invoices: "Invoices Only",
  webhooks: "Webhooks Only",
};

export function ApiKeysTab() {
  const {
    keys,
    loading,
    copied,
    creating,
    revoking,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    isRevokeDialogOpen,
    setIsRevokeDialogOpen,
    revokeTarget,
    setRevokeTarget,
    newKey,
    setNewKey,
    newKeyLabel,
    setNewKeyLabel,
    newKeyScope,
    setNewKeyScope,
    selectedIntegrationLanguage,
    setSelectedIntegrationLanguage,
    copyToClipboard,
    handleCreateKey,
    handleRevokeKey,
  } = useApiKeys();

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">API Keys</h3>
          <p className="text-muted-foreground text-sm">
            Manage API keys for authentication.
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 size-4" />
          Create Key
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-muted-foreground py-8 text-center">
              Loading keys...
            </div>
          ) : keys.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              No API keys yet. Create one to get started.
            </div>
          ) : (
            <div className="border-border/40 overflow-hidden rounded-lg border shadow-sm">
              <Table>
                <TableHeader className="bg-muted/20">
                  <TableRow className="border-border/30 h-12 hover:bg-transparent">
                    <TableHead className="pl-6 text-[10px] font-bold tracking-wider uppercase">
                      Name
                    </TableHead>
                    <TableHead className="text-[10px] font-bold tracking-wider uppercase">
                      Scope
                    </TableHead>
                    <TableHead className="text-[10px] font-bold tracking-wider uppercase">
                      Last Used
                    </TableHead>
                    <TableHead className="text-[10px] font-bold tracking-wider uppercase">
                      Requests
                    </TableHead>
                    <TableHead className="pr-6 text-right text-[10px] font-bold tracking-wider uppercase">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.map((key) => (
                    <TableRow key={key.id} className="group">
                      <TableCell className="pl-6 text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Key className="text-muted-foreground size-3.5" />
                          <div>
                            <div>{key.label}</div>
                            <div className="text-muted-foreground font-mono text-xs">
                              ...{key.lastFour}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          <Shield className="mr-1 size-3" />
                          {SCOPE_LABELS[key.scope] || key.scope}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-muted-foreground text-xs">
                          <Clock className="mr-1 inline size-3" />
                          {formatDate(key.lastUsedAt)}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {key.requestCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel className="text-xs">
                              Actions
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              className="text-xs"
                              onClick={() =>
                                copyToClipboard(
                                  `knot_sk_...${key.lastFour}`,
                                  key.id,
                                )
                              }
                            >
                              <Copy className="mr-2 h-3.5 w-3.5" />
                              Copy key ID
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive text-xs"
                              onClick={() => {
                                setRevokeTarget(key);
                                setIsRevokeDialogOpen(true);
                              }}
                            >
                              <AlertTriangle className="mr-2 h-3.5 w-3.5" />
                              Revoke key
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex w-full flex-col items-start gap-6">
        <Card className="group relative w-full overflow-hidden border bg-[#0c0c0c] text-slate-50 shadow-sm">
          <CardContent className="p-6 sm:p-8">
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-2 xl:gap-12">
              <div className="flex flex-col gap-6 sm:gap-10">
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-50">
                    Integration Guide
                  </h3>
                  <p className="text-xs text-slate-400">
                    The fastest way to test and integrate with KnotEngine.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Terminal className="size-4 text-emerald-500" />
                    <h4 className="text-sm font-bold text-slate-50">
                      Create an invoice
                    </h4>
                  </div>
                  <p className="max-w-sm text-[13px] leading-relaxed text-slate-400">
                    Generate a new payment invoice instantly using our REST API
                    or the official Node.js SDK.
                  </p>
                  <div className="flex pt-2 text-xs">
                    <a
                      href="https://github.com/qodinger/knotengine?tab=readme-ov-file#-self-hosting"
                      target="_blank"
                      className="inline-flex items-center gap-1.5 font-medium text-slate-300 transition-colors hover:text-white"
                    >
                      API Reference <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-4">
                <div className="flex items-center">
                  <div className="flex rounded-lg border border-white/5 bg-white/5 p-1">
                    <button
                      onClick={() => setSelectedIntegrationLanguage("nodejs")}
                      className={cn(
                        "rounded-md px-3 py-1 text-[10px] font-bold tracking-tight uppercase transition-all",
                        selectedIntegrationLanguage === "nodejs"
                          ? "border border-white/5 bg-[#0A0A0A] text-slate-100 shadow-sm"
                          : "text-slate-400 hover:text-slate-200",
                      )}
                    >
                      Node.js SDK
                    </button>
                    <button
                      onClick={() => setSelectedIntegrationLanguage("curl")}
                      className={cn(
                        "rounded-md px-3 py-1 text-[10px] font-bold tracking-tight uppercase transition-all",
                        selectedIntegrationLanguage === "curl"
                          ? "border border-white/5 bg-[#0A0A0A] text-slate-100 shadow-sm"
                          : "text-slate-400 hover:text-slate-200",
                      )}
                    >
                      cURL
                    </button>
                  </div>
                </div>

                {selectedIntegrationLanguage === "curl" ? (
                  <CodeBlock
                    language="bash"
                    className="w-full"
                    code={dedent`
                      curl -X POST ${API_BASE_URL}/v1/invoices \\
                        -H "x-api-key: YOUR_KEY" \\
                        -H "Content-Type: application/json" \\
                        -d '{ "amount_usd": 100, "currency": "BTC" }'
                    `}
                  />
                ) : (
                  <div className="w-full min-w-0 space-y-4">
                    <CodeBlock
                      language="typescript"
                      className="w-full"
                      code={dedent`
                        import { KnotClient } from '@qodinger/knot-sdk';

                        const knot = new KnotClient({ apiKey: 'YOUR_KEY' });

                        const invoice = await knot.createInvoice({
                          amount_usd: 100,
                          currency: 'BTC'
                        });
                      `}
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Key Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Give your key a descriptive name and choose its access level.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Key Name (optional)</Label>
              <Input
                placeholder="e.g. Production Server"
                value={newKeyLabel}
                onChange={(e) => setNewKeyLabel(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select value={newKeyScope} onValueChange={setNewKeyScope}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_access">Full Access</SelectItem>
                  <SelectItem value="read_only">Read Only</SelectItem>
                  <SelectItem value="invoices">Invoices Only</SelectItem>
                  <SelectItem value="webhooks">Webhooks Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateKey} disabled={creating}>
              {creating ? "Creating..." : "Create Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Key Display Dialog */}
      <Dialog open={!!newKey} onOpenChange={(open) => !open && setNewKey(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>API Key Generated</DialogTitle>
            <DialogDescription>
              Copy your new API key now. You will not be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4 flex items-center space-x-2">
            <Input
              readOnly
              value={newKey?.secretKey || ""}
              className="font-mono text-sm"
            />
            <Button
              size="icon"
              variant="secondary"
              onClick={() =>
                newKey && copyToClipboard(newKey.secretKey, "newkey")
              }
            >
              {copied === "newkey" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <Alert
            variant="default"
            className="mb-4 border-amber-500/20 bg-amber-500/10 text-amber-600"
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-sm">Save this key</AlertTitle>
            <AlertDescription className="text-xs">
              Save this key in a secure location like a password manager or
              environment variable.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button type="button" onClick={() => setNewKey(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Key Dialog */}
      <Dialog open={isRevokeDialogOpen} onOpenChange={setIsRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              Revoke API Key
            </DialogTitle>
            <DialogDescription>
              Are you sure? The key <strong>{revokeTarget?.label}</strong> will
              be invalidated immediately. Any applications using it will stop
              working.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRevokeDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevokeKey}
              disabled={revoking === revokeTarget?.id}
            >
              {revoking === revokeTarget?.id && (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              )}
              Revoke Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
