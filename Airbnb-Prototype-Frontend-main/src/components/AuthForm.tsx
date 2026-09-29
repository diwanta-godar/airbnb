"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { User } from "@/lib/types";
import { useAuthStore } from "@/store/auth";

export function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/admin";
  const setSession = useAuthStore((s) => s.setSession);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const body = {
      email: String(form.get("email")),
      password: String(form.get("password")),
    };

    try {
      const data = await apiFetch<{
        user: User;
        accessToken: string;
        refreshToken: string;
      }>("/auth/login", {
        method: "POST",
        body,
      });

      if (data.user.role !== "admin") {
        setError("This login is for administrators only.");
        return;
      }

      setSession(data);
      router.push(next.startsWith("/admin") ? next : "/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md border border-line bg-white p-6 md:p-8">
      <h1 className="font-brand text-3xl text-ink">Admin login</h1>
      <p className="mt-2 text-sm text-muted">
        Sign in to manage stays, bookings, and WhatsApp for The Lantern Stay.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input
          name="email"
          type="email"
          required
          placeholder="Admin email"
          autoComplete="username"
          className="field"
        />
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Password"
          autoComplete="current-password"
          className="field"
        />

        {error && <p className="text-sm text-red-700">{error}</p>}

        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? "Please wait..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
