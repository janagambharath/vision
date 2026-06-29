import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, database: "connected" });
  } catch {
    return NextResponse.json(
      {
        ok: !process.env.DATABASE_URL,
        database: "unavailable",
        message: process.env.DATABASE_URL ? "Database connection failed" : "DATABASE_URL is not configured"
      },
      { status: process.env.DATABASE_URL ? 503 : 200 }
    );
  }
}
