import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRateLimitReadiness } from "@/lib/rate-limit";

export async function GET() {
  const databaseConfigured = Boolean(process.env.DATABASE_URL);
  const [database, rateLimit] = await Promise.all([
    prisma.$queryRaw`SELECT 1`
      .then(() => "connected" as const)
      .catch(() => databaseConfigured ? "unavailable" as const : "not_configured" as const),
    getRateLimitReadiness()
  ]);

  const databaseReady = database === "connected" || database === "not_configured";
  const ok = databaseReady && rateLimit.ready;

  return NextResponse.json(
    {
      ok,
      database,
      rateLimit: {
        status: rateLimit.source,
        redisConfigured: rateLimit.redisConfigured,
        redisRequired: rateLimit.redisRequired
      },
      ...(ok ? {} : {
        message: database === "unavailable"
          ? "Database connection failed"
          : "Distributed rate limiting is unavailable"
      })
    },
    { status: ok ? 200 : 503 }
  );
}
