import type { Metadata } from "next";
import { Suspense } from "react";
import { PropertyCard } from "@/components/PropertyCard";
import { apiFetch } from "@/lib/api";
import type { PaginatedProperties } from "@/lib/types";
import { StaysFilters } from "@/components/StaysFilters";

export const metadata: Metadata = {
  title: "Stays",
};

async function getStays(searchParams: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (searchParams.city) params.set("city", searchParams.city);
  if (searchParams.guests) params.set("guests", searchParams.guests);
  if (searchParams.minPrice) params.set("minPrice", searchParams.minPrice);
  if (searchParams.maxPrice) params.set("maxPrice", searchParams.maxPrice);
  if (searchParams.search) params.set("search", searchParams.search);
  if (searchParams.sort) params.set("sort", searchParams.sort);
  if (searchParams.checkIn) params.set("checkIn", searchParams.checkIn);
  if (searchParams.checkOut) params.set("checkOut", searchParams.checkOut);
  params.set("limit", "12");

  try {
    return await apiFetch<PaginatedProperties>(`/properties?${params.toString()}`);
  } catch {
    return {
      items: [],
      pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
    };
  }
}

export default async function StaysPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const data = await getStays(sp);

  return (
    <div className="page-shell px-4 md:px-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="font-brand text-4xl text-ink">Stays in Kathmandu</h1>
        <p className="mt-2 text-muted">
          Entire homes and private suites from The Lantern Stay.
        </p>

        <div className="mt-8">
          <Suspense fallback={<div className="h-14 border border-line bg-white" />}>
            <StaysFilters />
          </Suspense>
        </div>

        <p className="mt-6 text-sm text-muted">
          {data.pagination.total} stay
          {data.pagination.total === 1 ? "" : "s"}
        </p>

        <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>

        {!data.items.length && (
          <p className="mt-8 border border-line bg-white p-6 text-muted">
            No stays matched your search. Try different dates or guest count.
          </p>
        )}
      </div>
    </div>
  );
}
