import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { WhatsAppMessage } from "../entities/WhatsAppMessage";
import { whatsappService } from "../services/whatsappService";
import { memoryStore } from "../services/memoryStore";
import { asyncHandler, AppError } from "../middleware/errorHandler";

const msgRepo = () => AppDataSource.getRepository(WhatsAppMessage);

export const getStatus = asyncHandler(async (_req: Request, res: Response) => {
  const status = whatsappService.getStatus();
  res.json({ success: true, data: status });
});

export const resetSession = asyncHandler(async (_req: Request, res: Response) => {
  await whatsappService.resetSession();
  res.json({
    success: true,
    message: "WhatsApp session reset initiated. Fresh QR code will be generated.",
  });
});

export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const { toPhone, message } = req.body;

  if (!toPhone || typeof toPhone !== "string") {
    throw new AppError("Recipient phone number is required", 400);
  }

  if (!message || typeof message !== "string" || !message.trim()) {
    throw new AppError("Message text is required", 400);
  }

  try {
    await whatsappService.sendMessage(toPhone, message.trim());
    res.json({ success: true, message: "Message sent successfully" });
  } catch (err: any) {
    throw new AppError(err.message || "Failed to send WhatsApp message", 500);
  }
});

export const getMessages = asyncHandler(async (req: Request, res: Response) => {
  const phoneRaw = typeof req.query.phone === "string" ? req.query.phone : "";
  const phone = phoneRaw ? whatsappService.normalizePhone(phoneRaw) : "";

  if (!AppDataSource.isInitialized) {
    const all = memoryStore.getMessages() as Array<{ phoneNumber?: string }>;
    const filtered = phone
      ? all.filter((m) => {
          const n = whatsappService.normalizePhone(m.phoneNumber || "");
          return n === phone || n.endsWith(phone.slice(-10)) || phone.endsWith(n.slice(-10));
        })
      : all;
    return res.json({ success: true, data: filtered });
  }

  if (phone) {
    // Match full normalized number or last 10 digits (local Nepal form)
    const local = phone.slice(-10);
    const messages = await msgRepo()
      .createQueryBuilder("msg")
      .where(
        "regexp_replace(msg.phoneNumber, '\\D', '', 'g') = :phone OR right(regexp_replace(msg.phoneNumber, '\\D', '', 'g'), 10) = :local",
        { phone, local }
      )
      .orderBy("msg.createdAt", "ASC")
      .take(200)
      .getMany();

    return res.json({ success: true, data: messages });
  }

  const messages = await msgRepo().find({
    order: { createdAt: "DESC" },
    take: Math.min(Number(req.query.limit) || 200, 500),
  });

  res.json({ success: true, data: messages.reverse() });
});

