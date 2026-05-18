import {
  Sparkles,
  Receipt,
  TrendingUp,
  ShieldCheck,
  Check,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface HowItWorksProps {
  feeRate: number;
  currentPlan?: string;
  onPlanUpdate?: (plan: "starter" | "professional" | "enterprise") => void;
}

export function HowItWorks({
  currentPlan = "starter",
  onPlanUpdate,
}: HowItWorksProps) {
  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="text-primary size-4" />
          <CardTitle className="text-[10px] font-bold tracking-wider uppercase">
            How Billing Works
          </CardTitle>
        </div>
        <CardDescription className="text-xs">
          KnotEngine uses a prepaid credit system to keep your business running
          smoothly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              step: "01",
              title: "Welcome Credit",
              description:
                "New merchants start with $5.00 in free credit — enough to process your first $500 in sales.",
              icon: Sparkles,
              color: "text-emerald-500",
            },
            {
              step: "02",
              title: "Auto-Deduction",
              description: `Platform fees are deducted automatically from your credit balance upon payment confirmation.`,
              icon: Receipt,
              color: "text-blue-500",
            },
            {
              step: "03",
              title: "Stablecoin Top Up",
              description:
                "Top up using USDT or USDC via Ethereum or Polygon. Credits are added 1:1 to your USD balance and deployed to yield pools.",
              icon: TrendingUp,
              color: "text-purple-500",
            },
            {
              step: "04",
              title: "Non-Custodial",
              description:
                "We never touch your revenue. 100% of customer payments go directly to your wallet.",
              icon: ShieldCheck,
              color: "text-amber-500",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="border-border/30 bg-muted/20 flex flex-col gap-2 rounded-xl border p-4"
            >
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground/40 text-[10px] font-bold">
                  {item.step}
                </span>
                <item.icon className={cn("size-3.5", item.color)} />
              </div>
              <p className="text-foreground text-[10px] font-bold tracking-wider uppercase">
                {item.title}
              </p>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        <div className="border-border/40 border-t pt-4">
          <p className="text-muted-foreground mb-4 text-[10px] font-bold tracking-wider uppercase">
            Available Plans
          </p>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {[
              {
                name: "Starter",
                fee: "1.0%",
                cost: "$0/mo",
                description: "Perfect for getting started",
                features: [
                  "1.0% transaction fee",
                  "Non-custodial settlements",
                  "Basic dashboard analytics",
                  "Webhook notifications",
                  "$5 free welcome credit",
                ],
              },
              {
                name: "Professional",
                fee: "0.5%",
                cost: "$39/mo",
                description: "Best for growing businesses",
                features: [
                  "0.5% transaction fee",
                  "Everything in Starter",
                  "Priority webhook delivery",
                  "Advanced analytics & CSV export",
                  "Custom checkout themes",
                ],
                popular: true,
              },
              {
                name: "Enterprise",
                fee: "0.25%",
                cost: "$149/mo",
                description: "For high-volume merchants",
                features: [
                  "0.25% transaction fee",
                  "Everything in Professional",
                  "Dedicated infrastructure",
                  'Remove "Powered by" branding',
                  "SSO for teams",
                  "99.9% SLA guarantee",
                  "Dedicated account manager",
                ],
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  "relative flex flex-col rounded-xl border p-4 transition-all",
                  plan.popular
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border/60 bg-muted/10",
                )}
              >
                {plan.popular && (
                  <span className="bg-primary text-primary-foreground absolute -top-2 left-4 rounded px-2 py-0.5 text-[8px] font-black uppercase">
                    Most Popular
                  </span>
                )}
                <div className="mb-1 flex items-start justify-between">
                  <p className="text-xs font-bold">{plan.name}</p>
                  <p className="text-primary text-xs font-black">{plan.fee}</p>
                </div>
                <p className="text-muted-foreground mb-1 text-[10px]">
                  {plan.cost}
                </p>
                <p className="text-muted-foreground/70 mb-3 text-[9px]">
                  {plan.description}
                </p>
                <ul className="mb-4 flex-1 space-y-1">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="text-muted-foreground flex items-center gap-1.5 text-[9px]"
                    >
                      <Check className="text-primary size-2.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() =>
                    onPlanUpdate?.(
                      plan.name.toLowerCase() as
                        | "starter"
                        | "professional"
                        | "enterprise",
                    )
                  }
                  disabled={currentPlan === plan.name.toLowerCase()}
                  className={cn(
                    "w-full py-1.5 text-[9px] font-black tracking-widest uppercase transition-all",
                    currentPlan === plan.name.toLowerCase()
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-primary text-primary-foreground shadow-sm hover:opacity-90 active:scale-95",
                  )}
                >
                  {currentPlan === plan.name.toLowerCase()
                    ? "Active Plan"
                    : "Select Plan"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-4 pt-0">
        <div className="text-muted-foreground bg-muted/30 border-border/40 flex w-full items-center gap-2 rounded-lg border p-2 text-[10px]">
          <TrendingUp className="text-primary size-3.5 shrink-0" />
          <span>
            <strong>The Float Strategy:</strong> Fee credits are held in
            yield-bearing protocols (Aave/Lido). We keep the yield to keep your
            fees low.
          </span>
        </div>
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <ShieldCheck className="size-3.5 shrink-0 text-emerald-500" />
          <span>
            Zero-custody guarantee — KnotEngine never holds or routes your
            customer funds.
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
