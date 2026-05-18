"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api";

type ApiKey = {
  id: string;
  keyId: string;
  label: string;
  scope: string;
  lastFour: string;
  lastUsedAt?: string;
  lastUsedIp?: string;
  requestCount: number;
  createdAt: string;
};

export function useApiKeys() {
  const { data: session } = useSession();
  const merchantId = (session?.user as { merchantId?: string })?.merchantId;
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [newKey, setNewKey] = useState<{
    secretKey: string;
    label: string;
  } | null>(null);
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [newKeyScope, setNewKeyScope] = useState("full_access");
  const [selectedIntegrationLanguage, setSelectedIntegrationLanguage] =
    useState("nodejs");

  const fetchKeys = async () => {
    if (!merchantId) return;
    try {
      const res = await api.get(`/v1/merchants/${merchantId}/keys`);
      setKeys(res.data.keys || []);
    } catch (err) {
      console.error("Failed to fetch API keys:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, [merchantId]);

  const copyToClipboard = (text: string, id?: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id || "generic");
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCreateKey = async () => {
    if (!merchantId) return;
    setCreating(true);
    try {
      const res = await api.post(`/v1/merchants/${merchantId}/keys`, {
        label: newKeyLabel || undefined,
        scope: newKeyScope,
      });
      setNewKey({
        secretKey: res.data.key.secretKey,
        label: res.data.key.label,
      });
      setIsCreateDialogOpen(false);
      setNewKeyLabel("");
      setNewKeyScope("full_access");
      await fetchKeys();
    } catch (err) {
      console.error("Failed to create API key:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async () => {
    if (!merchantId || !revokeTarget) return;
    setRevoking(revokeTarget.id);
    try {
      await api.post(
        `/v1/merchants/${merchantId}/keys/${revokeTarget.id}/revoke`,
      );
      setIsRevokeDialogOpen(false);
      setRevokeTarget(null);
      await fetchKeys();
    } catch (err) {
      console.error("Failed to revoke API key:", err);
    } finally {
      setRevoking(null);
    }
  };

  return {
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
    fetchKeys,
  };
}
