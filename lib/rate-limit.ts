import { createHmac } from "node:crypto";
import { getRedisClient } from "@/lib/redis";

type RateLimitOptions = {
  keyPrefix: string;
  limit: number;
  windowSeconds: number;
};

type RateLimitSource = "redis" | "memory" | "degraded-memory" | "fail-closed";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  source: RateLimitSource;
  degraded: boolean;
};

export type RateLimitReadiness = {
  ready: boolean;
  source: Exclude<RateLimitSource, "fail-closed">;
  redisConfigured: boolean;
  redisRequired: boolean;
};

const MEMORY_LIMITER_MAX_KEYS = 10_000;
const MEMORY_LIMITER_PRUNE_INTERVAL_MS = 30_000;

const globalForRateLimit = globalThis as unknown as {
  vvRateLimit?: Map<string, { count: number; resetAt: number }>;
  vvRateLimitLastPruneAt?: number;
  vvRateLimitLastDegradationLogAt?: number;
};

function redisConfigured() {
  return Boolean(process.env.REDIS_URL?.trim());
}

function redisRequired() {
  return process.env.REQUIRE_REDIS_FOR_RATE_LIMITS?.trim().toLowerCase() === "true";
}

function rateLimitStorageKey(key: string) {
  // Phone numbers and client IPs must not be stored verbatim in Redis keys or logs.
  // An HMAC prevents straightforward enumeration of the small phone-number space.
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "vision-vistara-local-rate-limit-key";
  return createHmac("sha256", secret).update(key).digest("base64url");
}

function pruneMemoryStore(store: Map<string, { count: number; resetAt: number }>, now: number) {
  if ((globalForRateLimit.vvRateLimitLastPruneAt ?? 0) + MEMORY_LIMITER_PRUNE_INTERVAL_MS > now) return;

  globalForRateLimit.vvRateLimitLastPruneAt = now;
  for (const [entryKey, entry] of store) {
    if (entry.resetAt <= now) store.delete(entryKey);
  }
}

function memoryRateLimit(key: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const store = (globalForRateLimit.vvRateLimit ??= new Map());
  pruneMemoryStore(store, now);
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    // A Redis outage must not let unique-IP floods grow this fallback map without bound.
    // New keys are rejected when the bounded emergency limiter is saturated; existing
    // clients retain their normal window behavior.
    if (!current && store.size >= MEMORY_LIMITER_MAX_KEYS) {
      return { allowed: false, remaining: 0, saturated: true };
    }
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: Math.max(0, limit - 1), saturated: false };
  }

  current.count += 1;
  return {
    allowed: current.count <= limit,
    remaining: Math.max(0, limit - current.count),
    saturated: false
  };
}

function logRateLimitDegradation(event: "redis_unavailable" | "redis_command_failed" | "memory_saturated") {
  const now = Date.now();
  if (now - (globalForRateLimit.vvRateLimitLastDegradationLogAt ?? 0) < 60_000) return;

  globalForRateLimit.vvRateLimitLastDegradationLogAt = now;
  console.error(JSON.stringify({
    level: "error",
    event: `rate_limit_${event}`,
    redisConfigured: redisConfigured(),
    redisRequired: redisRequired()
  }));
}

function fallbackRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
  source: "memory" | "degraded-memory"
): RateLimitResult {
  const result = memoryRateLimit(key, limit, windowSeconds);
  if (result.saturated) logRateLimitDegradation("memory_saturated");

  return {
    allowed: result.allowed,
    remaining: result.remaining,
    source,
    degraded: source === "degraded-memory" || result.saturated
  };
}

export function getClientIp(headers: Headers) {
  // Railway and other reverse proxies should overwrite these headers. Prefer a
  // single-value header when available, then fall back to the original client
  // address in a standard X-Forwarded-For chain.
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || "unknown";
}

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const storageKey = rateLimitStorageKey(key);
  const redis = await getRedisClient().catch(() => null);
  if (!redis) {
    if (!redisConfigured()) return fallbackRateLimit(storageKey, limit, windowSeconds, "memory");

    logRateLimitDegradation("redis_unavailable");
    if (redisRequired()) {
      return { allowed: false, remaining: 0, source: "fail-closed", degraded: true };
    }
    return fallbackRateLimit(storageKey, limit, windowSeconds, "degraded-memory");
  }

  const now = Date.now();
  const windowKey = `rl:v2:${storageKey}:${Math.floor(now / (windowSeconds * 1000))}`;

  try {
    // This Lua operation is atomic. A separate INCR then EXPIRE could leave an
    // unbounded key behind if the process failed between the two commands.
    const count = Number(await redis.eval(
      "local count = redis.call('INCR', KEYS[1]); if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return count;",
      1,
      windowKey,
      String(windowSeconds)
    ));

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      source: "redis",
      degraded: false
    };
  } catch {
    logRateLimitDegradation("redis_command_failed");
    if (redisRequired()) {
      return { allowed: false, remaining: 0, source: "fail-closed", degraded: true };
    }
    return fallbackRateLimit(storageKey, limit, windowSeconds, "degraded-memory");
  }
}

/**
 * Used by the readiness endpoint and production preflight. Redis is optional
 * in local development, but production can opt into fail-closed public
 * mutation protection with REQUIRE_REDIS_FOR_RATE_LIMITS=true.
 */
export async function getRateLimitReadiness(): Promise<RateLimitReadiness> {
  const configured = redisConfigured();
  const required = redisRequired();

  if (!configured) {
    return { ready: !required, source: "memory", redisConfigured: false, redisRequired: required };
  }

  const redis = await getRedisClient().catch(() => null);
  if (!redis) {
    logRateLimitDegradation("redis_unavailable");
    return { ready: !required, source: "degraded-memory", redisConfigured: true, redisRequired: required };
  }

  try {
    await redis.ping();
    return { ready: true, source: "redis", redisConfigured: true, redisRequired: required };
  } catch {
    logRateLimitDegradation("redis_command_failed");
    return { ready: !required, source: "degraded-memory", redisConfigured: true, redisRequired: required };
  }
}

export async function isRateLimited(request: Request, options: RateLimitOptions) {
  const ip = getClientIp(request.headers);
  const key = `${options.keyPrefix}:${ip}`;
  const result = await rateLimit(key, options.limit, options.windowSeconds);
  return !result.allowed;
}
