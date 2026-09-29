"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { apiFetch, formatMoney } from "@/lib/api";
import type { Booking } from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { WhatsAppChatModal } from "@/components/admin/WhatsAppChatModal";

export default function AdminBookingsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [chat, setChat] = useState<{
    phone: string;
    name: string;
  } | null>(null);

  async function load() {
    if (!token) return;
    try {
      const data = await apiFetch<Booking[]>("/admin/bookings", { token });
      setBookings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookings");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function updateStatus(id: string, status: string) {
    if (!token) return;
    setBusyId(id);
    try {
      await apiFetch(`/admin/bookings/${id}/status`, {
        method: "PATCH",
        token,
        body: { status },
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  function openChat(booking: Booking, name: string) {
    const phone = booking.customerPhone || booking.guest?.phone || "";
    if (!phone) {
      setError("This booking has no phone number for WhatsApp.");
      return;
    }
    setError("");
    setChat({ phone, name });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-brand text-3xl">Bookings</h2>
        <p className="mt-1 text-muted">
          Confirm or reject customer stay requests. Message guests on WhatsApp.
        </p>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="space-y-3">
        {bookings.map((booking) => {
          const name =
            booking.customerName ||
            `${booking.guest?.firstName || ""} ${booking.guest?.lastName || ""}`.trim() ||
            "Guest";
          const phone = booking.customerPhone || booking.guest?.phone;
          return (
            <article
              key={booking.id}
              className="border border-[#e8dfd4] bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{name}</p>
                  <p className="mt-1 text-sm text-muted">
                    {booking.customerEmail || booking.guest?.email} ·{" "}
                    {phone || "No phone"}
                  </p>
                  <p className="mt-2 text-sm">
                    {booking.property?.title} · {booking.checkIn} →{" "}
                    {booking.checkOut} · {booking.guests} guests
                  </p>
                  {booking.guestMessage && (
                    <p className="mt-2 text-sm text-muted">
                      Note: {booking.guestMessage}
                    </p>
                  )}
                  <p className="mt-2 text-sm font-semibold">
                    {formatMoney(booking.totalPrice, booking.currency)}
                  </p>
                </div>
                <span className="border border-line px-2 py-1 text-xs uppercase tracking-wide">
                  {booking.status}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!phone}
                  onClick={() => openChat(booking, name)}
                  className="inline-flex items-center gap-2 border border-[#25D366]/40 bg-[#25D366]/10 px-4 py-2 text-sm font-semibold text-[#128C7E] disabled:opacity-40"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </button>

                {booking.status === "pending" && (
                  <>
                    <button
                      type="button"
                      disabled={busyId === booking.id}
                      onClick={() => updateStatus(booking.id, "confirmed")}
                      className="btn btn-dark"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      disabled={busyId === booking.id}
                      onClick={() => updateStatus(booking.id, "rejected")}
                      className="border border-line px-4 py-2 text-sm font-semibold"
                    >
                      Reject
                    </button>
                  </>
                )}
                {booking.status === "confirmed" && (
                  <button
                    type="button"
                    disabled={busyId === booking.id}
                    onClick={() => updateStatus(booking.id, "completed")}
                    className="border border-line px-4 py-2 text-sm font-semibold"
                  >
                    Mark completed
                  </button>
                )}
              </div>
            </article>
          );
        })}
        {!bookings.length && (
          <p className="border border-[#e8dfd4] bg-white p-6 text-muted">
            No bookings yet.
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
