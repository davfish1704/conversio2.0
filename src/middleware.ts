import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth")
  const isPublicRoute = nextUrl.pathname === "/" || nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/signup")
  const isPublicApi = nextUrl.pathname === "/api/health" || nextUrl.pathname.startsWith("/api/webhook")
  const isApiRoute = nextUrl.pathname.startsWith("/api")

  // API-Routen (außer Auth und Public APIs) schützen
  if (isApiRoute && !isApiAuthRoute && !isPublicApi) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  // Dashboard-Routen schützen
  if (!isLoggedIn && !isPublicRoute && !isApiAuthRoute && !isPublicApi) {
    return NextResponse.redirect(new URL("/login", nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
}
