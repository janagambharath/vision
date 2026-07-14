import { getRedisClient } from "@/lib/redis";

type RateLimitOptions = {
  keyPrefix: string;
  limit: number;
  windowSeconds: number;
};

const globalForRateLimit = globalThis as unknown as {
  vvRateLimit?: Map<string, { count: number; resetAt: number }>;
};

function memoryRateLimit(key: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const store = (globalForRateLimit.vvRateLimit ??= new Map());
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: Math.max(0, limit - 1) };
  }

  current.count += 1;
  return { allowed: current.count <= limit, remaining: Math.max(0, limit - current.count) };
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || "unknown";
}

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const redis = await getRedisClient();
  if (!redis) {
    return memoryRateLimit(key, limit, windowSeconds);
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
    return memoryRateLimit(key, limit, windowSeconds);
  }
}

export async function isRateLimited(request: Request, options: RateLimitOptions) {
  const ip = getClientIp(request);
  const key = `${options.keyPrefix}:${ip}`;
  const result = await rateLimit(key, options.limit, options.windowSeconds);
  return !result.allowed;
}
