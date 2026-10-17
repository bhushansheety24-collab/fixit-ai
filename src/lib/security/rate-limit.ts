/**
 * Rate limiting.
 *
 * Uses Redis when `REDIS_URL` is configured (durable across instances),
 * otherwise falls back to an in-memory sliding window which is sufficient
 * for a single-instance local/dev deployment.
 */

import Redis from "ioredis";

let redis: Redis | null = null;
let redisTried = false;

function getRedis(): Redis | null {
  if (redisTried) return redis;
  redisTried = true;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      lazyConnect: false,
      enableOfflineQueue: false,
    });
    redis.on("error", () => {
      /* swallow — fall back to memory */
    });
    return redis;
  } catch {
    redis = null;
    return null;
  }
}

type Bucket = { count: number; resetAt: number };
const memory = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();

  const client = getRedis();
  if (client && client.status === "ready") {
    try {
      const redisKey = `ratelimit:${key}:${Math.floor(now / windowMs)}`;
      const count = await client.incr(redisKey);
      if (count === 1) {
        await client.pexpire(redisKey, windowMs);
      }
      const resetAt = (Math.floor(now / windowMs) + 1) * windowMs;
      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        resetAt,
      };
    } catch {
      /* fall through to memory */
    }
  }

  const bucket = memory.get(key);
  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + windowMs;
    memory.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }
  bucket.count += 1;
  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

/** Periodically prune the in-memory map to avoid unbounded growth. */
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of memory) {
      if (v.resetAt <= now) memory.delete(k);
    }
  }, 60_000);
  // do not keep the process alive because of this timer
  if (typeof timer.unref === "function") timer.unref();
}
