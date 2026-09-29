"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, mediaUrl } from "@/lib/api";
import type { HeroSlide } from "@/lib/types";
import { useAuthStore } from "@/store/auth";

export default function AdminHeroPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [items, setItems] = useState<HeroSlide[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    try {
      const data = await apiFetch<HeroSlide[]>("/admin/hero-slides", { token });
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load slides");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function remove(id: string) {
    if (!token) return;
    if (!confirm("Delete this hero slide permanently?")) return;
    setBusyId(id);
    try {
      await apiFetch(`/admin/hero-slides/${id}`, {
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
          <h2 className="font-brand text-3xl">Hero slides</h2>
          <p className="mt-1 text-muted">
            Manage landing page slider images and copy.
          </p>
        </div>
        <Link href="/admin/hero/new" className="btn btn-dark">
          Add slide
        </Link>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="space-y-3">
        {items.map((slide) => (
          <article
            key={slide.id}
            className="flex flex-col gap-4 border border-[#e8dfd4] bg-white p-4 sm:flex-row"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaUrl(slide.imageUrl) || slide.imageUrl}
              alt={slide.imageAlt || slide.title}
              className="h-28 w-full object-cover sm:w-44"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{slide.title}</h3>
                  {slide.subtitle && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted">
                      {slide.subtitle}
                    </p>
                  )}
                  <p className="mt-1 text-xs uppercase tracking-wide text-muted">
                    Order {slide.sortOrder}
                    {slide.isActive ? " · Active" : " · Hidden"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/admin/hero/${slide.id}`}
                    className="border border-line px-3 py-2 text-sm font-medium"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    disabled={busyId === slide.id}
                    onClick={() => remove(slide.id)}
                    className="border border-line px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-40"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
        {!items.length && (
          <p className="border border-[#e8dfd4] bg-white p-6 text-muted">
            No hero slides yet. Add your first slide.
          </p>
        )}
      </div>
    </div>
  );
}
