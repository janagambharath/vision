export { auth as middleware } from "@/auth";

export const config = {
  // Protect all admin routes and admin API routes at the edge
  matcher: ["/admin/:path*", "/api/admin/:path*"]
};
