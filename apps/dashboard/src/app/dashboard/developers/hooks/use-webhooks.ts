"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api";

type WebhookEndpoint = {
  id: string;
  endpointId: string;
  url: string;
  description?: string;
  events: string[];
  eventMode: "all" | "filtered";
  isActive: boolean;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  consecutiveFailures: number;
  disabledAt?: string;
  createdAt: string;
};

const DEFAULT_EVENTS = [
  "invoice.confirmed",
  "invoice.mempool_detected",
  "invoice.partially_paid",
  "invoice.overpaid",
  "invoice.expired",
  "invoice.failed",
];

export function useWebhooks() {
  const { data: session } = useSession();
  const merchantId = (session?.user as { merchantId?: string })?.merchantId;
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WebhookEndpoint | null>(
    null,
  );
  const [newEndpoint, setNewEndpoint] = useState<{
    secret: string;
    endpointId: string;
  } | null>(null);
  const [newEndpointUrl, setNewEndpointUrl] = useState("");
  const [newEndpointDescription, setNewEndpointDescription] = useState("");
  const [newEndpointEvents, setNewEndpointEvents] =
    useState<string[]>(DEFAULT_EVENTS);
  const [newEndpointEventMode, setNewEndpointEventMode] = useState<
    "all" | "filtered"
  >("filtered");
  const [selectedLanguage, setSelectedLanguage] = useState("nodejs-sdk");

  const fetchEndpoints = async () => {
    if (!merchantId) return;
    try {
      const res = await api.get(
        `/v1/merchants/${merchantId}/webhooks/endpoints`,
      );
      setEndpoints(res.data.endpoints || []);
    } catch (err) {
      console.error("Failed to fetch webhook endpoints:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEndpoints();
  }, [merchantId]);

  const copyToClipboard = (text: string, id?: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id || "generic");
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCreateEndpoint = async () => {
    if (!merchantId || !newEndpointUrl) return;
    setCreating(true);
    try {
      const res = await api.post(
        `/v1/merchants/${merchantId}/webhooks/endpoints`,
        {
          url: newEndpointUrl,
          description: newEndpointDescription || undefined,
          events: newEndpointEvents,
          eventMode: newEndpointEventMode,
        },
      );
      setNewEndpoint({
        secret: res.data.endpoint.secret,
        endpointId: res.data.endpoint.endpointId,
      });
      setIsCreateDialogOpen(false);
      setNewEndpointUrl("");
      setNewEndpointDescription("");
      setNewEndpointEvents(DEFAULT_EVENTS);
      setNewEndpointEventMode("filtered");
      await fetchEndpoints();
    } catch (err) {
      console.error("Failed to create webhook endpoint:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleSaveEndpoint = async (
    endpointId: string,
    data: Record<string, unknown>,
  ) => {
    if (!merchantId) return;
    setSaving(true);
    try {
      await api.patch(
        `/v1/merchants/${merchantId}/webhooks/endpoints/${endpointId}`,
        data,
      );
      await fetchEndpoints();
    } catch (err) {
      console.error("Failed to save webhook endpoint:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEndpoint = async () => {
    if (!merchantId || !deleteTarget) return;
    setDeleting(deleteTarget.id);
    try {
      await api.delete(
        `/v1/merchants/${merchantId}/webhooks/endpoints/${deleteTarget.id}`,
      );
      setIsDeleteDialogOpen(false);
      setDeleteTarget(null);
      await fetchEndpoints();
    } catch (err) {
      console.error("Failed to delete webhook endpoint:", err);
    } finally {
      setDeleting(null);
    }
  };

  const handleTestEndpoint = async (endpointId: string) => {
    if (!merchantId) return;
    setTesting(endpointId);
    try {
      await api.post(
        `/v1/merchants/${merchantId}/webhooks/endpoints/${endpointId}/test`,
      );
    } catch (err) {
      console.error("Failed to test webhook endpoint:", err);
    } finally {
      setTesting(null);
    }
  };

  return {
    endpoints,
    loading,
    copied,
    creating,
    saving,
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
    fetchEndpoints,
  };
}
