import { describe, it, expect, vi, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

describe('Auth System', () => {
  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('NextAuth DB Models', () => {
    it('sollte Account, Session und VerificationToken in der DB erstellen', async () => {
      // Cleanup
      await prisma.session.deleteMany({ where: { user: { email: 'auth-test@example.com' } } })
      await prisma.account.deleteMany({ where: { user: { email: 'auth-test@example.com' } } })
      await prisma.user.deleteMany({ where: { email: 'auth-test@example.com' } })

      const user = await prisma.user.create({
        data: {
          email: 'auth-test@example.com',
          name: 'Auth Test User',
        },
      })

      const account = await prisma.account.create({
        data: {
          userId: user.id,
          type: 'oauth',
          provider: 'google',
          providerAccountId: 'google_123456',
          refresh_token: 'refresh_token_value',
          access_token: 'access_token_value',
          expires_at: 1234567890,
          token_type: 'Bearer',
          scope: 'openid email profile',
          id_token: 'id_token_value',
          session_state: 'active',
        },
      })

      const session = await prisma.session.create({
        data: {
          sessionToken: 'test_session_token_123',
          userId: user.id,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      })

      const verificationToken = await prisma.verificationToken.create({
        data: {
          identifier: 'auth-test@example.com',
          token: 'verification_token_123',
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      })

      expect(account.provider).toBe('google')
      expect(account.providerAccountId).toBe('google_123456')
      expect(session.sessionToken).toBe('test_session_token_123')
      expect(verificationToken.token).toBe('verification_token_123')

      // Relations testen
      const userWithRelations = await prisma.user.findUnique({
        where: { id: user.id },
        include: { accounts: true, sessions: true },
      })

      expect(userWithRelations?.accounts.length).toBe(1)
      expect(userWithRelations?.sessions.length).toBe(1)
      expect(userWithRelations?.accounts[0].provider).toBe('google')

      // Cleanup
      await prisma.session.deleteMany({ where: { userId: user.id } })
      await prisma.account.deleteMany({ where: { userId: user.id } })
      await prisma.user.delete({ where: { id: user.id } })
      await prisma.verificationToken.deleteMany({ where: { identifier: 'auth-test@example.com' } })
    })

    it('sollte beim Löschen eines Users auch Accounts und Sessions kaskadieren', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'cascade-auth@example.com',
          name: 'Cascade Auth User',
        },
      })

      await prisma.account.create({
        data: {
          userId: user.id,
          type: 'oauth',
          provider: 'google',
          providerAccountId: 'google_cascade_123',
        },
      })

      await prisma.session.create({
        data: {
          sessionToken: 'cascade_session_token',
          userId: user.id,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      })

      await prisma.user.delete({ where: { id: user.id } })

      const account = await prisma.account.findFirst({ where: { providerAccountId: 'google_cascade_123' } })
      const session = await prisma.session.findFirst({ where: { sessionToken: 'cascade_session_token' } })

      expect(account).toBeNull()
      expect(session).toBeNull()
    })
  })

  describe('Auth Files', () => {
    it('sollte auth.ts mit den erwarteten Exports existieren', () => {
      const authPath = path.join(process.cwd(), 'src', 'auth.ts')
      expect(fs.existsSync(authPath)).toBe(true)
      const content = fs.readFileSync(authPath, 'utf-8')
      expect(content).toContain('export const')
      expect(content).toContain('PrismaAdapter')
      expect(content).toContain('Google(')
      expect(content).toContain('handlers:')
      expect(content).toContain('auth,')
      expect(content).toContain('signIn,')
      expect(content).toContain('signOut')
    })

    it('sollte die API Route für NextAuth existieren', () => {
      const routePath = path.join(process.cwd(), 'src', 'app', 'api', 'auth', '[...nextauth]', 'route.ts')
      expect(fs.existsSync(routePath)).toBe(true)
      const content = fs.readFileSync(routePath, 'utf-8')
      expect(content).toContain('export { GET, POST }')
    })

    it('sollte die middleware.ts für Route Protection existieren', () => {
      const middlewarePath = path.join(process.cwd(), 'src', 'middleware.ts')
      expect(fs.existsSync(middlewarePath)).toBe(true)
      const content = fs.readFileSync(middlewarePath, 'utf-8')
      expect(content).toContain('auth as middleware')
      expect(content).toContain('/dashboard/')
    })

    it('sollte die Login-Page existieren', () => {
      const loginPath = path.join(process.cwd(), 'src', 'app', '(auth)', 'login', 'page.tsx')
      expect(fs.existsSync(loginPath)).toBe(true)
      const content = fs.readFileSync(loginPath, 'utf-8')
      expect(content).toContain('signIn(')
      expect(content).toContain('google')
      expect(content).toContain('Mit Google anmelden')
    })

    it('sollte das Dashboard Layout mit Session-Handling existieren', () => {
      const layoutPath = path.join(process.cwd(), 'src', 'app', '(dashboard)', 'layout.tsx')
      expect(fs.existsSync(layoutPath)).toBe(true)
      const content = fs.readFileSync(layoutPath, 'utf-8')
      expect(content).toContain('auth()')
      expect(content).toContain('signOut(')
    })
  })
})
