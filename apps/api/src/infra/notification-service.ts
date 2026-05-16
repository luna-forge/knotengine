import { Notification, Merchant, Organization } from "@qodinger/knot-database";
import { SocketService } from "./socket-service.js";
import { EmailService } from "./email-service.js";

/**
 * 🔔 Notification Service
 *
 * Handles creation and real-time delivery of notifications to merchants.
 * Sends email alerts for critical events (payment, security, billing).
 */
export class NotificationService {
  public static async create(params: {
    merchantId: string;
    title: string;
    description: string;
    type: "success" | "warning" | "error" | "info";
    link?: string;
    meta?: Record<string, any>;
    sendEmail?: boolean; // Optional: force email sending
  }) {
    try {
      // 1. Deduplication Logic:
      // If there's an unread notification for the same invoice and same major title/topic,
      // update it instead of creating a new one. This prevents "Confirmation Spam".
      if (params.meta?.invoiceId) {
        // Extract base title and escape special characters for Regex (like '[' and ']')
        const baseTitle = params.title.split(" (")[0];
        const escapedTitle = baseTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        const existing = await Notification.findOne({
          merchantId: params.merchantId,
          "meta.invoiceId": params.meta.invoiceId,
          title: { $regex: new RegExp(`^${escapedTitle}`) },
          isRead: false,
        });

        if (existing) {
          existing.title = params.title;
          existing.description = params.description;
          existing.type = params.type;
          existing.meta = params.meta;
          // We don't change createdAt because we want to preserve the first detection time,
          // but we save to update the updatedAt which handles sorting in some UI.
          await existing.save();

          // Re-emit update via socket
          SocketService.emitToMerchant(
            params.merchantId,
            "notification_updated",
            {
              id: existing._id,
              title: existing.title,
              description: existing.description,
              type: existing.type,
              link: existing.link,
              isRead: existing.isRead,
              updatedAt: existing.updatedAt,
            },
          );

          return existing;
        }
      }

      // 2. Persist to Database (New)
      const notification = await Notification.create({
        merchantId: params.merchantId,
        title: params.title,
        description: params.description,
        type: params.type,
        link: params.link,
        meta: params.meta,
      });

      // 3. Emit Real-time Socket Event
      SocketService.emitToMerchant(params.merchantId, "notification", {
        id: notification._id,
        title: notification.title,
        description: notification.description,
        type: notification.type,
        link: notification.link,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      });

      // 4. Send Email Notification (if applicable)
      await this.sendEmailIfApplicable({
        merchantId: params.merchantId,
        title: params.title,
        description: params.description,
        type: params.type,
        link: params.link,
        meta: params.meta,
        forceSend: params.sendEmail || false,
      });

      return notification;
    } catch (err) {
      console.error("❌ Failed to create notification:", err);
      return null;
    }
  }

