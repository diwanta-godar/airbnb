import { Request, Response } from "express";
import { In } from "typeorm";
import { AppDataSource } from "../config/database";
import { AdminNotification } from "../entities/AdminNotification";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { param } from "../utils/params";

const repo = () => AppDataSource.getRepository(AdminNotification);

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const unreadOnly = String(req.query.unread || "") === "true";
  const limit = Math.min(Number(req.query.limit) || 40, 100);

  const where = unreadOnly ? { isRead: false } : {};
  const items = await repo().find({
    where,
    order: { createdAt: "DESC" },
    take: limit,
  });

  const unreadCount = await repo().count({ where: { isRead: false } });

  res.json({
    success: true,
    data: {
      items,
      unreadCount,
    },
  });
});

export const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  const id = param(req.params.id);
  const item = await repo().findOne({ where: { id } });
  if (!item) throw new AppError("Notification not found", 404);
  item.isRead = true;
  await repo().save(item);
  const unreadCount = await repo().count({ where: { isRead: false } });
  res.json({ success: true, data: { item, unreadCount } });
});

export const markAllNotificationsRead = asyncHandler(async (_req, res) => {
  await repo()
    .createQueryBuilder()
    .update(AdminNotification)
    .set({ isRead: true })
    .where("isRead = :isRead", { isRead: false })
    .execute();

  res.json({
    success: true,
    data: { unreadCount: 0 },
    message: "All notifications marked as read",
  });
});

export const markManyNotificationsRead = asyncHandler(async (req, res) => {
  const ids = (req.body?.ids as string[] | undefined) || [];
  if (!ids.length) throw new AppError("ids array is required", 400);

  await repo().update({ id: In(ids) }, { isRead: true });
  const unreadCount = await repo().count({ where: { isRead: false } });

  res.json({ success: true, data: { unreadCount } });
});
