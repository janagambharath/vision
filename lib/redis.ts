import Redis from "ioredis";

let redis: Redis | null = null;

if (process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      reconnectOnError: () => false
    });
    
    redis.on("error", (err) => {
      console.warn("⚠️ Redis connection error:", err.message);
    });
  } catch (err) {
    console.warn("⚠️ Redis client initialization failed:", err);
  }
}

export { redis };

export async function getCache<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const val = await redis.get(key);
    return val ? (JSON.parse(val) as T) : null;
  } catch {
    return null;
  }
}

export async function setCache(key: string, value: unknown, ttlSeconds = 3600): Promise<boolean> {
  if (!redis) return false;
  try {
    const serialized = JSON.stringify(value);
    await redis.setex(key, ttlSeconds, serialized);
    return true;
  } catch {
    return false;
  }
}

export async function deleteCache(key: string): Promise<boolean> {
  if (!redis) return false;
  try {
    await redis.del(key);
    return true;
  } catch {
    return false;
  }
}
