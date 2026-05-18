"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  MoreHorizontal,
  Shield,
  Trash2,
  UserPlus,
  History,
  ArrowRightLeft,
  LogOut,
  AlertTriangle,
  Clock,
  RefreshCw,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type RoleHistoryEntry = {
  from: string;
  to: string;
  changedBy: string;
  changedAt: string;
  reason?: string;
};

type Member = {
  id: string;
  userId: string | null;
  email: string;
  role: "owner" | "admin" | "developer" | "viewer" | "billing";
  accepted: boolean;
  invitedAt: string;
  acceptedAt?: string;
  roleHistory: RoleHistoryEntry[];
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  developer: "Developer",
  viewer: "Viewer",
  billing: "Billing",
};

const ROLE_COLORS: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  owner: "default",
  admin: "secondary",
  developer: "outline",
  viewer: "outline",
  billing: "secondary",
};

export default function TeamMembersPage() {
  const { data: session } = useSession();
  const merchantId = (session?.user as { merchantId?: string })?.merchantId;
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<
    "admin" | "developer" | "viewer" | "billing"
  >("viewer");
  const [inviting, setInviting] = useState(false);
  const [historyMember, setHistoryMember] = useState<Member | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [roleChangeReason, setRoleChangeReason] = useState("");
  const [roleChangeMember, setRoleChangeMember] = useState<string | null>(null);

  const currentMember = members.find(
    (m) => m.email === (session?.user as { email?: string })?.email,
  );
  const isOwner = currentMember?.role === "owner";

  const fetchMembers = async () => {
    if (!merchantId) return;
    try {
      const res = await fetch(`/api/v1/merchants/${merchantId}/team`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [merchantId]);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !merchantId) return;
    setInviting(true);
    try {
      const res = await fetch(`/api/v1/merchants/${merchantId}/team/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchMembers();
        setInviteOpen(false);
        setInviteEmail("");
        toast.success(data.message || `Invite sent to ${inviteEmail}`);
      } else {
        toast.error(data.error || "Failed to send invite");
      }
    } catch {
      toast.error("Failed to send invite");
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (
    memberId: string,
    role: "admin" | "developer" | "viewer" | "billing",
  ) => {
    if (!merchantId) return;
    try {
      const res = await fetch(
        `/api/v1/merchants/${merchantId}/team/${memberId}/role`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role, reason: roleChangeReason || undefined }),
        },
      );
      if (res.ok) {
        await fetchMembers();
        setRoleChangeMember(null);
        setRoleChangeReason("");
        toast.success("Role updated");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update role");
      }
    } catch {
      toast.error("Failed to update role");
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!merchantId) return;
    try {
      const res = await fetch(
        `/api/v1/merchants/${merchantId}/team/${memberId}`,
        {
          method: "DELETE",
        },
      );
      const data = await res.json();
      if (res.ok) {
        await fetchMembers();
        toast.success("Member removed");
      } else {
        toast.error(data.error || "Failed to remove member");
      }
    } catch {
      toast.error("Failed to remove member");
    }
  };

  const handleTransferOwnership = async () => {
    if (!merchantId || !transferTarget) return;
    setTransferring(true);
    try {
      const res = await fetch(
        `/api/v1/merchants/${merchantId}/team/transfer-ownership`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newOwnerId: transferTarget,
            reason: transferReason || undefined,
          }),
        },
      );
      const data = await res.json();
      if (res.ok) {
        await fetchMembers();
        setTransferOpen(false);
        setTransferTarget("");
        setTransferReason("");
        toast.success(data.message || "Ownership transferred");
      } else {
        toast.error(data.error || "Failed to transfer ownership");
      }
    } catch {
      toast.error("Failed to transfer ownership");
    } finally {
      setTransferring(false);
    }
  };

  const handleLeaveMerchant = async () => {
    if (!merchantId) return;
    setLeaving(true);
    try {
      const res = await fetch(`/api/v1/merchants/${merchantId}/team/leave`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "You have left the merchant");
        window.location.href = "/dashboard";
      } else {
        toast.error(data.error || "Failed to leave merchant");
      }
    } catch {
      toast.error("Failed to leave merchant");
    } finally {
      setLeaving(false);
      setLeaveConfirmOpen(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!merchantId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">No merchant selected</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Team Members</h2>
          <p className="text-muted-foreground">
            Manage who has access to this merchant.
          </p>
        </div>
        <div className="flex gap-2">
          {isOwner && (
            <Button variant="outline" onClick={() => setLeaveConfirmOpen(true)}>
              <LogOut className="mr-2 size-4" />
              Leave Merchant
            </Button>
          )}
          {(isOwner || currentMember?.role === "admin") && (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-2 size-4" />
              Invite Member
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            People who have access to this merchant account.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-muted-foreground py-8 text-center">
              Loading members...
            </div>
          ) : members.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              No members yet. Invite your team to get started.
            </div>
          ) : (
            <div className="divide-y">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9">
                      <AvatarFallback className="bg-muted text-sm font-medium">
                        {member.email?.[0]?.toUpperCase() || (
                          <Shield className="size-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{member.email}</p>
                        {!member.accepted && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="mr-1 size-3" />
                            Pending
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {member.accepted
                          ? `Joined ${formatDate(member.acceptedAt)}`
                          : `Invited ${formatDate(member.invitedAt)}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={ROLE_COLORS[member.role] || "outline"}
                      className="capitalize"
                    >
                      {ROLE_LABELS[member.role] || member.role}
                    </Badge>

                    {member.role !== "owner" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setHistoryMember(member)}
                          >
                            <History className="mr-2 size-4" />
                            View Role History
                          </DropdownMenuItem>
                          {(isOwner || currentMember?.role === "admin") && (
                            <>
                              <Separator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setRoleChangeMember(member.id);
                                  setRoleChangeReason("");
                                }}
                              >
                                <ArrowRightLeft className="mr-2 size-4" />
                                Change Role
                              </DropdownMenuItem>
                              {isOwner && (
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleRemove(member.id)}
                                >
                                  <Trash2 className="mr-2 size-4" />
                                  Remove
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    {member.role === "owner" && isOwner && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setHistoryMember(member)}
                          >
                            <History className="mr-2 size-4" />
                            View Role History
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join this merchant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(v) =>
                  setInviteRole(
                    v as "admin" | "developer" | "viewer" | "billing",
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="developer">Developer</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Admins and owners can invite. Billing can manage payments only.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
            >
              {inviting ? "Sending..." : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Change Dialog */}
      <Dialog
        open={!!roleChangeMember}
        onOpenChange={(open) => {
          if (!open) {
            setRoleChangeMember(null);
            setRoleChangeReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Update this member&apos;s access level.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea
                placeholder="Why is this role changing?"
                value={roleChangeReason}
                onChange={(e) => setRoleChangeReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRoleChangeMember(null);
                setRoleChangeReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                roleChangeMember && handleRoleChange(roleChangeMember, "admin")
              }
            >
              Admin
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                roleChangeMember &&
                handleRoleChange(roleChangeMember, "developer")
              }
            >
              Developer
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                roleChangeMember &&
                handleRoleChange(roleChangeMember, "billing")
              }
            >
              Billing
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                roleChangeMember && handleRoleChange(roleChangeMember, "viewer")
              }
            >
              Viewer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role History Dialog */}
      <Dialog
        open={!!historyMember}
        onOpenChange={(open) => !open && setHistoryMember(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Role History</DialogTitle>
            <DialogDescription>
              {historyMember?.email}&apos;s role changes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!historyMember?.roleHistory ||
            historyMember.roleHistory.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center">
                No role changes recorded.
              </p>
            ) : (
              <div className="space-y-3">
                {historyMember.roleHistory.map((entry, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <RefreshCw className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs capitalize">
                          {entry.from}
                        </Badge>
                        <ArrowRightLeft className="text-muted-foreground size-3" />
                        <Badge variant="default" className="text-xs capitalize">
                          {entry.to}
                        </Badge>
                      </div>
                      {entry.reason && (
                        <p className="text-muted-foreground mt-1 text-xs">
                          {entry.reason}
                        </p>
                      )}
                      <p className="text-muted-foreground mt-1 text-xs">
                        {formatDate(entry.changedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Ownership Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              Transfer Ownership
            </DialogTitle>
            <DialogDescription>
              This action is irreversible. You will become an admin after
              transfer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>New Owner</Label>
              <Select value={transferTarget} onValueChange={setTransferTarget}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a member" />
                </SelectTrigger>
                <SelectContent>
                  {members
                    .filter((m) => m.accepted && m.id !== currentMember?.id)
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.email} ({ROLE_LABELS[m.role]})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea
                placeholder="Why are you transferring ownership?"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleTransferOwnership}
              disabled={transferring || !transferTarget}
            >
              {transferring ? "Transferring..." : "Transfer Ownership"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Merchant Confirmation */}
      <Dialog open={leaveConfirmOpen} onOpenChange={setLeaveConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              Leave Merchant
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to leave this merchant? You will lose access
              to all data and settings.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLeaveConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleLeaveMerchant}
              disabled={leaving}
            >
              {leaving ? "Leaving..." : "Leave Merchant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
