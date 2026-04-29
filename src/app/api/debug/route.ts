import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"

export async function GET() {
  const session = await auth()
  // Only allow authenticated admins
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ? "SET" : "MISSING",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "SET" : "MISSING",
      DATABASE_URL: process.env.DATABASE_URL ? "SET" : "MISSING",
      DIRECT_URL: process.env.DIRECT_URL ? "SET" : "MISSING",
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? "SET" : "MISSING",
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? "SET" : "MISSING",
      NODE_ENV: process.env.NODE_ENV,
    },
    googleConfigCheck: "NOT_TESTED",
    prisma: "NOT_TESTED",
    auth: "NOT_TESTED",
  }

  // Check Google Client ID format (without exposing secrets)
  const gcid = process.env.GOOGLE_CLIENT_ID || ""
  const gsec = process.env.GOOGLE_CLIENT_SECRET || ""
  results.googleConfigCheck = {
    clientIdEndsWithAppsGoogleusercontent: gcid.endsWith(".apps.googleusercontent.com"),
    clientIdContainsSpaces: gcid.includes(" ") || gcid.includes("\n") || gcid.includes("\t"),
    clientIdStartsWithQuotes: gcid.startsWith('"') || gcid.startsWith("'"),
    clientIdHasWebPrefix: gcid.startsWith("web-"),
    secretContainsSpaces: gsec.includes(" ") || gsec.includes("\n") || gsec.includes("\t"),
    secretStartsWithQuotes: gsec.startsWith('"') || gsec.startsWith("'"),
    secretLength: gsec.length,
  }

  // Test 1: Database connection
  try {
    const userCount = await prisma.user.count()
    const accountCount = await prisma.account.count()
    results.prisma = { status: "OK", userCount, accountCount }
  } catch (e) {
    results.prisma = {
      status: "ERROR",
      message: String(e),
      hint: "Prisma connection failed",
    }
  }

  // Test 2: Auth configuration
  try {
    const testSession = await auth()
    results.auth = { status: "OK", hasSession: !!testSession }
  } catch (e) {
    results.auth = { status: "ERROR", message: String(e) }
  }

  return NextResponse.json(results, { status: 200 })
}
