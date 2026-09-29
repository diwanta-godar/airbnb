"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import type { AdminNotification, NotificationsPayload } from "@/lib/types";
import { useAuthStore } from "@/store/auth";

type Props = {
  onOpenChat?: (phone: string, name: string) => void;
};

export function AdminNotificationBell({ onOpenChat }: Props) {
  const token = useAuthStore((s) => s.accessToken);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  async function load() {
    if (!token) return;
    try {
      const data = await apiFetch<NotificationsPayload>(
        "/admin/notifications?limit=12",
        { token }
      );
      setItems(data.items);
      setUnreadCount(data.unreadCount);
    } catch {
      // ignore transient errors in topbar
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const socket = getSocket();
    const onNotify = (notification: AdminNotification) => {
      setItems((prev) => [notification, ...prev.filter((n) => n.id !== notification.id)].slice(0, 12));
      setUnreadCount((c) => c + (notification.isRead ? 0 : 1));
    };
    socket.on("admin_notification", onNotify);
    return () => {
      socket.off("admin_notification", onNotify);
    };
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

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
    } catch {
      // ignore
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
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-10 w-10 place-items-center rounded-md border border-[#e8dfd4] bg-white hover:bg-[#f3eee7]"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#b45309] px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden border border-[#e8dfd4] bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-[#eee7de] px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            <button
              type="button"
              onClick={markAllRead}
              disabled={!unreadCount}
              className="text-xs font-medium text-accent disabled:opacity-40"
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {!items.length && (
              <p className="px-4 py-8 text-center text-sm text-muted">
                No notifications yet.
              </p>
            )}
            {items.map((n) => (
              <div
                key={n.id}
                className={`border-b border-[#eee7de] px-4 py-3 ${
                  n.isRead ? "bg-white" : "bg-[#fff8ef]"
                }`}
              >
                <p className="text-sm font-medium text-ink">{n.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{n.body}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wide text-muted">
                    {new Date(n.createdAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {!n.isRead && (
                    <button
                      type="button"
                      onClick={() => markRead(n.id)}
                      className="text-xs font-semibold text-accent"
                    >
                      Mark as read
                    </button>
                  )}
                  {n.phoneNumber && onOpenChat && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenChat(
                          n.phoneNumber!,
                          n.senderName || n.phoneNumber!
                        );
                        setOpen(false);
                        if (!n.isRead) void markRead(n.id);
                      }}
                      className="text-xs font-semibold text-[#128C7E]"
                    >
                      Open chat
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-[#eee7de] px-4 py-2.5">
            <Link
              href="/admin/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-ink underline"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
