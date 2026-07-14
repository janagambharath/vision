import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Protect all admin routes and admin API routes at the edge
  matcher: ["/admin/:path*", "/api/admin/:path*"]
};
