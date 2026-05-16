"use client";

import * as React from "react";
import { Mail, Trash2, UserPlus, Users } from "lucide-react";

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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActiveOrganization } from "@/components/organization-switcher";

interface Member {
  id: string;
  user: { email: string; oauthId: string };
  role: string;
  invitedAt: string;
  acceptedAt?: string;
}

export default function TeamPage() {
  const { activeOrg } = useActiveOrganization();
  const [members, setMembers] = React.useState<Member[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showInviteDialog, setShowInviteDialog] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState("member");

  const fetchMembers = React.useCallback(async () => {
    if (!activeOrg) return;
    try {
      const res = await fetch(
        `/api/v1/organizations/${activeOrg.organizationId}/members`,
      );
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error("Failed to fetch members", err);
    }
  }, [activeOrg]);

  React.useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleInvite = async () => {
    if (!activeOrg || !inviteEmail) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/v1/organizations/${activeOrg.organizationId}/members/invite`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
        },
      );
      if (res.ok) {
        setShowInviteDialog(false);
        setInviteEmail("");
        setInviteRole("member");
        fetchMembers();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!activeOrg) return;
    try {
      const res = await fetch(
        `/api/v1/organizations/${activeOrg.organizationId}/members/${memberId}`,
        {
          method: "DELETE",
        },
      );
      if (res.ok) {
        fetchMembers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const roleBadgeColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-purple-500/15 text-purple-500";
      case "admin":
        return "bg-blue-500/15 text-blue-500";
      case "member":
        return "bg-green-500/15 text-green-500";
      case "viewer":
        return "bg-gray-500/15 text-gray-500";
      default:
        return "bg-gray-500/15 text-gray-500";
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Members</h1>
          <p className="text-muted-foreground mt-1">
            Manage who has access to {activeOrg.name}
          </p>
        </div>
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 size-4" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to join {activeOrg.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="teammate@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowInviteDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleInvite}
                disabled={isLoading || !inviteEmail}
              >
                {isLoading ? "Sending..." : "Send Invitation"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5" />
            Members ({members.length})
          </CardTitle>
          <CardDescription>
            People who have access to this organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="size-10">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                      {member.user.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {member.user.email || "Unknown"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {member.acceptedAt
                        ? "Active member"
                        : "Invitation pending"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={roleBadgeColor(member.role)}>
                    {member.role}
                  </Badge>
                  {member.role !== "owner" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(member.id)}
                    >
                      <Trash2 className="text-muted-foreground size-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {members.length === 0 && (
              <div className="py-12 text-center">
                <Mail className="text-muted-foreground/40 mx-auto mb-4 size-12" />
                <p className="text-muted-foreground mb-2">
                  No team members yet
                </p>
                <p className="text-muted-foreground/60 text-sm">
                  Invite your team to collaborate on this organization
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
