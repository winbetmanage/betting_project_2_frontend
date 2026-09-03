export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  balance: number | string;
  themeMode?: string | null;
  themeColor?: string | null;
};

export type Role = AuthUser["role"];

const ACCESS_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";
const USER_KEY = "user";

export const getAccessToken = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_KEY);
};

export const getRefreshToken = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_KEY);
};

export const getUser = (): AuthUser | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

export const setSession = (accessToken: string, refreshToken: string, user: AuthUser) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_KEY, accessToken);
  window.localStorage.setItem(REFRESH_KEY, refreshToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearSession = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
  window.localStorage.removeItem(USER_KEY);
};

export const isAuthenticated = () => {
  if (typeof window === "undefined") return false;
  return !!window.localStorage.getItem(ACCESS_KEY);
};

export const getUserRole = (): Role | null => {
  if (typeof window === "undefined") return null;

  const cached = getUser();
  if (cached && typeof cached.role === "string" && cached.role.length > 0) {
    return cached.role as Role;
  }

  const token = getAccessToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const role = payload?.role;
    return typeof role === "string" && role.length > 0 ? (role as Role) : null;
  } catch {
    return null;
  }
};

export const getTokenExp = (token: string | null): number | null => {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

export const isTokenExpired = (token: string | null): boolean => {
  if (!token) return true;
  const exp = getTokenExp(token);
  if (!exp) return false;
  return Date.now() >= exp - 10_000; // 10s clock skew buffer
};

export const isAccessTokenExpired = (): boolean => {
  if (typeof window === "undefined") return true;
  return isTokenExpired(getAccessToken());
};

export const clearAndRedirectToLogin = () => {
  clearSession();
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
};
