"use client";

import * as React from "react";
import {
  Check,
  ChevronsUpDown,
  PlusCircle,
  Store,
  Camera,
  Star,
} from "lucide-react";
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
import { createMerchant } from "@/actions/merchant";
import { uploadLogo } from "@/actions/upload";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type MerchantWithRole = {
  id: string;
  name: string;
  logoUrl?: string;
  role?: string;
  isDefault?: boolean;
};

export function MerchantSwitcher() {
  const { data: session, update } = useSession();
  const [showNewMerchantDialog, setShowNewMerchantDialog] =
    React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [newMerchantName, setNewMerchantName] = React.useState("");
  const [logoBase64, setLogoBase64] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [detailedMerchants, setDetailedMerchants] = React.useState<
    MerchantWithRole[]
  >([]);

  const sessionMerchants =
    (session?.user as { merchants?: MerchantWithRole[] })?.merchants || [];
  const activeMerchantId = (session?.user as { merchantId?: string })
    ?.merchantId;

  React.useEffect(() => {
    const fetchMerchants = async () => {
      try {
        const res = await fetch("/api/v1/merchants");
        if (res.ok) {
          const data = await res.json();
          setDetailedMerchants(data);
        }
      } catch (err) {
        console.error("Failed to fetch merchants with logos", err);
      }
    };
    if (session?.user) fetchMerchants();
  }, [session?.user]);

  const merchants =
    detailedMerchants.length > 0 ? detailedMerchants : sessionMerchants;

  const activeMerchant = merchants.find((m) => m.id === activeMerchantId) ||
    merchants[0] || { name: "Select Merchant", id: "" };

  const handleCreateMerchant = async () => {
    if (!newMerchantName.trim()) return;

    setIsLoading(true);
    try {
      let logoUrl: string | undefined;

      if (logoBase64) {
        logoUrl = await uploadLogo(logoBase64);
      }

      const newMerchantData = await createMerchant(newMerchantName, logoUrl);
      await update({ merchantId: newMerchantData.id });
      window.location.reload();
      setShowNewMerchantDialog(false);
      setNewMerchantName("");
      setLogoBase64("");
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMerchantSwitch = async (merchantId: string) => {
    await update({ merchantId });
    window.location.reload();
  };

  const handleSetDefault = async (merchantId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const res = await fetch("/api/v1/merchants/team/default", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId }),
      });
      if (res.ok) {
        toast.success("Default merchant updated");
      }
    } catch {
      toast.error("Failed to update default merchant");
    }
  };

  const activeMerchantRole = activeMerchant.role || "owner";

  return (
    <Dialog
      open={showNewMerchantDialog}
      onOpenChange={(open) => {
        setShowNewMerchantDialog(open);
        if (!open) {
          setLogoBase64("");
          setNewMerchantName("");
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
                src={activeMerchant.logoUrl}
                alt={activeMerchant.name}
                className="object-cover"
              />
              <AvatarFallback className="bg-primary text-primary-foreground rounded-md text-xs font-bold shadow-sm">
                {activeMerchant.name?.[0]?.toUpperCase() || (
                  <Store className="size-4 fill-current" />
                )}
              </AvatarFallback>
            </Avatar>
            <div className="ml-3 flex flex-1 flex-col gap-0.5 overflow-hidden text-left group-data-[collapsible=icon]:hidden">
              <span className="text-foreground truncate text-sm leading-none font-bold tracking-tight">
                {activeMerchant.name || "Untitled Merchant"}
              </span>
              <span className="text-muted-foreground/60 mt-0.5 truncate text-[10px] leading-none font-bold tracking-widest uppercase">
                {activeMerchantRole}
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
            Merchants
          </DropdownMenuLabel>
          {merchants.map((merchant) => (
            <div key={merchant.id}>
              <DropdownMenuItem
                onSelect={() => handleMerchantSwitch(merchant.id)}
                className="cursor-pointer gap-2 p-2 text-sm font-medium"
              >
                <Avatar className="size-6 shrink-0 rounded-sm border">
                  <AvatarImage
                    src={merchant.logoUrl}
                    alt={merchant.name}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-muted text-[10px] font-bold">
                    {merchant.name?.[0]?.toUpperCase() || (
                      <Store className="size-3" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-1 items-center gap-2">
                  <span className="truncate">
                    {merchant.name || "Untitled Merchant"}
                  </span>
                  {merchant.role && (
                    <Badge
                      variant="outline"
                      className="px-1 py-0 text-[10px] capitalize"
                    >
                      {merchant.role}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {merchant.isDefault && (
                    <Star className="size-3 fill-amber-500 text-amber-500" />
                  )}
                  {merchant.id === activeMerchantId && (
                    <Check className="size-4" />
                  )}
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                onClick={(e) => handleSetDefault(merchant.id, e)}
                className="text-muted-foreground hover:text-foreground cursor-pointer gap-2 px-6 py-1.5 text-xs"
              >
                <Star
                  className={`size-3 ${merchant.isDefault ? "fill-amber-500 text-amber-500" : ""}`}
                />
                {merchant.isDefault ? "Default merchant" : "Set as default"}
              </DropdownMenuItem>
            </div>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer gap-2 p-2 text-sm font-medium"
            onSelect={() => setShowNewMerchantDialog(true)}
          >
            <div className="bg-background flex size-6 items-center justify-center rounded-md border">
              <PlusCircle className="size-4" />
            </div>
            Create Merchant
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Merchant</DialogTitle>
          <DialogDescription>
            Add a new merchant to manage separate billing and settings.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2 pb-4">
          <div className="flex flex-col items-center justify-center gap-4 py-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group relative cursor-pointer"
            >
              <Avatar className="border-border/40 group-hover:border-primary/40 h-20 w-20 border-2 transition-all duration-200">
                <AvatarImage src={logoBase64} className="object-cover" />
                <AvatarFallback className="bg-muted">
                  <Camera className="text-muted-foreground size-6" />
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-all duration-200 group-hover:opacity-100">
                <PlusCircle className="size-5 text-white" />
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
            <p className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
              Merchant Logo
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Merchant Name</Label>
            <Input
              id="name"
              placeholder="My New Merchant"
              value={newMerchantName}
              onChange={(e) => setNewMerchantName(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowNewMerchantDialog(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateMerchant}
            disabled={isLoading || !newMerchantName.trim()}
          >
            {isLoading ? "Creating..." : "Create Merchant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
