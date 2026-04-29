import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { rateLimit } from "@/lib/rate-limit"

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut
} = NextAuth({
  debug: false,
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Passwort", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        try {
          const validated = credentialsSchema.safeParse(credentials)
          if (!validated.success) return null

          const { email, password } = validated.data

          // Brute-Force-Schutz: 5 Versuche pro Email alle 5 Minuten (R3)
          const limited = rateLimit(`login:${email}`, 5, 5 * 60 * 1000)
          if (!limited.success) return null

          const user = await prisma.user.findUnique({ where: { email } })

          if (!user || !user.password) return null
          const isValid = await bcrypt.compare(password, user.password)
          if (!isValid) return null

          return { id: user.id, email: user.email, name: user.name, role: user.role }
        } catch {
          return null
        }
      }
    })
  ],

  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const googleId = account.providerAccountId

          const existingGoogleUser = await prisma.user.findUnique({
            where: { googleId }
          })

          if (existingGoogleUser) {
            user.id = existingGoogleUser.id
            user.name = existingGoogleUser.name
            user.email = existingGoogleUser.email
            user.image = existingGoogleUser.image
            return true
          }

          const existingEmailUser = await prisma.user.findUnique({
            where: { email: user.email! }
          })

          if (existingEmailUser) {
            await prisma.user.update({
              where: { id: existingEmailUser.id },
              data: { googleId }
            })
            user.id = existingEmailUser.id
            user.name = existingEmailUser.name
            user.email = existingEmailUser.email
            user.image = existingEmailUser.image
            return true
          }

          const newUser = await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name,
              image: user.image,
              googleId: googleId,
            }
          })

          user.id = newUser.id
          return true
        } catch {
          return false
        }
      }

      return true
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
})
