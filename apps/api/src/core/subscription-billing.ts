import { Organization, IOrganization } from "@qodinger/knot-database";
import { NotificationService } from "../infra/notification-service.js";

/**
 * 🔄 Subscription Billing Engine
 *
 * Handles automated monthly subscription charging for merchants on paid plans.
 * Runs via cron job on the 1st of each month.
 */
export class SubscriptionBilling {
  private static instance: SubscriptionBilling;

  public static getInstance(): SubscriptionBilling {
    if (!SubscriptionBilling.instance) {
      SubscriptionBilling.instance = new SubscriptionBilling();
    }
    return SubscriptionBilling.instance;
  }

  /**
   * Process monthly subscription billing for all organizations
   */
  public async processMonthlyBilling(): Promise<{
    processed: number;
    successful: number;
    failed: number;
    downgraded: number;
    revenue: number;
  }> {
    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      downgraded: 0,
      revenue: 0,
    };

    console.log("🔄 Starting monthly subscription billing...");

    try {
      // Get all organizations on paid plans
      const paidOrgs = await Organization.find({
        plan: { $in: ["professional", "enterprise"] },
        deletedAt: { $exists: false },
      });

      console.log(`📊 Found ${paidOrgs.length} organizations on paid plans`);

      for (const org of paidOrgs) {
        results.processed++;

        try {
          const billingResult = await this.processOrgBilling(org);

          if (billingResult.success) {
            results.successful++;
            results.revenue += billingResult.charged;
          } else {
            if (billingResult.downgraded) {
              results.downgraded++;
            } else {
              results.failed++;
            }
          }

          // Add small delay to avoid overwhelming the database
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.error(
            `❌ Billing failed for org ${org.organizationId}:`,
            error,
          );
          results.failed++;
        }
      }

      console.log("✅ Monthly billing complete:", {
        processed: results.processed,
        successful: results.successful,
        failed: results.failed,
        downgraded: results.downgraded,
        revenue: `$${results.revenue.toFixed(2)}`,
      });

      return results;
    } catch (error) {
      console.error("❌ Monthly billing process failed:", error);
      throw error;
    }
  }

  /**
   * Process billing for a single organization
   */
  private async processOrgBilling(org: IOrganization): Promise<{
    success: boolean;
    charged: number;
    downgraded: boolean;
    reason?: string;
    daysRemaining?: number;
  }> {
    const planCosts = {
      professional: 39,
      enterprise: 149,
    };

    const plan = org.plan as "professional" | "enterprise";
    const cost = planCosts[plan];

    // Check if org has sufficient balance
    if (org.creditBalance < cost) {
      console.log(
        `💸 Insufficient balance for ${org.organizationId} (${plan}) - checking grace period`,
      );

      // Check if already in grace period
      const gracePeriodDays = 7; // 7 days grace period

      // First time insufficient balance - start grace period and send warning
      if (!org.gracePeriodStarted) {
        console.log(
          `⏰ Starting grace period for ${org.organizationId} - ${gracePeriodDays} days until downgrade`,
        );

        await Organization.findByIdAndUpdate(org._id, {
          $set: {
            gracePeriodStarted: new Date(),
            gracePeriodEnds: new Date(
              Date.now() + gracePeriodDays * 24 * 60 * 60 * 1000,
            ),
          },
        });

        // Send initial warning to all org members
        await NotificationService.createOrgNotification({
          organizationId: org._id.toString(),
          title: "Payment Required - Grace Period Started",
          description: `Insufficient balance for ${plan} plan. You have ${gracePeriodDays} days to top up before automatic downgrade to Starter plan.`,
          type: "warning",
          link: "/dashboard/billing",
        });

        return {
          success: false,
          charged: 0,
          downgraded: false,
          reason: "Grace period started",
        };
      }

      // Check if grace period has expired
      const gracePeriodEnds = org.gracePeriodEnds;
      if (gracePeriodEnds && new Date() < gracePeriodEnds) {
        const daysRemaining = Math.ceil(
          (gracePeriodEnds.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );

        console.log(
          `⏳ Grace period active for ${org.organizationId} - ${daysRemaining} days remaining`,
        );

        // Send reminder if 3 days or less remaining
        if (daysRemaining <= 3) {
          await NotificationService.createOrgNotification({
            organizationId: org._id.toString(),
            title: `Payment Required - ${daysRemaining} days remaining`,
            description: `Your ${plan} plan will be downgraded to Starter in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} due to insufficient balance.`,
            type: "warning",
            link: "/dashboard/billing",
          });
        }

        return {
          success: false,
          charged: 0,
          downgraded: false,
          reason: "Grace period active",
          daysRemaining,
        };
      }

      // Grace period expired - downgrade now
      console.log(
        `⏰ Grace period expired for ${org.organizationId} - downgrading to starter`,
      );

      await Organization.findByIdAndUpdate(org._id, {
        $set: {
          plan: "starter",
          planStartedAt: new Date(),
          gracePeriodStarted: null,
          gracePeriodEnds: null,
        },
      });

      // Send final notification
      await NotificationService.createOrgNotification({
        organizationId: org._id.toString(),
        title: "Plan Downgraded - Grace Period Expired",
        description: `Grace period expired. Downgraded to Starter plan due to insufficient balance. Top up to upgrade again.`,
        type: "error",
        link: "/dashboard/billing",
      });

      return {
        success: false,
        charged: 0,
        downgraded: true,
        reason: "Insufficient balance",
      };
    }

    // Charge the subscription fee
    await Organization.findByIdAndUpdate(org._id, {
      $inc: { creditBalance: -cost },
      $set: { planStartedAt: new Date() },
    });

    // Send success notification
    await NotificationService.createOrgNotification({
      organizationId: org._id.toString(),
      title: "Subscription Renewed",
      description: `Your ${plan} plan has been renewed for $${cost.toFixed(2)}.`,
      type: "success",
      link: "/dashboard/billing",
    });

    console.log(
      `💳 Charged ${org.organizationId} $${cost.toFixed(2)} for ${plan} plan`,
    );

    return {
      success: true,
      charged: cost,
      downgraded: false,
    };
  }

  /**
   * Get billing status for an organization
   */
  public async getOrgBillingStatus(organizationId: string): Promise<{
    plan: string;
    planStartedAt: Date;
    nextBillingDate: Date;
    monthlyCost: number;
    daysUntilBilling: number;
    isProratedThisMonth?: boolean;
    proratedAmount?: number;
  }> {
    const org = await Organization.findById(organizationId);

    if (!org) {
      throw new Error("Organization not found");
    }

    const planCosts = {
      starter: 0,
      professional: 39,
      enterprise: 149,
    };

    const planStartedAt = org.planStartedAt || new Date();
    const nextBillingDate = new Date();
    nextBillingDate.setDate(1); // Always bill on the 1st
    if (nextBillingDate <= new Date()) {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    }

    const daysUntilBilling = Math.ceil(
      (nextBillingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    // Check if this month was prorated
    const isProratedThisMonth = !!(
      org.lastProratedDate &&
      org.lastProratedDate.getMonth() === new Date().getMonth() &&
      org.lastProratedDate.getFullYear() === new Date().getFullYear()
    );

    return {
      plan: org.plan,
      planStartedAt,
      nextBillingDate,
      monthlyCost: planCosts[org.plan as keyof typeof planCosts],
      daysUntilBilling: Math.max(0, daysUntilBilling),
      isProratedThisMonth,
      proratedAmount: org.lastProratedAmount || undefined,
    };
  }

  /**
   * Check if billing is due (runs daily to trigger monthly billing on the 1st)
   */
  public async checkAndProcessBilling(): Promise<boolean> {
    const today = new Date();
    const isFirstOfMonth = today.getDate() === 1;

    if (isFirstOfMonth) {
      console.log("📅 Today is the 1st - processing monthly billing");
      await this.processMonthlyBilling();
      return true;
    }

    return false;
  }
}