  /**
   * Send email notifications for critical events
   */
  private static async sendEmailIfApplicable(params: {
    merchantId?: string;
    organizationId?: string;
    title: string;
    description: string;
    type: "success" | "warning" | "error" | "info";
    link?: string;
    meta?: Record<string, any>;
    forceSend: boolean;
  }) {
    try {
      let merchantName = "";
      let userEmail = "";
      let orgPlan = "starter";
      let orgSettings: any = {};

      if (params.merchantId) {
        const merchant = await Merchant.findById(params.merchantId).populate(
          "userId",
        );
        if (!merchant) return;

        const user = merchant.userId as any;
        if (!user || !user.email) return;
        userEmail = user.email;
        merchantName = merchant.name || user.email.split("@")[0];

        // Look up organization for plan and settings
        if (merchant.organizationId) {
          const org = await Organization.findById(merchant.organizationId);
          if (org) {
            orgPlan = org.plan;
            orgSettings = org.settings || {};
          }
        }
      } else if (params.organizationId) {
        const org = await Organization.findById(params.organizationId);
        if (!org) return;
        orgPlan = org.plan;
        orgSettings = org.settings || {};

        // Get first owner/admin email
        const { Membership } = await import("@qodinger/knot-database");
        const adminMember = await Membership.findOne({
          organizationId: org._id,
          role: { $in: ["owner", "admin"] },
        }).populate("userId");

        if (adminMember) {
          const user = adminMember.userId as any;
          if (user && user.email) {
            userEmail = user.email;
            merchantName = org.name;
          }
        }
      }

      if (!userEmail) return;

      // Check email notification preferences (from org settings)
      const prefs = (orgSettings as any).emailNotifications || {
        paymentReceived: true,
        paymentConfirmed: true,
        paymentOverpaid: true,
        paymentExpired: true,
        subscriptionCharged: true,
        lowBalance: true,
        securityAlerts: true,
      };

      // Determine if email should be sent based on preferences
      let shouldSendEmail = params.forceSend;

      if (!shouldSendEmail) {
        if (params.type === "error" && prefs.securityAlerts) {
          shouldSendEmail = true;
        } else if (
          params.title.includes("Payment Received") &&
          prefs.paymentReceived
        ) {
          shouldSendEmail = true;
        } else if (
          params.title.includes("Payment Confirmed") &&
          prefs.paymentConfirmed
        ) {
          shouldSendEmail = true;
        } else if (params.title.includes("Overpaid") && prefs.paymentOverpaid) {
          shouldSendEmail = true;
        } else if (params.title.includes("Expired") && prefs.paymentExpired) {
          shouldSendEmail = true;
        } else if (
          params.title.includes("Subscription") &&
          prefs.subscriptionCharged
        ) {
          shouldSendEmail = true;
        } else if (params.title.includes("Low Balance") && prefs.lowBalance) {
          shouldSendEmail = true;
        } else if (params.title.includes("Security") && prefs.securityAlerts) {
          shouldSendEmail = true;
        }
      }

      if (!shouldSendEmail) {
        console.log(`📧 Email skipped for ${params.title} (user preference)`);
        return;
      }

      // Send appropriate email based on notification type
      if (
        params.title.includes("Payment") ||
        params.meta?.invoiceId ||
        params.meta?.amountUsd
      ) {
        // Payment notification
        const amount = params.meta?.amountUsd || "0.00";
        const currency = params.meta?.currency || "USD";
        const status = params.title.includes("Confirmed")
          ? "confirmed"
          : params.title.includes("Overpaid")
            ? "overpaid"
            : params.title.includes("Expired")
              ? "expired"
              : "received";

        await EmailService.sendPaymentAlert({
          to: userEmail,
          merchantName,
          invoiceId: params.meta?.invoiceId || "Unknown",
          amount: typeof amount === "number" ? amount.toFixed(2) : amount,
          currency,
          status,
          checkoutUrl: params.link
            ? `${process.env.DASHBOARD_URL || "http://localhost:5052"}${params.link}`
            : undefined,
        });
      } else if (params.title.includes("Security")) {
        // Security alert
        await EmailService.sendSecurityAlert({
          to: userEmail,
          merchantName,
          action: params.title,
          description: params.description,
          ipAddress: params.meta?.ipAddress,
          timestamp: new Date().toISOString(),
        });
      } else if (
        params.title.includes("Subscription") ||
        params.title.includes("Billing") ||
        params.title.includes("Low Balance")
      ) {
        // Billing notification
        const type = params.title.includes("Subscription")
          ? "subscription_charged"
          : params.title.includes("Low Balance")
            ? "low_balance"
            : "payment_received";

        await EmailService.sendBillingNotification({
          to: userEmail,
          merchantName,
          type,
          amount: params.meta?.amount?.toString(),
          plan: orgPlan,
          description: params.description,
        });
      }
    } catch (err) {
      console.error("❌ Failed to send email notification:", err);
      // Don't throw - email failures shouldn't break notification flow
    }
  }

  /**
   * Helper for Low Credit alerts
   */
  public static async notifyLowBalance(merchantId: string, balance: number) {
    // Avoid spamming: Check if there's already an unread Low Balance notification
    const existing = await Notification.findOne({
      merchantId,
      title: "Low Credit Balance",
      isRead: false,
    });

    if (existing) return null;

    return this.create({
      merchantId,
      title: "Low Credit Balance",
      description: `Your balance is $${balance.toFixed(2)}. Top up soon to avoid service interruption.`,
      type: "warning",
      link: "/dashboard/billing",
    });
  }

  /**
   * Helper for Invoice Confirmed
   */
  public static async notifyPaymentConfirmed(
    merchantId: string,
    invoiceId: string,
    amountUsd: number,
    isTestnet: boolean = false,
  ) {
    const title = isTestnet ? "[TEST] Payment Received" : "Payment Received";
    return this.create({
      merchantId,
      title,
      description: `Invoice ${invoiceId} has been fully confirmed ($${amountUsd.toFixed(2)}).`,
      type: "success",
      link: `/dashboard/payments`,
      meta: { invoiceId, isTestnet },
    });
  }

