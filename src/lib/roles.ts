import type { Role } from "./auth";

/**
 * The sub-admin role exists under two spellings:
 *  - `SUB_ADMIN` is the member declared in the Prisma schema (database enum).
 *  - `SUBADMIN` is the spelling used by the API contract and the UI.
 *
 * The value returned by the API follows the database enum, so every role check
 * goes through these helpers and stays correct for either spelling.
 */
export const SUBADMIN_ROLES = ["SUBADMIN", "SUB_ADMIN"] as const;

export const isSubAdminRole = (role?: string | null): boolean =>
  !!role && (SUBADMIN_ROLES as readonly string[]).includes(role);

export const isAdminRole = (role?: string | null): boolean => role === "ADMIN";

/** Expand a required-roles list so either sub-admin spelling matches. */
export const expandRoles = (roles: readonly Role[] | readonly string[]): string[] => {
  const out: string[] = [];
  for (const role of roles) {
    out.push(role);
    if (isSubAdminRole(role)) out.push(...SUBADMIN_ROLES);
  }
  return Array.from(new Set(out));
};

export const roleMatches = (userRole: string, allowed: readonly string[]): boolean =>
  expandRoles(allowed).includes(userRole);

/** Where a user of the given role belongs after login. */
export const homePathForRole = (role?: string | null): string => {
  if (role === "ADMIN") return "/admin";
  if (role === "AGENT") return "/agent";
  if (isSubAdminRole(role)) return "/subadmin";
  return "/";
};

/** Canonical UI spelling for a role value coming from the API. */
export const displayRole = (role?: string | null): string => (isSubAdminRole(role) ? "SUBADMIN" : (role ?? ""));
