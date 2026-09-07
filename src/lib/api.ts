const RAW_API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();
export const API_URL = RAW_API_URL.replace(/\/$/, ""); // empty => use Next.js rewrite proxy, otherwise absolute backend URL

import { tryRefreshSession, handleRefreshFailure } from "./sessionRefresh";
import { getAccessToken as getAccessTokenSync } from "./auth";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  token?: string | null;
  _retry?: boolean;
};

async function tryRefresh(): Promise<string | null> {
  const ok = await tryRefreshSession();
  return ok ? getAccessTokenSync() : null;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token, _retry } = options;
  const base = API_URL || "";
  const url = `${base}/api/v1${path}`;

  // Use provided token or fallback to stored access token
  const effectiveToken = token ?? getAccessTokenSync();

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));

  if (res.ok) {
    return json as T;
  }

  // Handle 401 - try refresh once (except for auth endpoints themselves).
  // Only genuine 401s trigger refresh; 429 (rate limit) and network errors must not log the user out.
  const isAuthPath = path.startsWith("/auth/login") || path.startsWith("/auth/refresh") || path.startsWith("/auth/register");
  if (res.status === 401 && !_retry && !isAuthPath) {
    const newToken = await tryRefresh();
    if (newToken) {
      // retry original request with new token
      return request<T>(path, { ...options, token: newToken, _retry: true });
    }
    handleRefreshFailure();
    throw new ApiError(401, "Session expired. Redirecting to login...");
  }

  throw new ApiError(
    res.status,
    (json as { message?: string }).message ?? (res.status === 401 ? "Invalid or expired token" : "Request failed")
  );
}

export const api = {
  get: <T>(path: string, token?: string | null) => request<T>(path, { token }),
  post: <T>(path: string, body?: unknown, token?: string | null) =>
    request<T>(path, { method: "POST", body, token }),
  patch: <T>(path: string, body?: unknown, token?: string | null) =>
    request<T>(path, { method: "PATCH", body, token }),
  put: <T>(path: string, body?: unknown, token?: string | null) =>
    request<T>(path, { method: "PUT", body, token }),
  delete: <T>(path: string, token?: string | null) => request<T>(path, { method: "DELETE", token }),
};
