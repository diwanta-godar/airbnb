"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  bookingsCount: number;
  lastBookingAt: string;
};

export default function AdminCustomersPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    apiFetch<Customer[]>("/admin/customers", { token })
      .then(setCustomers)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load customers")
      );
  }, [token]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-brand text-3xl">Customers</h2>
        <p className="mt-1 text-muted">
          Guest contacts collected from bookings.
        </p>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto border border-[#e8dfd4] bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[#e8dfd4] bg-[#faf8f5] text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Bookings</th>
              <th className="px-4 py-3">Last booking</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-[#eee7de]">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3">{c.email || "—"}</td>
                <td className="px-4 py-3">{c.phone || "—"}</td>
                <td className="px-4 py-3">{c.bookingsCount}</td>
                <td className="px-4 py-3 text-muted">
                  {new Date(c.lastBookingAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!customers.length && (
          <p className="p-6 text-muted">No booking guests yet.</p>
        )}
      </div>
    </div>
  );
}
