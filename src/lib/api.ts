const RAW_API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();
const API_URL = RAW_API_URL.replace(/\/$/, ""); // empty => use Next.js rewrite proxy, otherwise absolute backend URL

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

// Shared refresh promise to avoid parallel refresh storms
let refreshPromise: Promise<string | null> | null = null;

function getRefreshTokenSync(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("refreshToken");
}

function getAccessTokenSync(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("accessToken");
}

async function tryRefresh(): Promise<string | null> {
  const refreshToken = getRefreshTokenSync();
  if (!refreshToken) return null;
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const base = API_URL || "";
      const res = await fetch(`${base}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { message?: string }).message || "Refresh failed");
      const data = (json as { data: { accessToken: string; refreshToken: string; user: unknown } }).data;
      if (!data?.accessToken || !data?.refreshToken) throw new Error("Invalid refresh response");
      if (typeof window !== "undefined") {
        window.localStorage.setItem("accessToken", data.accessToken);
        window.localStorage.setItem("refreshToken", data.refreshToken);
        window.localStorage.setItem("user", JSON.stringify(data.user));
        // notify other tabs / components
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new CustomEvent("auth:refreshed"));
      }
      return data.accessToken;
    } catch {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("accessToken");
        window.localStorage.removeItem("refreshToken");
        window.localStorage.removeItem("user");
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
      return null;
    } finally {
      // reset after a tick to allow waiting callers to get result
      setTimeout(() => {
        refreshPromise = null;
      }, 100);
    }
  })();

  return refreshPromise;
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

  // Handle 401 - try refresh once (except for auth endpoints themselves)
  const isAuthPath = path.startsWith("/auth/login") || path.startsWith("/auth/refresh") || path.startsWith("/auth/register");
  if (res.status === 401 && !_retry && !isAuthPath) {
    const newToken = await tryRefresh();
    if (newToken) {
      // retry original request with new token
      return request<T>(path, { ...options, token: newToken, _retry: true });
    }
    // tryRefresh already redirected to /login on failure
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
