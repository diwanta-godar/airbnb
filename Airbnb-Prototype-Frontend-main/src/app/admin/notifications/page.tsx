"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import type { AdminNotification, NotificationsPayload } from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { WhatsAppChatModal } from "@/components/admin/WhatsAppChatModal";

export default function AdminNotificationsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState("");
  const [chat, setChat] = useState<{ phone: string; name: string } | null>(null);

  async function load() {
    if (!token) return;
    try {
      const data = await apiFetch<NotificationsPayload>(
        "/admin/notifications?limit=80",
        { token }
      );
      setItems(data.items);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const socket = getSocket();
    const onNotify = (notification: AdminNotification) => {
      setItems((prev) => [notification, ...prev.filter((n) => n.id !== notification.id)]);
      setUnreadCount((c) => c + (notification.isRead ? 0 : 1));
    };
    socket.on("admin_notification", onNotify);
    return () => {
      socket.off("admin_notification", onNotify);
    };
  }, []);

  async function markRead(id: string) {
    if (!token) return;
    try {
      const data = await apiFetch<{ unreadCount: number }>(
        `/admin/notifications/${id}/read`,
        { method: "PATCH", token }
      );
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(data.unreadCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  }

  async function markAllRead() {
    if (!token) return;
    try {
      await apiFetch("/admin/notifications/read-all", {
        method: "PATCH",
        token,
      });
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-brand text-3xl">Notifications</h2>
          <p className="mt-1 text-muted">
            WhatsApp replies and other admin alerts.{" "}
            {unreadCount > 0 ? `${unreadCount} unread.` : "All caught up."}
          </p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={!unreadCount}
          className="border border-line bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40"
        >
          Mark all as read
        </button>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="space-y-2">
        {items.map((n) => (
          <article
            key={n.id}
            className={`border border-[#e8dfd4] p-4 ${
              n.isRead ? "bg-white" : "bg-[#fff8ef]"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{n.title}</p>
                <p className="mt-1 text-sm text-muted whitespace-pre-wrap">{n.body}</p>
                <p className="mt-2 text-xs text-muted">
                  {new Date(n.createdAt).toLocaleString()}
                  {n.phoneNumber ? ` · +${n.phoneNumber}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!n.isRead && (
                  <button
                    type="button"
                    onClick={() => markRead(n.id)}
                    className="border border-line px-3 py-2 text-sm font-medium"
                  >
                    Mark as read
                  </button>
                )}
                {n.phoneNumber && (
                  <button
                    type="button"
                    onClick={() => {
                      setChat({
                        phone: n.phoneNumber!,
                        name: n.senderName || n.phoneNumber!,
                      });
                      if (!n.isRead) void markRead(n.id);
                    }}
                    className="border border-[#25D366]/40 bg-[#25D366]/10 px-3 py-2 text-sm font-semibold text-[#128C7E]"
                  >
                    Open chat
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
        {!items.length && (
          <p className="border border-[#e8dfd4] bg-white p-6 text-muted">
            No notifications yet. When customers reply on WhatsApp, they will appear here.
          </p>
        )}
      </div>

      <WhatsAppChatModal
        open={!!chat}
        onClose={() => setChat(null)}
        phone={chat?.phone || ""}
        customerName={chat?.name || "Customer"}
      />
    </div>
  );
}
