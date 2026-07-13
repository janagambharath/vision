import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const MAX_FAILED_ADMIN_LOGINS = 5;
const ADMIN_LOCKOUT_MS = 15 * 60 * 1000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/admin/login"
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const admin = await prisma.adminUser.findUnique({
          where: { email: parsed.data.email }
        });

        if (!admin || !admin.active) return null;

        if (admin.lockedUntil && admin.lockedUntil > new Date()) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(parsed.data.password, admin.passwordHash);
        if (!passwordMatches) {
          const failedLogins = admin.failedLogins + 1;
          await prisma.adminUser.update({
            where: { id: admin.id },
            data: {
              failedLogins,
              lockedUntil: failedLogins >= MAX_FAILED_ADMIN_LOGINS ? new Date(Date.now() + ADMIN_LOCKOUT_MS) : null
            }
          });
          await prisma.activityLog.create({
            data: {
              adminUserId: admin.id,
              action: "ADMIN_LOGIN_FAILED",
              entityType: "AdminUser",
              entityId: admin.id,
              metadata: { email: admin.email, failedLogins }
            }
          }).catch(() => null);
          return null;
        }

        await prisma.adminUser.update({
          where: { id: admin.id },
          data: {
            failedLogins: 0,
            lockedUntil: null,
            lastLoginAt: new Date()
          }
        });
        await prisma.activityLog.create({
          data: {
            adminUserId: admin.id,
            action: "ADMIN_LOGIN_SUCCEEDED",
            entityType: "AdminUser",
            entityId: admin.id,
            metadata: { email: admin.email }
          }
        }).catch(() => null);

        return {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (typeof token.id === "string") session.user.id = token.id;
        if (typeof token.role === "string") session.user.role = token.role;
      }
      return session;
    }
  }
});
