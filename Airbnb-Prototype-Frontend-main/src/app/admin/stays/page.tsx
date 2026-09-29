"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, coverImage, formatMoney } from "@/lib/api";
import type { Property } from "@/lib/types";
import { useAuthStore } from "@/store/auth";

export default function AdminStaysPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [items, setItems] = useState<Property[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    try {
      const data = await apiFetch<Property[]>("/admin/properties", { token });
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stays");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function deactivate(id: string) {
    if (!token) return;
    if (!confirm("Deactivate this stay? It will hide from the public site.")) return;
    setBusyId(id);
    try {
      await apiFetch(`/admin/properties/${id}`, {
        method: "DELETE",
        token,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-brand text-3xl">Stays</h2>
          <p className="mt-1 text-muted">Create and update listings with photos.</p>
        </div>
        <Link href="/admin/stays/new" className="btn btn-dark">
          Add stay
        </Link>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="space-y-3">
        {items.map((property) => (
          <article
            key={property.id}
            className="flex flex-col gap-4 border border-[#e8dfd4] bg-white p-4 sm:flex-row"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImage(property.images)}
              alt={property.title}
              className="h-28 w-full object-cover sm:w-40"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{property.title}</h3>
                  <p className="mt-1 text-sm text-muted">
                    {property.city} · {property.maxGuests} guests ·{" "}
                    {formatMoney(property.pricePerNight, property.currency)}/night
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-muted">
                    {property.isActive ? "Active" : "Inactive"}
                    {property.isFeatured ? " · Featured" : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/admin/stays/${property.id}`}
                    className="border border-line px-3 py-2 text-sm font-medium"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    disabled={busyId === property.id || !property.isActive}
                    onClick={() => deactivate(property.id)}
                    className="border border-line px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-40"
                  >
                    Deactivate
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
        {!items.length && (
          <p className="border border-[#e8dfd4] bg-white p-6 text-muted">
            No stays yet. Add your first listing.
          </p>
        )}
      </div>
    </div>
  );
}
