import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: "ADMIN" | "USER" | "AGENT"
    } & DefaultSession["user"]
  }

  interface User {
    role: "ADMIN" | "USER" | "AGENT"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "ADMIN" | "USER" | "AGENT"
  }
}
