"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BedDouble, CalendarCheck, Users, MessageCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { AdminStats, Booking } from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { formatMoney } from "@/lib/api";

export default function AdminOverviewPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recent, setRecent] = useState<Booking[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    Promise.all([
      apiFetch<AdminStats>("/admin/stats", { token }),
      apiFetch<Booking[]>("/admin/bookings", { token }),
    ])
      .then(([s, bookings]) => {
        setStats(s);
        setRecent(bookings.slice(0, 6));
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load overview")
      );
  }, [token]);

  const cards = [
    {
      label: "Stays",
      value: stats?.properties ?? "—",
      href: "/admin/stays",
      icon: BedDouble,
    },
    {
      label: "Bookings",
      value: stats?.bookings ?? "—",
      href: "/admin/bookings",
      icon: CalendarCheck,
    },
    {
      label: "Customers",
      value: stats?.users ?? "—",
      href: "/admin/customers",
      icon: Users,
    },
    {
      label: "Pending",
      value: stats?.pendingBookings ?? "—",
      href: "/admin/bookings",
      icon: MessageCircle,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-brand text-3xl">Company operations</h2>
        <p className="mt-1 text-muted">
          Manage stays, bookings, customers, and WhatsApp from one place.
        </p>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="border border-[#e8dfd4] bg-white p-5 transition hover:border-[#d4c4b0]"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted">{card.label}</p>
                <Icon className="h-4 w-4 text-muted" />
              </div>
              <p className="mt-3 font-brand text-3xl">{card.value}</p>
            </Link>
          );
        })}
      </div>

      <section className="border border-[#e8dfd4] bg-white">
        <div className="flex items-center justify-between border-b border-[#e8dfd4] px-5 py-4">
          <h3 className="font-semibold">Recent bookings</h3>
          <Link href="/admin/bookings" className="text-sm text-accent underline">
            View all
          </Link>
        </div>
        <div className="divide-y divide-[#eee7de]">
          {recent.map((b) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm"
            >
              <div>
                <p className="font-medium">
                  {b.customerName ||
                    `${b.guest?.firstName || ""} ${b.guest?.lastName || ""}`.trim() ||
                    "Guest"}
                </p>
                <p className="text-muted">
                  {b.property?.title} · {b.checkIn} → {b.checkOut}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">
                  {formatMoney(b.totalPrice, b.currency)}
                </p>
                <p className="uppercase tracking-wide text-muted">{b.status}</p>
              </div>
            </div>
          ))}
          {!recent.length && (
            <p className="px-5 py-8 text-muted">No bookings yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
