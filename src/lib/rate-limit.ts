import { NextResponse } from "next/server"

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

// ─── Async limiter with optional Upstash backend ────────────────────────────
async function checkLimit(key: string, max: number, windowMs: number): Promise<{ success: boolean }> {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const { Redis } = await import("@upstash/redis")
      const { Ratelimit } = await import("@upstash/ratelimit")
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
      const limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(max, `${Math.round(windowMs / 1000)} s`),
        analytics: false,
        prefix: "rl",
      })
      const result = await limiter.limit(key)
      return { success: result.success }
    } catch {
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
