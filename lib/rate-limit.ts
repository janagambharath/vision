import { redis } from "@/lib/redis";

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  if (!redis) {
    return { allowed: true, remaining: limit };
  }

  const now = Date.now();
  // Group keys into window buckets based on timestamp
  const windowKey = `rl:${key}:${Math.floor(now / (windowSeconds * 1000))}`;

  try {
    const count = await redis.incr(windowKey);
    if (count === 1) {
      await redis.expire(windowKey, windowSeconds);
    }

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count)
    };
  } catch (err) {
    console.warn("⚠️ Rate limiter failed (degrading gracefully):", err);
    return { allowed: true, remaining: limit };
  }
}