  /**
   * Helper for Partial Payment detected
   */
  public static async notifyPartialPayment(
    merchantId: string,
    invoiceId: string,
    received: string,
    totalReceived: string,
    expected: string,
    asset: string,
    status?: string,
    isTestnet: boolean = false,
  ) {
    const stage =
      status === "mempool_detected"
        ? "Mempool"
        : status === "confirming"
          ? "Confirming"
          : status === "partially_paid" || status === "confirmed"
            ? "Pending"
            : "";

    let title = stage
      ? `⚠️ Partial Payment Detected (${stage})`
      : "⚠️ Partial Payment Detected";

    if (isTestnet) title = `[TEST] ${title}`;

    const formattedTotal = parseFloat(
      parseFloat(totalReceived).toFixed(8),
    ).toString();
    const desc =
      parseFloat(totalReceived) > parseFloat(received)
        ? `Detected another ${received} ${asset}. Total received: ${formattedTotal} / ${expected} ${asset}.`
        : `Received ${received} ${asset} which is less than the required ${expected} ${asset}.`;

    return this.create({
      merchantId,
      title,
      description: desc,
      type: "warning",
      link: `/dashboard/payments`,
      meta: { invoiceId, received, totalReceived, expected, asset, isTestnet },
    });
  }

  /**
   * Helper for Overpayment detected
   */
  public static async notifyOverpayment(
    merchantId: string,
    invoiceId: string,
    received: string,
    totalReceived: string,
    expected: string,
    asset: string,
    status?: string,
    isTestnet: boolean = false,
  ) {
    const stage =
      status === "mempool_detected"
        ? "Mempool"
        : status === "confirming"
          ? "Confirming"
          : status === "overpaid" || status === "confirmed"
            ? "Settled"
            : "";

    let title = stage
      ? `💰 Overpayment Detected (${stage})`
      : "💰 Overpayment Detected";

    if (isTestnet) title = `[TEST] ${title}`;

    const formattedTotal = parseFloat(
      parseFloat(totalReceived).toFixed(8),
    ).toString();
    const desc =
      parseFloat(totalReceived) > parseFloat(received)
        ? `Detected another ${received} ${asset}. Total received: ${formattedTotal} (Target: ${expected} ${asset}).`
        : `Received ${received} ${asset} which is significantly more than the required ${expected} ${asset}.`;

    return this.create({
      merchantId,
      title,
      description: desc,
      type: "success",
      link: `/dashboard/payments`,
      meta: { invoiceId, received, totalReceived, expected, asset, isTestnet },
    });
  }

  /**
   * Helper for Webhook Failure
   */
  public static async notifyWebhookFailed(
    merchantId: string,
    invoiceId: string,
    error: string,
    isTestnet: boolean = false,
  ) {
    let title = "Webhook Delivery Failed";
    if (isTestnet) title = `[TEST] ${title}`;

    return this.create({
      merchantId,
      title,
      description: `Failed to notify your server for invoice ${invoiceId}: ${error}`,
      type: "error",
      link: "/dashboard/webhooks",
      meta: { invoiceId, error, isTestnet },
    });
  }

  /**
   * Create notification scoped to an organization (no merchantId required)
   */
  public static async createOrgNotification(params: {
    organizationId: string;
    title: string;
    description: string;
    type: "success" | "warning" | "error" | "info";
    link?: string;
    meta?: Record<string, any>;
    sendEmail?: boolean;
  }) {
    try {
      const notification = await Notification.create({
        organizationId: params.organizationId,
        title: params.title,
        description: params.description,
        type: params.type,
        link: params.link,
        meta: params.meta,
      });

      // Emit to all merchants belonging to this organization
      const { Merchant } = await import("@qodinger/knot-database");
      const merchants = await Merchant.find({
        organizationId: params.organizationId,
        isActive: true,
      });

      for (const merchant of merchants) {
        SocketService.emitToMerchant(merchant._id.toString(), "notification", {
          id: notification._id,
          title: notification.title,
          description: notification.description,
          type: notification.type,
          link: notification.link,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
        });
      }

      // Send email if applicable
      await this.sendEmailIfApplicable({
        organizationId: params.organizationId,
        title: params.title,
        description: params.description,
        type: params.type,
        link: params.link,
        meta: params.meta,
        forceSend: params.sendEmail || false,
      });

      return notification;
    } catch (err) {
      console.error("❌ Failed to create org notification:", err);
      return null;
    }
  }
}
