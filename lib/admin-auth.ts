import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const ADMIN_ROLES = ["OWNER", "MANAGER", "STAFF"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export type AdminAccess = {
  session: Session;
  role: AdminRole;
};

/**
 * Returns a recognised administrative role only. Do not treat an arbitrary
 * role claim as admin access: a stale or malformed JWT must not gain access
 * to the admin surface.
 */
export function getAdminRole(session: Session | null | undefined): AdminRole | null {
  const role = session?.user?.role;
  return typeof role === "string" && ADMIN_ROLES.includes(role as AdminRole)
    ? role as AdminRole
    : null;
}

export function isManagerOrOwner(role: AdminRole | null | undefined) {
  return role === "OWNER" || role === "MANAGER";
}

/**
 * Non-redirecting admin access check for route handlers and other callers
 * that need to return a correct HTTP 401/403 response.
 */
export async function getAdminAccess(): Promise<AdminAccess | null> {
  const session = await auth();
  const sessionUser = session?.user;
  if (!sessionUser?.email || !sessionUser.id) return null;

  // JWT claims are convenient for rendering, but role changes and account
  // deactivation must take effect immediately for every privileged mutation.
  const admin = await prisma.adminUser.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, email: true, active: true, role: true }
  });
  if (!admin?.active || admin.email !== sessionUser.email) return null;

  const role = admin.role as AdminRole;
  return {
    session: {
      ...session,
      user: { ...sessionUser, id: admin.id, email: admin.email, role }
    } as Session,
    role
  };
}

export async function requireAdmin() {
  const access = await getAdminAccess();
  if (!access) redirect("/admin/login");
  return access.session;
}

export async function requireManager() {
  const access = await getAdminAccess();
  if (!access) redirect("/admin/login");
  if (!isManagerOrOwner(access.role)) {
    redirect("/admin?error=insufficient-permissions");
  }
  return access.session;
}

export async function requireOwner() {
  const access = await getAdminAccess();
  if (!access) redirect("/admin/login");
  if (access.role !== "OWNER") {
    redirect("/admin?error=owner-only");
  }
  return access.session;
}
