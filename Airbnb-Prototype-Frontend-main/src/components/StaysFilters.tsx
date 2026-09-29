"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent } from "react";

export function StaysFilters() {
  const router = useRouter();
  const params = useSearchParams();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const next = new URLSearchParams();
    for (const key of ["search", "guests", "checkIn", "checkOut"]) {
      const value = String(form.get(key) || "");
      if (value) next.set(key, value);
    }
    router.push(`/stays?${next.toString()}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 border border-line bg-white p-3 md:grid-cols-5"
    >
      <input
        name="search"
        defaultValue={params.get("search") || ""}
        placeholder="Search"
        className="field md:col-span-2"
      />
      <input
        name="guests"
        type="number"
        min={1}
        defaultValue={params.get("guests") || ""}
        placeholder="Guests"
        className="field"
      />
      <input
        name="checkIn"
        type="date"
        defaultValue={params.get("checkIn") || ""}
        className="field"
      />
      <div className="flex gap-2">
        <input
          name="checkOut"
          type="date"
          defaultValue={params.get("checkOut") || ""}
          className="field"
        />
        <button type="submit" className="btn btn-dark shrink-0">
          Search
        </button>
      </div>
    </form>
  );
}
