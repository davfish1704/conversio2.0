import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(req: NextRequest) {
  const { nextUrl } = req
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const isLoggedIn = !!token

  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth")
  const isPublicRoute = nextUrl.pathname === "/" || nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/signup")
  const isPublicApi = nextUrl.pathname === "/api/health" || nextUrl.pathname.startsWith("/api/webhook")
  const isApiRoute = nextUrl.pathname.startsWith("/api")

  if (isApiRoute && !isApiAuthRoute && !isPublicApi) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  if (!isLoggedIn && !isPublicRoute && !isApiAuthRoute && !isPublicApi) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)" ],
}
