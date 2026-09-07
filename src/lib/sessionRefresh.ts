import { API_URL } from "./api";
import { getRefreshToken, clearSession } from "./auth";

// Single shared refresh: one in-flight promise regardless of how many
// callers (api.ts request retry, RoleGate, tabs) need it. Prevents the
// refresh-token reuse detection from nuking all sessions.
let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((json as { message?: string }).message || `Refresh failed (${res.status})`);
    const data = (json as { data: { accessToken: string; refreshToken: string; user: unknown } }).data;
    if (!data?.accessToken || !data?.refreshToken) throw new Error("Invalid refresh response");
    if (typeof window !== "undefined") {
      window.localStorage.setItem("accessToken", data.accessToken);
      window.localStorage.setItem("refreshToken", data.refreshToken);
      window.localStorage.setItem("user", JSON.stringify(data.user));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("auth:refreshed"));
    }
    return true;
  } catch {
    return false;
  }
}

export function tryRefreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      // allow a new attempt on the NEXT call, not parallel ones
      setTimeout(() => {
        refreshPromise = null;
      }, 100);
    });
  }
  return refreshPromise;
}

export function handleRefreshFailure() {
  clearSession();
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}
