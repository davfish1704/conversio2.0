import { describe, it, expect, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

describe('Dashboard & Board System', () => {
  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('Landing Page', () => {
    it('sollte die Marketing Landing Page existieren', () => {
      const pagePath = path.join(process.cwd(), 'src', 'app', '(marketing)', 'page.tsx')
      expect(fs.existsSync(pagePath)).toBe(true)
      const content = fs.readFileSync(pagePath, 'utf-8')
      expect(content).toContain('Conversations That Drive Success')
      expect(content).toContain('START FREE TRIAL')
    })

    it('sollte das Marketing Layout ohne Auth-Protection haben', () => {
      const layoutPath = path.join(process.cwd(), 'src', 'app', '(marketing)', 'layout.tsx')
      expect(fs.existsSync(layoutPath)).toBe(true)
      const content = fs.readFileSync(layoutPath, 'utf-8')
      expect(content).not.toContain('auth(')
      expect(content).not.toContain('redirect(')
    })
  })

  describe('Dashboard Layout', () => {
    it('sollte das Dashboard Layout mit Sidebar existieren', () => {
      const layoutPath = path.join(process.cwd(), 'src', 'app', '(dashboard)', 'layout.tsx')
      expect(fs.existsSync(layoutPath)).toBe(true)
      const content = fs.readFileSync(layoutPath, 'utf-8')
      expect(content).toContain('Sidebar')
      expect(content).toContain('/boards')
      expect(content).toContain('/reports')
      expect(content).toContain('auth(')
      expect(content).toContain('redirect(')
    })
  })

  describe('Board System Files', () => {
    it('sollte die Board-Liste Seite existieren', () => {
      const pagePath = path.join(process.cwd(), 'src', 'app', '(dashboard)', 'boards', 'page.tsx')
      expect(fs.existsSync(pagePath)).toBe(true)
      const content = fs.readFileSync(pagePath, 'utf-8')
      expect(content).toContain('/api/boards')
      expect(content).toContain('Neues Board erstellen')
    })

    it('sollte die Board-Detail Seite existieren', () => {
      const pagePath = path.join(process.cwd(), 'src', 'app', '(dashboard)', 'boards', '[id]', 'page.tsx')
      expect(fs.existsSync(pagePath)).toBe(true)
      const content = fs.readFileSync(pagePath, 'utf-8')
      expect(content).toContain('State')
      expect(content).toContain('/api/boards')
    })

    it('sollte die Reports Seite existieren', () => {
      const pagePath = path.join(process.cwd(), 'src', 'app', '(dashboard)', 'reports', 'page.tsx')
      expect(fs.existsSync(pagePath)).toBe(true)
      const content = fs.readFileSync(pagePath, 'utf-8')
      expect(content).toContain('/api/reports')
      expect(content).toContain('Admin Reports')
    })
  })

  describe('API Routes', () => {
    it('sollte die Boards API Route existieren', () => {
      const routePath = path.join(process.cwd(), 'src', 'app', 'api', 'boards', 'route.ts')
      expect(fs.existsSync(routePath)).toBe(true)
      const content = fs.readFileSync(routePath, 'utf-8')
      expect(content).toContain('export async function GET')
      expect(content).toContain('export async function POST')
    })

    it('sollte die States API Route existieren', () => {
      const routePath = path.join(process.cwd(), 'src', 'app', 'api', 'boards', '[id]', 'states', 'route.ts')
      expect(fs.existsSync(routePath)).toBe(true)
      const content = fs.readFileSync(routePath, 'utf-8')
      expect(content).toContain('export async function GET')
      expect(content).toContain('export async function POST')
      expect(content).toContain('export async function PUT')
    })

    it('sollte die Reports API Route existieren', () => {
      const routePath = path.join(process.cwd(), 'src', 'app', 'api', 'reports', 'route.ts')
      expect(fs.existsSync(routePath)).toBe(true)
      const content = fs.readFileSync(routePath, 'utf-8')
      expect(content).toContain('export async function GET')
      expect(content).toContain('export async function PUT')
    })
  })

  describe('Database Models', () => {
    it('sollte ein Board mit States und Reports erstellen', async () => {
      // Cleanup
      await prisma.adminReport.deleteMany({ where: { board: { name: 'Test Board Dashboard' } } })
      await prisma.state.deleteMany({ where: { board: { name: 'Test Board Dashboard' } } })
      await prisma.boardMember.deleteMany({ where: { board: { name: 'Test Board Dashboard' } } })
      await prisma.board.deleteMany({ where: { name: 'Test Board Dashboard' } })

      const user = await prisma.user.create({
        data: { email: 'test-dashboard@example.com', name: 'Dashboard Test' },
      })

      const team = await prisma.team.create({
        data: {
          name: 'Test Team Dashboard',
          slug: 'test-team-dashboard',
          ownerId: user.id,
        },
      })

      const board = await prisma.board.create({
        data: {
          name: 'Test Board Dashboard',
          description: 'Test Description',
          teamId: team.id,
          ownerId: user.id,
        },
      })

      await prisma.boardMember.create({
        data: {
          boardId: board.id,
          userId: user.id,
          role: 'ADMIN',
        },
      })

      const state1 = await prisma.state.create({
        data: {
          boardId: board.id,
          name: 'Neuer Lead',
          type: 'MESSAGE',
          mission: 'Willkommensnachricht senden',
          orderIndex: 0,
        },
      })

      const state2 = await prisma.state.create({
        data: {
          boardId: board.id,
          name: 'Beratung',
          type: 'AI',
          mission: 'KI beantwortet FAQs',
          orderIndex: 1,
        },
      })

      const report = await prisma.adminReport.create({
        data: {
          boardId: board.id,
          stateId: state1.id,
          type: 'STUCK',
          message: 'Kunde antwortet nicht',
          status: 'OPEN',
        },
      })

      // Verify
      const boardWithData = await prisma.board.findUnique({
        where: { id: board.id },
        include: { states: true, members: true, reports: true },
      })

      expect(boardWithData?.states.length).toBe(2)
      expect(boardWithData?.members.length).toBe(1)
      expect(boardWithData?.reports.length).toBe(1)
      expect(boardWithData?.reports[0].status).toBe('OPEN')

      // Resolve report
      const updatedReport = await prisma.adminReport.update({
        where: { id: report.id },
        data: { status: 'RESOLVED', resolvedAt: new Date() },
      })

      expect(updatedReport.status).toBe('RESOLVED')
      expect(updatedReport.resolvedAt).not.toBeNull()

      // Cleanup
      await prisma.adminReport.deleteMany({ where: { boardId: board.id } })
      await prisma.state.deleteMany({ where: { boardId: board.id } })
      await prisma.boardMember.deleteMany({ where: { boardId: board.id } })
      await prisma.board.delete({ where: { id: board.id } })
      await prisma.team.delete({ where: { id: team.id } })
      await prisma.user.delete({ where: { id: user.id } })
    })
  })
})
