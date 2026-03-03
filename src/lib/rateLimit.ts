/**
 * Rate limiter with Upstash Redis backend + in-memory fallback.
 *
 * Uses Redis sliding window when UPSTASH_REDIS_REST_URL is set.
 * Falls back to in-memory (resets on cold start) otherwise.
 */

import { Redis } from '@upstash/redis';

// ---------------------------------------------------------------------------
// Redis client (lazy singleton)
// ---------------------------------------------------------------------------

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    redis = new Redis({ url, token });
  } catch (err) {
    console.error('[RateLimit] Failed to initialize Redis client:', err);
    return null;
  }
  return redis;
}

// ---------------------------------------------------------------------------
// In-memory fallback (same as before — resets on cold start)
// ---------------------------------------------------------------------------

const WINDOW_MS = 60 * 1000; // 1 minute window

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const memStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memStore) {
    if (now > entry.resetAt) {
      memStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

function checkMemoryRateLimit(
  key: string,
  maxRequests: number,
): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const entry = memStore.get(key);

  if (!entry || now > entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true };
}

// ---------------------------------------------------------------------------
// Redis sliding window
// ---------------------------------------------------------------------------

async function checkRedisRateLimit(
  client: Redis,
  key: string,
  maxRequests: number,
  windowSeconds: number = 60,
): Promise<{ allowed: boolean; retryAfterMs?: number }> {
  const redisKey = `rl:${key}`;
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  // Sliding window: add current timestamp, remove expired, count remaining
  const pipeline = client.pipeline();
  pipeline.zremrangebyscore(redisKey, 0, windowStart);
  pipeline.zadd(redisKey, { score: now, member: `${now}:${Math.random().toString(36).slice(2, 8)}` });
  pipeline.zcard(redisKey);
  pipeline.expire(redisKey, windowSeconds);

  const results = await pipeline.exec();
  const count = results[2] as number;

  if (count > maxRequests) {
    // Over limit — remove the entry we just added and calculate retry time
    const oldest = await client.zrange(redisKey, 0, 0, { withScores: true });
    const retryAfterMs = oldest.length >= 2
      ? Math.max(0, (oldest[1] as number) + windowSeconds * 1000 - now)
      : windowSeconds * 1000;
    return { allowed: false, retryAfterMs };
  }

  return { allowed: true };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check rate limit for a given key (typically IP or wallet address).
 * Uses Redis if available, falls back to in-memory.
 * @returns { allowed: true } or { allowed: false, retryAfterMs }
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
): Promise<{ allowed: boolean; retryAfterMs?: number }> {
  const client = getRedis();
  if (client) {
    try {
      return await checkRedisRateLimit(client, key, maxRequests);
    } catch (err) {
      console.error('[RateLimit] Redis error, falling back to memory:', err);
      // Fall through to in-memory
    }
  }
  return checkMemoryRateLimit(key, maxRequests);
}

/**
 * Extract client IP from Next.js request headers.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}
