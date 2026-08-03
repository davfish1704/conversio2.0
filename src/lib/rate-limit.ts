import { NextResponse } from "next/server"
import type RedisType from "ioredis"

// ─── In-memory store (single-instance fallback) ────────────────────────────
const rateLimits = new Map<string, { count: number; resetTime: number }>()

// Backward-compatible synchronous limiter — used by auth.ts and signup
export function rateLimit(
  identifier: string,
  maxRequests = 10,
  windowMs = 60_000
): { success: boolean; limit: number; remaining: number; resetTime?: number } {
  const now = Date.now()
  const current = rateLimits.get(identifier)

  if (!current || now > current.resetTime) {
    rateLimits.set(identifier, { count: 1, resetTime: now + windowMs })
    return { success: true, limit: maxRequests, remaining: maxRequests - 1 }
  }

  if (current.count >= maxRequests) {
    return { success: false, limit: maxRequests, remaining: 0, resetTime: current.resetTime }
  }

  current.count++
  return { success: true, limit: maxRequests, remaining: maxRequests - current.count }
}

// ─── Async limiter with optional self-hosted Redis backend ─────────────────
// One shared ioredis instance per process (not one per request), created
// lazily on first use and cached in `redisClientPromise`. Reason for the
// `webpackIgnore` comment below: this file is also imported by auth.ts, which
// is reachable from src/middleware.ts, and Next.js runs middleware on the
// Edge Runtime by default. ioredis is a raw TCP socket client (uses
// node:net/node:tls/node:diagnostics_channel), and webpack still tries to
// bundle a plain dynamic import() at build time even though it's never
// awaited from the edge-reachable code path (auth.ts only calls the sync
// rateLimit() below, never checkLimit()) — that broke `next build` with an
// UnhandledSchemeError on "node:diagnostics_channel" via
// auth.ts → rate-limit.ts → ioredis. `/* webpackIgnore: true */` tells
// webpack to leave this import() completely unprocessed at build time and
// resolve it at runtime instead — the standard fix for a Node-only
// dependency that must stay out of an Edge bundle it's never actually
// reached from at runtime.
//
// Reconnect strategy: capped exponential backoff, retried indefinitely in the
// background by ioredis itself. maxRetriesPerRequest is kept low so an
// individual rate-limit check fails fast (falls through to the in-memory
// limiter below) instead of blocking a request on Redis retries.
//
// Behavior on Redis failure — kept identical to the previous @upstash/redis
// implementation: any error (connect refused, timeout, script error) is
// caught and the check silently falls through to the in-memory limiter
// (rateLimit() below). This is neither fail-open (not "always allow") nor
// fail-closed (not "always block") — it degrades to a per-instance in-memory
// rate limit, exactly as before.
let redisClientPromise: Promise<RedisType | null> | null = null

function getRedisClient(): Promise<RedisType | null> {
  if (!process.env.REDIS_URL) return Promise.resolve(null)
  if (!redisClientPromise) {
    redisClientPromise = import(/* webpackIgnore: true */ "ioredis").then(({ default: Redis }) => {
      const client = new Redis(process.env.REDIS_URL as string, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => Math.min(times * 200, 2000),
      })
      client.on("error", (err) => {
        console.warn("[rate-limit] Redis error (falling back to in-memory limiter):", err.message)
      })
      // Sliding-window-log via sorted set: KEYS[1]=rl:<identifier>, members
      // are unique per request (timestamp-random), score=timestamp. Expired
      // entries are pruned before counting, so the window slides continuously
      // rather than resetting on fixed boundaries — same "max N requests per
      // rolling window" semantics the previous Upstash sliding-window limiter
      // provided.
      client.defineCommand("slidingWindowRateLimit", {
        numberOfKeys: 1,
        lua: `
          local key = KEYS[1]
          local now = tonumber(ARGV[1])
          local window = tonumber(ARGV[2])
          local max = tonumber(ARGV[3])
          local member = ARGV[4]
          redis.call("ZREMRANGEBYSCORE", key, 0, now - window)
          local count = redis.call("ZCARD", key)
          if count < max then
            redis.call("ZADD", key, now, member)
            redis.call("PEXPIRE", key, window)
            return 1
          else
            return 0
          end
        `,
      })
      return client
    })
  }
  return redisClientPromise
}

async function checkLimit(key: string, max: number, windowMs: number): Promise<{ success: boolean }> {
  const redisClient = await getRedisClient().catch(() => null)
  if (redisClient) {
    try {
      const now = Date.now()
      const member = `${now}-${Math.random()}`
      // Key schema: "rl:<identifier>", same "rl" prefix the previous
      // @upstash/ratelimit config used.
      const allowed = await (
        redisClient as unknown as {
          slidingWindowRateLimit(key: string, now: number, windowMs: number, max: number, member: string): Promise<number>
        }
      ).slidingWindowRateLimit(`rl:${key}`, now, windowMs, max, member)
      return { success: allowed === 1 }
    } catch (err) {
      console.warn("[rate-limit] Redis check failed, falling back to in-memory:", (err as Error).message)
      // Fall through to in-memory
    }
  }
  return rateLimit(key, max, windowMs)
}

// ─── Named limiters ──────────────────────────────────────────────────────────
export const authLimiter    = (id: string) => checkLimit(`auth:${id}`,  5,   15 * 60_000)
export const webhookLimiter = (id: string) => checkLimit(`wh:${id}`,    30,  60_000)
export const apiLimiter     = (id: string) => checkLimit(`api:${id}`,   100, 60_000)

// ─── Helper ──────────────────────────────────────────────────────────────────
export function tooManyRequests() {
  return NextResponse.json({ error: "Too many requests" }, { status: 429 })
}
