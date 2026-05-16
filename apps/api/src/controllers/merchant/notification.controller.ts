import { FastifyReply } from "fastify";
import { Notification, mongoose } from "@qodinger/knot-database";

export const MerchantNotificationController = {
  getNotifications: async (request: any, _reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant) return _reply.code(401).send({ error: "Unauthorized" });

    const { limit, offset, invoiceId } = request.query;

    const query: Record<string, unknown> = {
      merchantId: merchant._id,
    };

    if (invoiceId) {
      query["meta.invoiceId"] = invoiceId;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    const unreadCount = await Notification.countDocuments({
      merchantId: merchant._id,
      isRead: false,
    });

    return {
      data: notifications,
      unreadCount,
    };
  },
  markAllNotificationsRead: async (request: any, _reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant) return _reply.code(401).send({ error: "Unauthorized" });

    await Notification.updateMany(
      { merchantId: merchant._id, isRead: false },
      { $set: { isRead: true } },
    );

    return { success: true };
  },
  markNotificationRead: async (request: any, reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant) return reply.code(401).send({ error: "Unauthorized" });

    const { id } = request.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return reply.code(400).send({ error: "Invalid notification ID" });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, merchantId: merchant._id },
      { $set: { isRead: true } },
    );

    if (!notification) {
      return reply.code(404).send({ error: "Notification not found" });
    }

    return { success: true };
  },
};
