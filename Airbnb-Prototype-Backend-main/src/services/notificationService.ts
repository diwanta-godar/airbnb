import { AppDataSource } from "../config/database";
import { AdminNotification } from "../entities/AdminNotification";
import { broadcastAdminNotification } from "./socketService";

type CreateNotificationInput = {
  type?: AdminNotification["type"];
  title: string;
  body: string;
  phoneNumber?: string | null;
  senderName?: string | null;
  href?: string | null;
};

export async function createAdminNotification(input: CreateNotificationInput) {
  if (!AppDataSource.isInitialized) return null;

  const repo = AppDataSource.getRepository(AdminNotification);
  const saved = await repo.save(
    repo.create({
      type: input.type || "whatsapp_reply",
      title: input.title,
      body: input.body,
      phoneNumber: input.phoneNumber || null,
      senderName: input.senderName || null,
      href: input.href || null,
      isRead: false,
    })
  );

  broadcastAdminNotification(saved);
  return saved;
}

export async function createWhatsAppReplyNotification(params: {
  phoneNumber: string;
  senderName?: string | null;
  messageText: string;
}) {
  const who = params.senderName?.trim() || `+${params.phoneNumber}`;
  const preview =
    params.messageText.length > 140
      ? `${params.messageText.slice(0, 140)}…`
      : params.messageText;

  return createAdminNotification({
    type: "whatsapp_reply",
    title: `WhatsApp reply from ${who}`,
    body: preview,
    phoneNumber: params.phoneNumber,
    senderName: params.senderName || null,
    href: `/admin/bookings`,
  });
}
