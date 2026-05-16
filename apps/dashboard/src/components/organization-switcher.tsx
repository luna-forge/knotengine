"use client";

import * as React from "react";
import { Check, ChevronsUpDown, PlusCircle, Building2 } from "lucide-react";
import { useSession } from "next-auth/react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { setActiveOrganization } from "@/actions/organization";

const ORG_STORAGE_KEY = "knotengine-active-org";

export interface Organization {
  organizationId: string;
  name: string;
  slug?: string;
  logoUrl?: string;
  plan: string;
  role: string;
}

export function useActiveOrganization() {
  const [activeOrg, setActiveOrg] = React.useState<Organization | null>(null);
  const [organizations, setOrganizations] = React.useState<Organization[]>([]);
  const { data: session } = useSession();

  React.useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const res = await fetch("/api/v1/organizations");
        if (res.ok) {
          const data = await res.json();
          setOrganizations(data.organizations || []);
        }
      } catch (err) {
        console.error("Failed to fetch organizations", err);
      }
    };
    if (session?.user) fetchOrgs();
  }, [session?.user]);

  React.useEffect(() => {
    const stored = localStorage.getItem(ORG_STORAGE_KEY);
    if (stored && organizations.length > 0) {
      const found = organizations.find((o) => o.organizationId === stored);
      if (found) {
        setActiveOrg(found);
        return;
      }
    }
    if (organizations.length > 0 && !activeOrg) {
      setActiveOrg(organizations[0]);
      localStorage.setItem(ORG_STORAGE_KEY, organizations[0].organizationId);
    }
  }, [organizations]);

  const switchOrganization = async (org: Organization) => {
    setActiveOrg(org);
    localStorage.setItem(ORG_STORAGE_KEY, org.organizationId);
    await setActiveOrganization(org.organizationId);
  };

  return { activeOrg, organizations, switchOrganization };
}

export function OrganizationSwitcher() {
  const { activeOrg, organizations, switchOrganization } =
    useActiveOrganization();
  const [showNewOrgDialog, setShowNewOrgDialog] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [newOrgName, setNewOrgName] = React.useState("");
  const [newOrgSlug, setNewOrgSlug] = React.useState("");

  const displayOrg = activeOrg || {
    name: "Select Organization",
    logoUrl: undefined,
    role: undefined,
  };

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newOrgName,
          slug: newOrgSlug || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        switchOrganization({
          ...data.organization,
          role: "owner",
        });
        setShowNewOrgDialog(false);
        setNewOrgName("");
        setNewOrgSlug("");
        window.location.reload();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={showNewOrgDialog}
      onOpenChange={(open) => {
        setShowNewOrgDialog(open);
        if (!open) {
          setNewOrgName("");
          setNewOrgSlug("");
        }
      }}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            size="lg"
            className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          >
            <Avatar className="size-8 shrink-0 rounded-md border border-white/10">
              <AvatarImage
                src={displayOrg.logoUrl}
                alt={displayOrg.name}
                className="object-cover"
              />
              <AvatarFallback className="bg-primary text-primary-foreground rounded-md text-xs font-bold shadow-sm">
                {displayOrg.name?.[0]?.toUpperCase() || (
                  <Building2 className="size-4 fill-current" />
                )}
              </AvatarFallback>
            </Avatar>
            <div className="ml-3 flex flex-1 flex-col gap-0.5 overflow-hidden text-left group-data-[collapsible=icon]:hidden">
              <span className="text-foreground truncate text-sm leading-none font-bold tracking-tight">
                {displayOrg.name || "Untitled Organization"}
              </span>
              <span className="text-muted-foreground/60 mt-0.5 truncate text-[10px] leading-none font-bold tracking-widest uppercase">
                {displayOrg.role || "Member"}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50 group-data-[collapsible=icon]:hidden" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
          align="start"
          side="bottom"
          sideOffset={4}
        >
          <DropdownMenuLabel className="text-muted-foreground px-2 py-1.5 text-xs font-bold tracking-widest uppercase">
            Organizations
          </DropdownMenuLabel>
          {organizations.map((org) => (
            <DropdownMenuItem
              key={org.organizationId}
              onSelect={() => switchOrganization(org)}
              className="cursor-pointer gap-2 p-2 text-sm font-medium"
            >
              <Avatar className="size-6 shrink-0 rounded-sm border">
                <AvatarImage
                  src={org.logoUrl}
                  alt={org.name}
                  className="object-cover"
                />
                <AvatarFallback className="bg-muted text-[10px] font-bold">
                  {org.name?.[0]?.toUpperCase() || (
                    <Building2 className="size-3" />
                  )}
                </AvatarFallback>
              </Avatar>
              {org.name || "Untitled Organization"}
              {org.organizationId === activeOrg?.organizationId && (
                <Check className="ml-auto size-4" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer gap-2 p-2 text-sm font-medium"
            onSelect={() => setShowNewOrgDialog(true)}
          >
            <div className="bg-background flex size-6 items-center justify-center rounded-md border">
              <PlusCircle className="size-4" />
            </div>
            Create Organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
          <DialogDescription>
            Create a new workspace to manage merchants and team members.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2 pb-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              placeholder="Acme Inc"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-slug">Slug (optional)</Label>
            <Input
              id="org-slug"
              placeholder="acme"
              value={newOrgSlug}
              onChange={(e) => setNewOrgSlug(e.target.value.toLowerCase())}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowNewOrgDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateOrg}
            disabled={isLoading || !newOrgName.trim()}
          >
            {isLoading ? "Creating..." : "Create Organization"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
