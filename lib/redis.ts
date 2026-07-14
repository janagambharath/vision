import Redis from "ioredis";

let redis: Redis | null = null;
let connectPromise: Promise<Redis | null> | null = null;
let lastConnectionErrorAt = 0;

function createRedisClient(url: string) {
  const client = new Redis(url, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
    retryStrategy: () => null,
    reconnectOnError: () => false
  });

  client.on("error", (err) => {
    const now = Date.now();
    if (now - lastConnectionErrorAt >= 60_000) {
      lastConnectionErrorAt = now;
      console.warn("Redis connection error:", err.message);
    }
  });

  return client;
}

export async function getRedisClient(): Promise<Redis | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  if (!redis || redis.status === "end") {
    redis?.disconnect(false);
    redis = createRedisClient(url);
    connectPromise = null;
  }

  const client = redis;
  if (client.status === "ready") return client;

  if (!connectPromise) {
    connectPromise = client
      .connect()
      .then(() => (client.status === "ready" ? client : null))
      .catch(() => null)
      .finally(() => {
        connectPromise = null;
      });
  }

  return connectPromise;
}

export async function getCache<T>(key: string): Promise<T | null> {
  const client = await getRedisClient();
  if (!client) return null;
  try {
    const val = await client.get(key);
    return val ? (JSON.parse(val) as T) : null;
  } catch {
    return null;
  }
}

export async function setCache(key: string, value: unknown, ttlSeconds = 3600): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) return false;
  try {
    const serialized = JSON.stringify(value);
    await client.setex(key, ttlSeconds, serialized);
    return true;
  } catch {
    return false;
  }
}

export async function deleteCache(key: string): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) return false;
  try {
    await client.del(key);
    return true;
  } catch {
    return false;
  }
}
