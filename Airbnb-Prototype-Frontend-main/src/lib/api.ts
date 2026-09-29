import type { ApiResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const API_ORIGIN = API_URL.replace(/\/api$/, "");

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  cache?: RequestCache;
  /** Internal: skip refresh retry to avoid loops */
  _retry?: boolean;
};

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function isAuthPath(path: string) {
  return (
    path.startsWith("/auth/login") ||
    path.startsWith("/auth/register") ||
    path.startsWith("/auth/refresh") ||
    path.startsWith("/auth/logout")
  );
}

async function tryRefreshAccessToken(): Promise<string | null> {
  // Lazy import avoids circular deps with auth store consumers
  const { useAuthStore } = await import("@/store/auth");
  return useAuthStore.getState().refreshSession();
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  // Prefer explicit token, else current store token
  let token = options.token;
  if (token === undefined) {
    try {
      const { useAuthStore } = await import("@/store/auth");
      token = useAuthStore.getState().accessToken;
    } catch {
      token = null;
    }
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: "include",
    cache: options.cache || "no-store",
  });

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await res.json()) as ApiResponse<T>;
  } catch {
    // empty body
  }

  if (
    res.status === 401 &&
    !options._retry &&
    !isAuthPath(path) &&
    (options.token || token)
  ) {
    const nextToken = await tryRefreshAccessToken();
    if (nextToken) {
      return apiFetch<T>(path, {
        ...options,
        token: nextToken,
        _retry: true,
      });
    }
  }

  if (!res.ok || !payload?.success) {
    throw new ApiError(
      payload?.message || "Request failed",
      res.status,
      payload?.details
    );
  }

  return payload.data;
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
  options: { method?: string; token?: string | null; _retry?: boolean } = {}
): Promise<T> {
  const headers: HeadersInit = {};

  let token = options.token;
  if (token === undefined) {
    try {
      const { useAuthStore } = await import("@/store/auth");
      token = useAuthStore.getState().accessToken;
    } catch {
      token = null;
    }
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method || "POST",
    headers,
    body: formData,
    credentials: "include",
  });

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await res.json()) as ApiResponse<T>;
  } catch {
    // empty body
  }

  if (res.status === 401 && !options._retry && (options.token || token)) {
    const nextToken = await tryRefreshAccessToken();
    if (nextToken) {
      return apiUpload<T>(path, formData, {
        ...options,
        token: nextToken,
        _retry: true,
      });
    }
  }

  if (!res.ok || !payload?.success) {
    throw new ApiError(
      payload?.message || "Upload failed",
      res.status,
      payload?.details
    );
  }

  return payload.data;
}

export function mediaUrl(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

export function formatMoney(amount: string | number, currency = "NPR") {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function coverImage(images?: { url: string; isCover: boolean }[]) {
  if (!images?.length) {
    return "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80";
  }
  const url = images.find((i) => i.isCover)?.url || images[0].url;
  return mediaUrl(url);
}
