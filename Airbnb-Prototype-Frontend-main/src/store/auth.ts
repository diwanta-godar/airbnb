"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
  setSession: (data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  }) => void;
  clearSession: () => void;
  /** Exchange refresh token for a new access (+ rotated refresh) token */
  refreshSession: () => Promise<string | null>;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

let refreshInFlight: Promise<string | null> | null = null;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      hydrated: false,
      setHydrated: (value) => set({ hydrated: value }),
      setSession: ({ user, accessToken, refreshToken }) =>
        set({ user, accessToken, refreshToken }),
      clearSession: () =>
        set({ user: null, accessToken: null, refreshToken: null }),

      refreshSession: async () => {
        if (refreshInFlight) return refreshInFlight;

        refreshInFlight = (async () => {
          const currentRefresh = get().refreshToken;
          if (!currentRefresh) {
            get().clearSession();
            return null;
          }

          try {
            const res = await fetch(`${API_URL}/auth/refresh`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ refreshToken: currentRefresh }),
              cache: "no-store",
            });

            const payload = (await res.json().catch(() => null)) as {
              success?: boolean;
              data?: {
                user: User;
                accessToken: string;
                refreshToken: string;
              };
              message?: string;
            } | null;

            if (!res.ok || !payload?.success || !payload.data?.accessToken) {
              get().clearSession();
              return null;
            }

            set({
              user: payload.data.user,
              accessToken: payload.data.accessToken,
              refreshToken: payload.data.refreshToken,
            });
            return payload.data.accessToken;
          } catch {
            get().clearSession();
            return null;
          } finally {
            refreshInFlight = null;
          }
        })();

        return refreshInFlight;
      },

      refreshProfile: async () => {
        const token = get().accessToken;
        if (!token && !get().refreshToken) return;

        try {
          let access = get().accessToken;
          let res = await fetch(`${API_URL}/auth/me`, {
            headers: access ? { Authorization: `Bearer ${access}` } : {},
            credentials: "include",
            cache: "no-store",
          });

          if (res.status === 401) {
            access = await get().refreshSession();
            if (!access) return;
            res = await fetch(`${API_URL}/auth/me`, {
              headers: { Authorization: `Bearer ${access}` },
              credentials: "include",
              cache: "no-store",
            });
          }

          const payload = (await res.json().catch(() => null)) as {
            success?: boolean;
            data?: User;
          } | null;

          if (!res.ok || !payload?.success || !payload.data) {
            get().clearSession();
            return;
          }
          set({ user: payload.data });
        } catch {
          // keep existing session on network blips
        }
      },

      logout: async () => {
        try {
          await fetch(`${API_URL}/auth/logout`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(get().accessToken
                ? { Authorization: `Bearer ${get().accessToken}` }
                : {}),
            },
            credentials: "include",
            body: JSON.stringify({ refreshToken: get().refreshToken }),
          });
        } catch {
          // ignore
        }
        set({ user: null, accessToken: null, refreshToken: null });
      },
    }),
    {
      name: "lantern-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
