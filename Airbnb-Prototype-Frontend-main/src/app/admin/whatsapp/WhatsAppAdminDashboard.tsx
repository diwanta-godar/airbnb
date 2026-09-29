"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  QrCode,
  CheckCircle2,
  RefreshCw,
  MessageCircle,
  Calendar,
  Phone,
  Mail,
  User,
  ShieldCheck,
  ExternalLink,
  Info,
  Search,
  Send,
  ArrowLeft,
} from "lucide-react";
import { getSocket } from "@/lib/socket";
import { apiFetch, formatMoney } from "@/lib/api";
import type { Booking, WhatsAppMessage, WhatsAppStatus } from "@/lib/types";
import { useAuthStore } from "@/store/auth";

type Conversation = {
  phone: string;
  name: string;
  lastMessage: string;
  lastAt: string;
};

function normalizePhone(phone: string) {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length === 10 && /^(97|98)\d{8}$/.test(digits)) {
    return `977${digits}`;
  }
  return digits;
}

function phonesMatch(a: string, b: string) {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  return na === nb || na.slice(-10) === nb.slice(-10);
}

export default function WhatsAppAdminDashboard({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [status, setStatus] = useState<WhatsAppStatus>({
    status: "connecting",
    qrCode: null,
    userPhone: null,
  });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [isResetting, setIsResetting] = useState(false);
  const [sendingReplies, setSendingReplies] = useState<Record<string, boolean>>(
    {}
  );
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [replySuccess, setReplySuccess] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"bookings" | "messages">(
    "bookings"
  );
  const [syncSeconds, setSyncSeconds] = useState(0);

  // Live chat feed (people sidebar)
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accessToken) return;
    const socket = getSocket();

    apiFetch<WhatsAppStatus>("/admin/whatsapp/status", { token: accessToken })
      .then((res) => {
        if (res) setStatus(res);
      })
      .catch(() => {});

    apiFetch<WhatsAppMessage[]>("/admin/whatsapp/messages?limit=200", {
      token: accessToken,
    })
      .then((res) => {
        if (res) setMessages(res);
      })
      .catch(() => {});

    apiFetch<Booking[]>("/admin/bookings", { token: accessToken })
      .then((res) => {
        if (res) setBookings(res);
      })
      .catch(() => {});

    socket.on("whatsapp_status", (newStatus: WhatsAppStatus) => {
      setStatus(newStatus);
      if (newStatus.status === "connected") setSyncSeconds(0);
    });

    socket.on("new_booking", (booking: Booking) => {
      setBookings((prev) => [booking, ...prev.filter((b) => b.id !== booking.id)]);
    });

    socket.on("bookings_history", (history: Booking[]) => {
      setBookings((prev) => {
        const ids = new Set(prev.map((b) => b.id));
        return [...prev, ...history.filter((b) => !ids.has(b.id))];
      });
    });

    socket.on("whatsapp_message_received", (msg: WhatsAppMessage) => {
      setMessages((prev) => [...prev.filter((m) => m.id !== msg.id), msg]);
    });

    socket.on("whatsapp_message_sent", (msg: WhatsAppMessage) => {
      setMessages((prev) => [...prev.filter((m) => m.id !== msg.id), msg]);
    });

    socket.on("whatsapp_messages_history", (history: WhatsAppMessage[]) => {
      setMessages((prev) => {
        const byId = new Map<string, WhatsAppMessage>();
        for (const m of [...prev, ...history]) byId.set(m.id, m);
        return Array.from(byId.values()).sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
    });

    return () => {
      socket.off("whatsapp_status");
      socket.off("new_booking");
      socket.off("bookings_history");
      socket.off("whatsapp_message_received");
      socket.off("whatsapp_message_sent");
      socket.off("whatsapp_messages_history");
    };
  }, [accessToken]);

  useEffect(() => {
    if (status.status !== "connecting" && status.status !== "qr_ready") return;
    const interval = setInterval(() => setSyncSeconds((s) => s + 1), 1000);
    return () => {
      clearInterval(interval);
      setSyncSeconds(0);
    };
  }, [status.status]);

  const conversations = useMemo(() => {
    const map = new Map<string, Conversation>();

    for (const msg of messages) {
      const phone = normalizePhone(msg.phoneNumber);
      if (!phone) continue;
      const existing = map.get(phone);
      const nicerName =
        msg.senderName && !/^\+?\d+$/.test(msg.senderName)
          ? msg.senderName
          : null;

      if (
        !existing ||
        new Date(msg.createdAt).getTime() >=
          new Date(existing.lastAt).getTime()
      ) {
        map.set(phone, {
          phone,
          name: nicerName || existing?.name || `+${phone}`,
          lastMessage: msg.messageText,
          lastAt: msg.createdAt,
        });
      } else if (
        nicerName &&
        (existing.name.startsWith("+") || /^\d+$/.test(existing.name))
      ) {
        map.set(phone, { ...existing, name: nicerName });
      }
    }

    for (const booking of bookings) {
      const phone = normalizePhone(
        booking.customerPhone || booking.guest?.phone || ""
      );
      if (!phone) continue;
      const name =
        booking.customerName ||
        `${booking.guest?.firstName || ""} ${booking.guest?.lastName || ""}`.trim() ||
        `+${phone}`;
      const existing = map.get(phone);
      if (!existing) {
        map.set(phone, {
          phone,
          name,
          lastMessage: `Booking: ${booking.property?.title || "Stay"} (${booking.status})`,
          lastAt: booking.createdAt,
        });
      } else if (
        existing.name.startsWith("+") &&
        name &&
        !name.startsWith("+")
      ) {
        map.set(phone, { ...existing, name });
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
    );
  }, [messages, bookings]);

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q.replace(/\D/g, "")) ||
        c.lastMessage.toLowerCase().includes(q)
    );
  }, [conversations, search]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.phone === selectedPhone) || null,
    [conversations, selectedPhone]
  );

  const thread = useMemo(() => {
    if (!selectedPhone) return [];
    return messages
      .filter((m) => phonesMatch(m.phoneNumber, selectedPhone))
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
  }, [messages, selectedPhone]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread, selectedPhone]);

  async function handleResetSession() {
    setIsResetting(true);
    try {
      await apiFetch("/admin/whatsapp/reset", {
        method: "POST",
        token: accessToken,
      });
      setStatus((prev) => ({ ...prev, status: "connecting", qrCode: null }));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to reset session");
    } finally {
      setTimeout(() => setIsResetting(false), 2000);
    }
  }

  async function handleSendBookingReply(booking: Booking) {
    const replyText = replyInputs[booking.id]?.trim();
    const targetPhone = booking.customerPhone || booking.guest?.phone;
    if (!targetPhone) {
      alert("No phone number available for this booking.");
      return;
    }
    if (!replyText) {
      alert("Please enter a reply message.");
      return;
    }

    setSendingReplies((prev) => ({ ...prev, [booking.id]: true }));
    try {
      await apiFetch("/admin/whatsapp/send", {
        method: "POST",
        token: accessToken,
        body: { toPhone: targetPhone, message: replyText },
      });
      setReplySuccess((prev) => ({ ...prev, [booking.id]: "Message sent ✓" }));
      setReplyInputs((prev) => ({ ...prev, [booking.id]: "" }));
      setTimeout(() => {
        setReplySuccess((prev) => {
          const next = { ...prev };
          delete next[booking.id];
          return next;
        });
      }, 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setSendingReplies((prev) => ({ ...prev, [booking.id]: false }));
    }
  }

  function selectChat(phone: string) {
    setSelectedPhone(phone);
    setMobileShowChat(true);
    setDraft("");
    setSendError("");
  }

  async function onSendChat(e: FormEvent) {
    e.preventDefault();
    if (!selectedPhone || !draft.trim()) return;
    setSending(true);
    setSendError("");
    try {
      await apiFetch("/admin/whatsapp/send", {
        method: "POST",
        token: accessToken,
        body: { toPhone: selectedPhone, message: draft.trim() },
      });
      setDraft("");
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  const connected = status.status.includes("connected");

  const liveChatFeed = (
    <div className="overflow-hidden border border-line bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-line bg-[#008069] px-4 py-3 text-white">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <MessageCircle className="h-5 w-5" />
          WhatsApp Live Chat Feed
        </h2>
        <span className="text-xs text-white/80">
          {conversations.length} people · real-time
        </span>
      </div>

      <div className="grid h-[min(560px,65vh)] grid-cols-1 lg:grid-cols-[300px_1fr]">
        <aside
          className={`min-h-0 flex-col border-r border-[#e9edef] ${
            mobileShowChat && selectedPhone ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="border-b border-[#e9edef] bg-[#f0f2f5] p-2.5">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search people"
                className="w-full rounded-lg border-0 bg-white py-2 pl-9 pr-3 text-sm outline-none ring-1 ring-[#e8dfd4]"
              />
            </label>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {!filteredConversations.length && (
              <p className="px-4 py-10 text-center text-xs text-muted">
                No people yet. Customer messages appear here.
              </p>
            )}
            {filteredConversations.map((c) => {
              const active = selectedPhone === c.phone;
              return (
                <button
                  key={c.phone}
                  type="button"
                  onClick={() => selectChat(c.phone)}
                  className={`flex w-full items-start gap-3 border-b border-[#f0f2f5] px-3 py-3 text-left ${
                    active ? "bg-[#f0f2f5]" : "hover:bg-[#faf8f5]"
                  }`}
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#dfe5e0] text-sm font-semibold text-[#54656f]">
                    {(c.name.replace(/^\+/, "").trim()[0] || "?").toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between gap-2">
                      <span className="truncate text-sm font-semibold">
                        {c.name}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted">
                        {new Date(c.lastAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </span>
                    <span className="mt-0.5 line-clamp-1 text-xs text-muted">
                      {c.lastMessage}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <div
          className={`min-h-0 flex-col bg-[#efeae2] ${
            mobileShowChat && selectedPhone ? "flex" : "hidden lg:flex"
          }`}
        >
          {activeConversation ? (
            <>
              <header className="flex items-center gap-3 border-b border-[#d1d7db] bg-[#f0f2f5] px-3 py-2.5">
                <button
                  type="button"
                  className="grid h-9 w-9 place-items-center rounded-full hover:bg-black/5 lg:hidden"
                  onClick={() => setMobileShowChat(false)}
                  aria-label="Back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#dfe5e0] text-sm font-semibold">
                  {(activeConversation.name.replace(/^\+/, "")[0] || "?").toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {activeConversation.name}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-muted">
                    <Phone className="h-3 w-3" />+{activeConversation.phone}
                  </p>
                </div>
              </header>

              <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-4 md:px-6">
                {!thread.length && (
                  <p className="py-12 text-center text-sm text-muted">
                    No messages with this person yet.
                  </p>
                )}
                {thread.map((msg) => {
                  const mine = msg.direction === "outgoing";
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-1.5 text-sm shadow-sm md:max-w-[70%] ${
                          mine
                            ? "rounded-br-sm bg-[#d9fdd3]"
                            : "rounded-bl-sm bg-white"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.messageText}</p>
                        <p className="mt-0.5 text-right text-[10px] text-muted">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatBottomRef} />
              </div>

              {sendError && (
                <p className="bg-white px-4 py-2 text-xs text-red-700">
                  {sendError}
                </p>
              )}

              <form
                onSubmit={onSendChat}
                className="flex items-center gap-2 border-t border-[#d1d7db] bg-[#f0f2f5] p-3"
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={
                    connected
                      ? `Message ${activeConversation.name}`
                      : "Connect WhatsApp to send"
                  }
                  disabled={!connected || sending}
                  className="flex-1 rounded-lg border-0 bg-white px-4 py-2.5 text-sm outline-none ring-1 ring-[#e8dfd4] disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!connected || sending || !draft.trim()}
                  className="grid h-10 w-10 place-items-center rounded-full bg-[#008069] text-white disabled:opacity-40"
                  aria-label="Send"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="grid flex-1 place-items-center bg-[#f0f2f5] px-6 text-center">
              <div>
                <MessageCircle className="mx-auto h-12 w-12 text-[#008069]/40" />
                <p className="mt-3 font-semibold">Select a person</p>
                <p className="mt-1 text-sm text-muted">
                  Choose someone from the left to see only their chat.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={
        embedded
          ? "mx-auto max-w-7xl"
          : "page-shell mx-auto max-w-7xl px-4 md:px-8"
      }
    >
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-6 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-brand text-3xl text-ink md:text-4xl">
              {embedded ? "WhatsApp inbox" : "WhatsApp Control Center"}
            </h1>
            <span className="rounded bg-amber-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-accent-dark">
              Admin Portal
            </span>
          </div>
          <p className="mt-1.5 text-sm text-muted">
            Live WhatsApp Web authentication, booking alerts, and customer chat.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/stays"
            target="_blank"
            className="btn flex items-center gap-1.5 border border-line bg-white text-xs text-ink hover:bg-paper"
          >
            Open Booking Form <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={handleResetSession}
            disabled={isResetting}
            className="btn btn-dark flex items-center gap-2 text-xs"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isResetting ? "animate-spin" : ""}`}
            />
            {isResetting ? "Resetting..." : "Reset & Scan New QR"}
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-4">
          <div className="border border-line bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <h2 className="flex items-center gap-2 text-base font-bold text-ink">
                <QrCode className="h-5 w-5 text-accent" /> WhatsApp Authentication
              </h2>
              {status.status === "connected" ? (
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                  Connected ✓
                </span>
              ) : status.status === "qr_ready" ? (
                <span className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  Scan QR Code
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
                  Connecting...
                </span>
              )}
            </div>

            <div className="mt-5">
              {status.status === "connected" ? (
                <div className="py-6 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="h-9 w-9" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-ink">
                    WhatsApp Web Linked
                  </h3>
                  <p className="mt-1 text-xs text-muted">
                    Session active and listening for bookings & messages.
                  </p>
                  {status.userPhone && (
                    <div className="mt-3 inline-block rounded border border-line bg-paper px-3 py-1 font-mono text-xs font-bold text-ink">
                      +{status.userPhone}
                    </div>
                  )}
                  <div className="mt-6 flex items-start gap-2 rounded border border-emerald-200 bg-emerald-50/50 p-3 text-left text-xs text-emerald-900">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <div>
                      <strong>Auto-Restoration Enabled:</strong> Session restores
                      on reboot without re-scanning.
                    </div>
                  </div>
                </div>
              ) : status.qrCode ? (
                <div className="text-center">
                  <div className="mx-auto inline-block rounded border border-line bg-white p-3 shadow-inner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={status.qrCode}
                      alt="WhatsApp Web QR Code"
                      className="mx-auto h-56 w-56 object-contain"
                    />
                  </div>
                  <p className="mt-3 text-xs font-medium text-ink">
                    Scan with WhatsApp on your admin phone:
                  </p>
                  <ol className="mt-2 space-y-1 rounded border border-line bg-paper p-3 text-left text-xs text-muted">
                    <li>
                      1. Open <strong>WhatsApp</strong> on your phone
                    </li>
                    <li>
                      2. Tap <strong>Settings</strong> or <strong>Menu (⋮)</strong>{" "}
                      &gt; <strong>Linked Devices</strong>
                    </li>
                    <li>
                      3. Tap <strong>Link a Device</strong> and scan here
                    </li>
                  </ol>
                  {syncSeconds > 0 && (
                    <p className="mt-3 text-[11px] text-muted">
                      Syncing session: {syncSeconds}s
                    </p>
                  )}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <RefreshCw className="mx-auto h-8 w-8 animate-spin text-accent" />
                  <p className="mt-4 text-sm font-semibold text-ink">
                    Initializing WhatsApp Web Session...
                  </p>
                  {syncSeconds > 0 && (
                    <p className="mt-2 font-mono text-xs text-amber-700">
                      Sync elapsed: {syncSeconds}s
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5 space-y-2 border-t border-line pt-4 text-xs text-muted">
              <div className="flex items-start gap-1.5 text-ink/80">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                <span>
                  Use <em>Reset &amp; Scan New QR</em> anytime the session drops.
                </span>
              </div>
            </div>
          </div>

          <div className="border border-line bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              Live Activity Summary
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded border border-line bg-paper p-3 text-center">
                <span className="block text-xs text-muted">Bookings</span>
                <span className="text-2xl font-bold text-ink">
                  {bookings.length}
                </span>
              </div>
              <div className="rounded border border-line bg-paper p-3 text-center">
                <span className="block text-xs text-muted">People / Chats</span>
                <span className="text-2xl font-bold text-ink">
                  {conversations.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-8">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("bookings")}
                className={`rounded px-3 py-1.5 text-xs font-semibold ${
                  activeTab === "bookings"
                    ? "bg-ink text-white"
                    : "bg-transparent text-muted hover:text-ink"
                }`}
              >
                Live Bookings ({bookings.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("messages")}
                className={`rounded px-3 py-1.5 text-xs font-semibold ${
                  activeTab === "messages"
                    ? "bg-ink text-white"
                    : "bg-transparent text-muted hover:text-ink"
                }`}
              >
                WhatsApp Chat Feed ({conversations.length})
              </button>
            </div>
            <span className="flex items-center gap-1 text-xs text-muted">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Live via Socket.IO
            </span>
          </div>

          {activeTab === "bookings" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
                  <Calendar className="h-5 w-5 text-accent" /> Live Customer
                  Bookings
                </h2>
              </div>

              {bookings.length === 0 ? (
                <div className="border border-line bg-white p-8 text-center text-sm text-muted">
                  No bookings yet. Submit a test at{" "}
                  <Link
                    href="/stays"
                    className="font-semibold text-accent underline"
                  >
                    /stays
                  </Link>
                  .
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => {
                    const custName =
                      booking.customerName ||
                      (booking.guest
                        ? `${booking.guest.firstName} ${booking.guest.lastName}`
                        : "Customer");
                    const custPhone =
                      booking.customerPhone || booking.guest?.phone || "";
                    const custEmail =
                      booking.customerEmail || booking.guest?.email || "";
                    const stayTitle =
                      booking.property?.title || "Signature Stay";

                    return (
                      <div
                        key={booking.id}
                        className="border border-line bg-white p-5 shadow-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line/70 pb-3">
                          <div>
                            <span className="font-mono text-[11px] font-semibold uppercase text-accent">
                              {booking.id.length > 10
                                ? `BK-${booking.id.slice(-6)}`
                                : booking.id}
                            </span>
                            <h3 className="text-base font-bold text-ink">
                              {stayTitle}
                            </h3>
                          </div>
                          <div className="text-right">
                            <span className="inline-block rounded border border-line bg-paper px-2 py-0.5 text-xs font-semibold uppercase text-ink">
                              {booking.status}
                            </span>
                            <p className="mt-1 text-xs text-muted">
                              {formatMoney(booking.totalPrice, booking.currency)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 shrink-0 text-muted" />
                            <strong>{custName}</strong>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 shrink-0 text-muted" />
                            <span>+{custPhone.replace(/\D/g, "")}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 shrink-0 text-muted" />
                            <span>
                              {booking.checkIn}
                              {booking.bookingTime
                                ? ` at ${booking.bookingTime}`
                                : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 shrink-0 text-muted" />
                            <span className="truncate">{custEmail}</span>
                          </div>
                        </div>

                        {booking.guestMessage && (
                          <div className="mt-3 rounded border border-line/60 bg-paper p-2.5 text-xs">
                            <strong className="block text-[11px] uppercase text-muted">
                              Special Requests
                            </strong>
                            <p className="mt-0.5 italic">
                              &ldquo;{booking.guestMessage}&rdquo;
                            </p>
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
                          {custPhone && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTab("messages");
                                selectChat(normalizePhone(custPhone));
                              }}
                              className="inline-flex items-center gap-1.5 border border-[#25D366]/35 bg-[#25D366]/10 px-3 py-1.5 text-xs font-semibold text-[#128C7E]"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              Open chat
                            </button>
                          )}
                        </div>

                        <div className="mt-3">
                          <div className="mb-1.5 flex items-center justify-between">
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                              <MessageCircle className="h-3.5 w-3.5 text-accent" />
                              Inline WhatsApp Reply
                            </label>
                            {replySuccess[booking.id] && (
                              <span className="text-xs font-semibold text-emerald-700">
                                {replySuccess[booking.id]}
                              </span>
                            )}
                          </div>
                          <div className="mb-2 flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setReplyInputs((prev) => ({
                                  ...prev,
                                  [booking.id]: `Hello ${custName}, your booking for ${stayTitle} is confirmed! We look forward to hosting you on ${booking.checkIn}.`,
                                }))
                              }
                              className="rounded border border-line bg-paper px-2 py-0.5 text-[11px] text-muted hover:text-ink"
                            >
                              + Confirm Stay
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setReplyInputs((prev) => ({
                                  ...prev,
                                  [booking.id]: `Hi ${custName}, thank you for booking The Lantern Stay! Could you please share your expected arrival time on ${booking.checkIn}?`,
                                }))
                              }
                              className="rounded border border-line bg-paper px-2 py-0.5 text-[11px] text-muted hover:text-ink"
                            >
                              + Request Arrival Time
                            </button>
                          </div>
                          <div className="space-y-2">
                            <textarea
                              rows={5}
                              placeholder={`Message +${custPhone.replace(/\D/g, "")}...`}
                              value={replyInputs[booking.id] || ""}
                              onChange={(e) =>
                                setReplyInputs((prev) => ({
                                  ...prev,
                                  [booking.id]: e.target.value,
                                }))
                              }
                              className="field min-h-[120px] w-full resize-y py-2.5 text-sm leading-relaxed"
                            />
                            <div className="flex justify-end">
                              <button
                                type="button"
                                disabled={
                                  sendingReplies[booking.id] || !connected
                                }
                                onClick={() => handleSendBookingReply(booking)}
                                className="btn btn-primary px-4 py-2 text-xs"
                              >
                                {sendingReplies[booking.id]
                                  ? "Sending..."
                                  : "Send"}
                              </button>
                            </div>
                          </div>
                          {!connected && (
                            <p className="mt-1 text-[11px] text-amber-700">
                              WhatsApp must be connected to send replies.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "messages" && liveChatFeed}
        </div>
      </div>
    </div>
  );
}
