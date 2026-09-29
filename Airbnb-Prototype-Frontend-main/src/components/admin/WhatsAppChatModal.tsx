"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import type { WhatsAppMessage } from "@/lib/types";
import { useAuthStore } from "@/store/auth";

type Props = {
  open: boolean;
  onClose: () => void;
  phone: string;
  customerName: string;
};

function phonesMatch(a: string, b: string) {
  const na = a.replace(/\D/g, "");
  const nb = b.replace(/\D/g, "");
  if (!na || !nb) return false;
  if (na === nb) return true;
  return na.slice(-10) === nb.slice(-10);
}

export function WhatsAppChatModal({
  open,
  onClose,
  phone,
  customerName,
}: Props) {
  const token = useAuthStore((s) => s.accessToken);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !token || !phone) return;

    setLoading(true);
    setError("");
    apiFetch<WhatsAppMessage[]>(
      `/admin/whatsapp/messages?phone=${encodeURIComponent(phone)}`,
      { token }
    )
      .then(setMessages)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load chat")
      )
      .finally(() => setLoading(false));
  }, [open, token, phone]);

  useEffect(() => {
    if (!open || !phone) return;
    const socket = getSocket();

    const onIncoming = (msg: WhatsAppMessage) => {
      if (!phonesMatch(msg.phoneNumber, phone)) return;
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
      );
    };
    const onOutgoing = (msg: WhatsAppMessage) => {
      if (!phonesMatch(msg.phoneNumber, phone)) return;
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
      );
    };

    socket.on("whatsapp_message_received", onIncoming);
    socket.on("whatsapp_message_sent", onOutgoing);
    return () => {
      socket.off("whatsapp_message_received", onIncoming);
      socket.off("whatsapp_message_sent", onOutgoing);
    };
  }, [open, phone]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!token || !text.trim()) return;
    setSending(true);
    setError("");
    try {
      await apiFetch("/admin/whatsapp/send", {
        method: "POST",
        token,
        body: { toPhone: phone, message: text.trim() },
      });
      setText("");
      // Refresh in case socket event is delayed
      const refreshed = await apiFetch<WhatsAppMessage[]>(
        `/admin/whatsapp/messages?phone=${encodeURIComponent(phone)}`,
        { token }
      );
      setMessages(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-3 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close chat overlay"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`WhatsApp chat with ${customerName}`}
        className="relative z-[81] flex h-[min(640px,90vh)] w-full max-w-lg flex-col overflow-hidden border border-[#e8dfd4] bg-[#efeae2] shadow-xl"
      >
        <header className="flex items-center justify-between bg-[#075e54] px-4 py-3 text-white">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white/15">
              <MessageCircle className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{customerName}</p>
              <p className="truncate text-xs text-white/80">+{phone.replace(/\D/g, "")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
          {loading && (
            <p className="py-8 text-center text-sm text-muted">Loading chat...</p>
          )}
          {!loading && !messages.length && (
            <p className="py-8 text-center text-sm text-muted">
              No previous messages with this customer yet. Send the first one.
            </p>
          )}
          {messages.map((msg) => {
            const mine = msg.direction === "outgoing";
            return (
              <div
                key={msg.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                    mine
                      ? "rounded-br-sm bg-[#d9fdd3] text-ink"
                      : "rounded-bl-sm bg-white text-ink"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.messageText}</p>
                  <p className="mt-1 text-right text-[10px] text-muted">
                    {new Date(msg.createdAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {error && (
          <p className="bg-white px-4 py-2 text-xs text-red-700">{error}</p>
        )}

        <form
          onSubmit={onSend}
          className="flex gap-2 border-t border-[#d6d0c8] bg-[#f0f2f5] p-3"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a WhatsApp message..."
            className="field flex-1 bg-white"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="btn btn-dark shrink-0"
          >
            {sending ? "..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
