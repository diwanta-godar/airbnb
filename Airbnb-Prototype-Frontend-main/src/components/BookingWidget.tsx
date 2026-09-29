"use client";

import { FormEvent, useMemo, useState } from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import type { Property } from "@/lib/types";
import { apiFetch, formatMoney } from "@/lib/api";

export function BookingWidget({ property }: { property: Property }) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [bookingTime, setBookingTime] = useState("14:00");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    return Math.max(
      0,
      differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn))
    );
  }, [checkIn, checkOut]);

  const pricePerNight = Number(property.pricePerNight);
  const cleaningFee = Number(property.cleaningFee);
  const subtotal = pricePerNight * nights;
  const serviceFee = Math.round((subtotal * property.serviceFeePercent) / 100);
  const total = subtotal + cleaningFee + serviceFee;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (nights < 1) {
      setError("Choose valid check-in and check-out dates.");
      return;
    }

    setLoading(true);
    try {
      const booking = await apiFetch<{ id: string }>("/bookings/public", {
        method: "POST",
        body: {
          propertyId: property.id,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim(),
          checkIn,
          checkOut,
          guests,
          bookingTime,
          guestMessage: message || undefined,
        },
      });
      setSuccessId(booking.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setLoading(false);
    }
  }

  if (successId) {
    return (
      <div className="sticky top-24 border border-line bg-white p-5">
        <p className="font-brand text-2xl text-ink">Request received</p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Thanks {customerName.split(" ")[0] || ""}. We have your request for{" "}
          <span className="font-medium text-ink">{property.title}</span> from{" "}
          {checkIn} to {checkOut}. Our team will confirm shortly and may reach
          you on WhatsApp or email.
        </p>
        <button
          type="button"
          className="btn btn-dark mt-5 w-full"
          onClick={() => {
            setSuccessId(null);
            setMessage("");
          }}
        >
          Book another stay
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="sticky top-24 border border-line bg-white p-5"
    >
      <p className="text-2xl font-semibold text-ink">
        {formatMoney(property.pricePerNight, property.currency)}
        <span className="ml-1 text-base font-normal text-muted">/ night</span>
      </p>

      <div className="mt-5 grid gap-3">
        <label className="text-sm font-medium text-ink">
          Full name
          <input
            type="text"
            required
            minLength={2}
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="field mt-1"
            placeholder="Your name"
            autoComplete="name"
          />
        </label>
        <label className="text-sm font-medium text-ink">
          Phone / WhatsApp
          <input
            type="tel"
            required
            minLength={6}
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="field mt-1"
            placeholder="+977 98XXXXXXXX"
            autoComplete="tel"
          />
        </label>
        <label className="text-sm font-medium text-ink">
          Email
          <input
            type="email"
            required
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            className="field mt-1"
            placeholder="you@email.com"
            autoComplete="email"
          />
        </label>
        <label className="text-sm font-medium text-ink">
          Check-in
          <input
            type="date"
            required
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className="field mt-1"
          />
        </label>
        <label className="text-sm font-medium text-ink">
          Check-out
          <input
            type="date"
            required
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className="field mt-1"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium text-ink">
            Guests
            <input
              type="number"
              min={1}
              max={property.maxGuests}
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="field mt-1"
            />
          </label>
          <label className="text-sm font-medium text-ink">
            Arrival time
            <input
              type="time"
              value={bookingTime}
              onChange={(e) => setBookingTime(e.target.value)}
              className="field mt-1"
            />
          </label>
        </div>
        <label className="text-sm font-medium text-ink">
          Special requests
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="field mt-1"
            placeholder="Airport pickup, dietary notes, etc."
          />
        </label>
      </div>

      {nights > 0 && (
        <div className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <span>
              {formatMoney(pricePerNight, property.currency)} x {nights} nights
            </span>
            <span>{formatMoney(subtotal, property.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span>Cleaning fee</span>
            <span>{formatMoney(cleaningFee, property.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span>Service fee</span>
            <span>{formatMoney(serviceFee, property.currency)}</span>
          </div>
          <div className="flex justify-between border-t border-line pt-3 font-semibold">
            <span>Total</span>
            <span>{formatMoney(total, property.currency)}</span>
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      <button type="submit" disabled={loading} className="btn btn-dark mt-5 w-full">
        {loading ? "Sending request..." : "Request to book"}
      </button>
      <p className="mt-3 text-center text-xs text-muted">
        No account needed. We confirm by WhatsApp or email — no charge yet.
      </p>
    </form>
  );
}
