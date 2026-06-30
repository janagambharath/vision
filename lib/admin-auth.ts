import { redirect } from "next/navigation";
import { auth } from "@/auth";

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email) redirect("/admin/login");
  return session;
}

export async function requireManager() {
  const session = await auth();
  if (!session?.user?.email) redirect("/admin/login");
  const role = (session.user as { role?: string }).role;
  if (!role || !["OWNER", "MANAGER"].includes(role)) {
    redirect("/admin?error=insufficient-permissions");
  }
  return session;
}

export async function requireOwner() {
  const session = await auth();
  if (!session?.user?.email) redirect("/admin/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "OWNER") {
    redirect("/admin?error=owner-only");
  }
  return session;
}
