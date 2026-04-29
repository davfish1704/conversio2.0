import { NextResponse } from "next/server"

const rateLimits = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(identifier: string, maxRequests: number = 10, windowMs: number = 60000) {
  const now = Date.now()
  const key = identifier
  const current = rateLimits.get(key)

  if (!current || now > current.resetTime) {
    rateLimits.set(key, { count: 1, resetTime: now + windowMs })
    return { success: true, limit: maxRequests, remaining: maxRequests - 1 }
  }

  if (current.count >= maxRequests) {
    return { 
      success: false, 
      limit: maxRequests, 
      remaining: 0,
      resetTime: current.resetTime 
    }
  }

  current.count++
  return { success: true, limit: maxRequests, remaining: maxRequests - current.count }
}
