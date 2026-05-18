import { useState } from "react";
import {
  Loader2,
  Copy,
  Check,
  ShieldCheck,
  ExternalLink,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Plus,
  MoreHorizontal,
  Trash2,
  Edit,
  Play,
  AlertTriangle,
} from "lucide-react";
import { cn, dedent } from "@/lib/utils";
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
import { CodeBlock } from "@/components/ui/code-block";
import { Badge } from "@/components/ui/badge";
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
import { useWebhooks } from "../hooks/use-webhooks";
import { useWebhookDeliveries } from "../hooks/use-webhook-deliveries";

const ALL_EVENTS = [
  { key: "invoice.confirmed", desc: "Invoice reached required confirmations" },
  { key: "invoice.mempool_detected", desc: "Transaction seen in mempool" },
  { key: "invoice.partially_paid", desc: "Partial payment received" },
  { key: "invoice.overpaid", desc: "Payment exceeded invoice amount" },
  { key: "invoice.expired", desc: "Invoice expired without payment" },
  { key: "invoice.failed", desc: "Invoice failed or remained unpaid" },
];

export function WebhooksTab() {
  const {
    endpoints,
    loading,
    copied,
    creating,
    testing,
    deleting,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    deleteTarget,
    setDeleteTarget,
    newEndpoint,
    setNewEndpoint,
    newEndpointUrl,
    setNewEndpointUrl,
    newEndpointDescription,
    setNewEndpointDescription,
    newEndpointEvents,
    setNewEndpointEvents,
    newEndpointEventMode,
    setNewEndpointEventMode,
    selectedLanguage,
    setSelectedLanguage,
    copyToClipboard,
    handleCreateEndpoint,
    handleSaveEndpoint,
    handleDeleteEndpoint,
    handleTestEndpoint,
  } = useWebhooks();

  const {
    deliveries,
    stats,
    loading: deliveriesLoading,
    page,
    totalPages,
    setPage,
    statusFilter,
    setStatusFilter,
  } = useWebhookDeliveries();

  const [editingEndpoint, setEditingEndpoint] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    url: string;
    description: string;
    events: string[];
    eventMode: "all" | "filtered";
  } | null>(null);

  const cancelEditing = () => {
    setEditingEndpoint(null);
    setEditForm(null);
  };

  const toggleEvent = (eventKey: string) => {
    if (!editForm) return;
    setEditForm((prev) => {
      if (!prev) return prev;
      const events = prev.events.includes(eventKey)
        ? prev.events.filter((e) => e !== eventKey)
        : [...prev.events, eventKey];
      return { ...prev, events };
    });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Webhook Endpoints</h3>
          <p className="text-muted-foreground text-sm">
            Manage destinations for event notifications.
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 size-4" />
          Add Endpoint
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-muted-foreground py-8 text-center">
              Loading endpoints...
            </div>
          ) : endpoints.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              No webhook endpoints yet. Add one to receive event notifications.
            </div>
          ) : (
            <div className="border-border/40 overflow-hidden rounded-lg border shadow-sm">
              <Table>
                <TableHeader className="bg-muted/20">
                  <TableRow className="border-border/30 h-12 hover:bg-transparent">
                    <TableHead className="pl-6 text-[10px] font-bold tracking-wider uppercase">
                      Endpoint
                    </TableHead>
                    <TableHead className="text-[10px] font-bold tracking-wider uppercase">
                      Events
                    </TableHead>
                    <TableHead className="text-[10px] font-bold tracking-wider uppercase">
                      Last Delivery
                    </TableHead>
                    <TableHead className="text-[10px] font-bold tracking-wider uppercase">
                      Status
                    </TableHead>
                    <TableHead className="pr-6 text-right text-[10px] font-bold tracking-wider uppercase">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {endpoints.map((ep) => (
                    <TableRow key={ep.id}>
                      <TableCell className="pl-6">
                        <div>
                          <div className="text-sm font-medium">
                            {ep.description || "Unnamed"}
                          </div>
                          <div className="text-muted-foreground max-w-xs truncate font-mono text-xs">
                            {ep.url}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {ep.eventMode === "all"
                            ? "All Events"
                            : `${ep.events.length} events`}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-muted-foreground text-xs">
                          {ep.lastSuccessAt ? (
                            <span className="text-emerald-500">
                              <CheckCircle2 className="mr-1 inline size-3" />
                              {formatDate(ep.lastSuccessAt)}
                            </span>
                          ) : ep.lastFailureAt ? (
                            <span className="text-red-500">
                              <XCircle className="mr-1 inline size-3" />
                              {formatDate(ep.lastFailureAt)}
                            </span>
                          ) : (
                            "Never"
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {ep.isActive ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-500">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-500">
                            <span className="size-1.5 rounded-full bg-red-500" />
                            Disabled
                          </span>
                        )}
                        {ep.consecutiveFailures > 0 && (
                          <div className="text-muted-foreground text-[10px]">
                            {ep.consecutiveFailures} failures
                          </div>
                        )}
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
                            <DropdownMenuItem
                              className="text-xs"
                              onClick={() => handleTestEndpoint(ep.id)}
                              disabled={testing === ep.id}
                            >
                              {testing === ep.id ? (
                                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Play className="mr-2 h-3.5 w-3.5" />
                              )}
                              Test endpoint
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-xs"
                              onClick={() => {
                                setEditingEndpoint(ep.id);
                                setEditForm({
                                  url: ep.url,
                                  description: ep.description || "",
                                  events: ep.events,
                                  eventMode: ep.eventMode,
                                });
                              }}
                            >
                              <Edit className="mr-2 h-3.5 w-3.5" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive text-xs"
                              onClick={() => {
                                setDeleteTarget(ep);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete
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

      {/* Edit Endpoint Inline */}
      {editingEndpoint && editForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Edit Endpoint</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>URL</Label>
              <Input
                value={editForm.url}
                onChange={(e) =>
                  setEditForm({ ...editForm, url: e.target.value })
                }
                placeholder="https://api.myapp.com/webhooks"
              />
            </div>
            <div className="grid gap-2">
              <Label>Description (optional)</Label>
              <Input
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                placeholder="Production server"
              />
            </div>
            <div className="grid gap-2">
              <Label>Event Mode</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={editForm.eventMode === "all"}
                    onChange={() =>
                      setEditForm({ ...editForm, eventMode: "all" })
                    }
                  />
                  All Events
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={editForm.eventMode === "filtered"}
                    onChange={() =>
                      setEditForm({ ...editForm, eventMode: "filtered" })
                    }
                  />
                  Filtered
                </label>
              </div>
            </div>
            {editForm.eventMode === "filtered" && (
              <div className="grid gap-2">
                <Label>Events</Label>
                <div className="space-y-1">
                  {ALL_EVENTS.map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={editForm.events.includes(item.key)}
                        onChange={() => toggleEvent(item.key)}
                      />
                      <span>{item.key}</span>
                      <span className="text-muted-foreground text-xs">
                        {item.desc}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={cancelEditing} variant="outline">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  handleSaveEndpoint(editingEndpoint, editForm);
                  cancelEditing();
                }}
              >
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Endpoint Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Webhook Endpoint</DialogTitle>
            <DialogDescription>
              Enter the URL where KnotEngine should send event notifications.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={newEndpointUrl}
                onChange={(e) => setNewEndpointUrl(e.target.value)}
                placeholder="https://api.myapp.com/webhooks"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={newEndpointDescription}
                onChange={(e) => setNewEndpointDescription(e.target.value)}
                placeholder="Production server"
              />
            </div>
            <div className="space-y-2">
              <Label>Event Mode</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={newEndpointEventMode === "all"}
                    onChange={() => setNewEndpointEventMode("all")}
                  />
                  All Events
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={newEndpointEventMode === "filtered"}
                    onChange={() => setNewEndpointEventMode("filtered")}
                  />
                  Filtered
                </label>
              </div>
            </div>
            {newEndpointEventMode === "filtered" && (
              <div className="space-y-2">
                <Label>Events</Label>
                <div className="space-y-1">
                  {ALL_EVENTS.map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={newEndpointEvents.includes(item.key)}
                        onChange={() =>
                          setNewEndpointEvents((prev) =>
                            prev.includes(item.key)
                              ? prev.filter((e) => e !== item.key)
                              : [...prev, item.key],
                          )
                        }
                      />
                      <span>{item.key}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateEndpoint}
              disabled={creating || !newEndpointUrl}
            >
              {creating ? "Creating..." : "Add Endpoint"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Endpoint Secret Dialog */}
      <Dialog
        open={!!newEndpoint}
        onOpenChange={(open) => !open && setNewEndpoint(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Webhook Endpoint Created</DialogTitle>
            <DialogDescription>
              Copy your signing secret now. You will not be able to see it
              again.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4 flex items-center space-x-2">
            <Input
              readOnly
              value={newEndpoint?.secret || ""}
              className="font-mono text-sm"
            />
            <Button
              size="icon"
              variant="secondary"
              onClick={() =>
                newEndpoint && copyToClipboard(newEndpoint.secret, "wh-secret")
              }
            >
              {copied === "wh-secret" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-3">
            <div className="mb-1.5 flex items-center gap-2">
              <ShieldCheck className="size-3.5 text-emerald-500" />
              <span className="text-[10px] font-bold tracking-tight text-emerald-600 uppercase">
                Security Policy
              </span>
            </div>
            <p className="text-muted-foreground text-[10.5px] leading-relaxed">
              Always verify the{" "}
              <code className="font-mono text-emerald-600">
                x-knot-signature
              </code>{" "}
              header using your secret before processing webhooks.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setNewEndpoint(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Endpoint Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              Delete Endpoint
            </DialogTitle>
            <DialogDescription>
              Are you sure? The endpoint <strong>{deleteTarget?.url}</strong>{" "}
              will stop receiving webhook events immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteEndpoint}
              disabled={deleting === deleteTarget?.id}
            >
              {deleting === deleteTarget?.id && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete Endpoint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Implementation Guide */}
      <Card className="relative w-full overflow-hidden border bg-[#0c0c0c] text-slate-50 shadow-sm">
        <CardContent className="p-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            <div className="flex flex-col gap-10">
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-50">
                  Implementation Guide
                </h3>
                <p className="text-xs text-slate-400">
                  A quick reference for verifying webhook signatures.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-500" />
                  <h4 className="text-sm font-bold text-slate-50">
                    Signature verification
                  </h4>
                </div>
                <p className="max-w-sm text-[13px] leading-relaxed text-slate-400">
                  Webhooks are signed with a{" "}
                  <code className="relative z-10 mx-1 rounded bg-white/5 px-1 py-0.5 text-xs text-slate-300 select-none">
                    HMAC-SHA256
                  </code>{" "}
                  hash of the raw request body using your signing secret.
                </p>
                <div className="flex pt-2">
                  <Button
                    variant="link"
                    className="h-auto p-0 text-xs text-slate-300 hover:text-white"
                    asChild
                  >
                    <a href="/docs">
                      View docs <ExternalLink className="ml-1.5 size-3" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center">
                <div className="flex rounded-lg border border-white/5 bg-white/5 p-1">
                  <button
                    onClick={() => setSelectedLanguage("nodejs-sdk")}
                    className={cn(
                      "rounded-md px-3 py-1 text-[10px] font-bold tracking-tight uppercase transition-all",
                      selectedLanguage === "nodejs-sdk"
                        ? "border border-white/5 bg-[#0A0A0A] text-slate-100 shadow-sm"
                        : "text-slate-400 hover:text-slate-200",
                    )}
                  >
                    Node.js SDK
                  </button>
                  <button
                    onClick={() => setSelectedLanguage("nodejs")}
                    className={cn(
                      "rounded-md px-3 py-1 text-[10px] font-bold tracking-tight uppercase transition-all",
                      selectedLanguage === "nodejs"
                        ? "border border-white/5 bg-[#0A0A0A] text-slate-100 shadow-sm"
                        : "text-slate-400 hover:text-slate-200",
                    )}
                  >
                    Node.js
                  </button>
                </div>
              </div>

              <CodeBlock
                className="h-100"
                language="typescript"
                code={
                  selectedLanguage === "nodejs-sdk"
                    ? dedent`
                        import { KnotClient } from '@qodinger/knot-sdk';

                        const knot = new KnotClient({
                          apiKey: process.env.KNOT_API_KEY,
                          webhookSecret: process.env.KNOT_WEBHOOK_SECRET
                        });

                        // 1. Get signature from headers
                        const signature = req.headers['x-knot-signature'];

                        // 2. Verify automatically via SDK
                        const isValid = knot.verifyWebhook(req.rawBody, signature);
                      `
                    : dedent`
                        import crypto from 'crypto';

                        // 1. Get signature & raw body
                        const signature = req.headers['x-knot-signature'];
                        const rawBody = req.rawBody;

                        // 2. Generate expected HMAC-SHA256 signature
                        const expected = crypto
                          .createHmac('sha256', process.env.KNOT_WEBHOOK_SECRET)
                          .update(rawBody)
                          .digest('hex');

                        // 3. Timing-safe comparison
                        const sigBuf = Buffer.from(signature, 'hex');
                        const expBuf = Buffer.from(expected, 'hex');

                        let isValid = false;
                        if (sigBuf.length === expBuf.length) {
                          isValid = crypto.timingSafeEqual(sigBuf, expBuf);
                        }
                      `
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Logs */}
      {stats && stats.total > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="px-6 pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">
                  Delivery Logs
                </CardTitle>
                <CardDescription className="text-xs">
                  Recent webhook delivery attempts and their status.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {stats && (
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-emerald-500">
                      <CheckCircle2 className="size-3" />
                      {stats.success}
                    </span>
                    <span className="flex items-center gap-1 text-red-500">
                      <XCircle className="size-3" />
                      {stats.failed}
                    </span>
                    <span className="text-muted-foreground">
                      {stats.successRate}% success
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6 pt-0 pb-6">
            <div className="mb-4 flex items-center gap-2">
              <Button
                variant={statusFilter === "" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setStatusFilter("")}
              >
                All
              </Button>
              <Button
                variant={statusFilter === "success" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setStatusFilter("success")}
              >
                Success
              </Button>
              <Button
                variant={statusFilter === "failed" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setStatusFilter("failed")}
              >
                Failed
              </Button>
            </div>

            {deliveriesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="text-muted-foreground size-4 animate-spin" />
              </div>
            ) : deliveries.length > 0 ? (
              <div className="space-y-2">
                {deliveries.map((delivery) => (
                  <div
                    key={delivery._id}
                    className="border-border/30 bg-muted/10 flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      {delivery.status === "success" ? (
                        <CheckCircle2 className="size-4 text-emerald-500" />
                      ) : delivery.status === "failed" ? (
                        <XCircle className="size-4 text-red-500" />
                      ) : (
                        <Clock className="size-4 text-amber-500" />
                      )}
                      <div>
                        <p className="text-xs font-medium">
                          {delivery.eventType}
                        </p>
                        <p className="text-muted-foreground text-[10px]">
                          {delivery.invoiceId} • Attempt #{delivery.attempt}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        {delivery.statusCode && (
                          <Badge
                            variant={
                              delivery.statusCode >= 200 &&
                              delivery.statusCode < 300
                                ? "default"
                                : "destructive"
                            }
                            className="text-[10px]"
                          >
                            {delivery.statusCode}
                          </Badge>
                        )}
                        {delivery.errorMessage && (
                          <div className="text-destructive flex items-center gap-1 text-[10px]">
                            <AlertCircle className="size-3" />
                            {delivery.errorMessage.substring(0, 30)}...
                          </div>
                        )}
                      </div>
                      <div className="text-muted-foreground text-right text-[10px]">
                        <p>{delivery.duration}ms</p>
                        <p>
                          {new Date(delivery.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground/50 flex items-center justify-center py-8 text-sm">
                No delivery logs found.
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-muted-foreground text-xs">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
