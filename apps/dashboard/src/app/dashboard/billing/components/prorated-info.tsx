"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";

interface ProratedInfoProps {
  isProrated: boolean;
  proratedAmount?: number;
  daysRemaining?: number;
  planName: string;
}

export function ProratedInfo({
  isProrated,
  proratedAmount,
  daysRemaining,
  planName,
}: ProratedInfoProps) {
  if (!isProrated || !proratedAmount) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <Calendar className="text-primary mt-0.5 size-4 shrink-0" />
          <div className="text-xs">
            <h4 className="text-primary font-semibold">Prorated Pricing</h4>
            <p className="text-muted-foreground mt-1">
              Activating {planName} plan mid-month:{" "}
              <span className="font-medium">${proratedAmount.toFixed(2)}</span>
              {daysRemaining && <> for {daysRemaining} days</>}
            </p>
            <p className="text-muted-foreground mt-1">
              Full billing ($39/mo) starts next month on the 1st.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
