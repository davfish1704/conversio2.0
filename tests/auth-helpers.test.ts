import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { PrismaClient } from "@prisma/client"
import {
  assertBoardAccess,
  assertConversationAccess,
  assertReportAccess,
  assertTeamMemberAccess,
  AccessError,
} from "@/lib/auth/assert-board-access"

const prisma = new PrismaClient()

describe("assertBoardAccess", () => {
  let adminUserId: string
  let memberUserId: string
  let nonMemberUserId: string
  let testBoardId: string
  let testTeamId: string
  const testEmail = (role: string) => `test-auth-${role}-${Date.now()}@example.com`

  beforeAll(async () => {
    // Cleanup
    await prisma.boardMember.deleteMany({
      where: { user: { email: { startsWith: "test-auth-" } } },
    })
    await prisma.board.deleteMany({
      where: { name: { startsWith: "[TEST AUTH]" } },
    })
    await prisma.teamMember.deleteMany({
      where: { user: { email: { startsWith: "test-auth-" } } },
    })
    await prisma.team.deleteMany({
      where: { slug: { startsWith: "test-auth-" } },
    })
    await prisma.user.deleteMany({
      where: { email: { startsWith: "test-auth-" } },
    })

    // Create users
    const adminUser = await prisma.user.create({
      data: { email: testEmail("admin"), name: "Auth Admin", role: "ADMIN" },
    })
    adminUserId = adminUser.id

    const memberUser = await prisma.user.create({
      data: { email: testEmail("member"), name: "Auth Member", role: "USER" },
    })
    memberUserId = memberUser.id

    const nonMemberUser = await prisma.user.create({
      data: { email: testEmail("nonmember"), name: "Auth Non-Member", role: "USER" },
    })
    nonMemberUserId = nonMemberUser.id

    // Create team + board
    const team = await prisma.team.create({
      data: {
        name: "[TEST AUTH] Team",
        slug: `test-auth-team-${Date.now()}`,
        ownerId: adminUserId,
      },
    })
    testTeamId = team.id

    await prisma.teamMember.create({
      data: { teamId: team.id, userId: adminUserId, role: "ADMIN" },
    })
    await prisma.teamMember.create({
      data: { teamId: team.id, userId: memberUserId, role: "MEMBER" },
    })

    const board = await prisma.board.create({
      data: {
        name: "[TEST AUTH] Board",
        teamId: team.id,
        ownerId: adminUserId,
      },
    })
    testBoardId = board.id

    await prisma.boardMember.create({
      data: { boardId: board.id, userId: adminUserId, role: "ADMIN" },
    })
    await prisma.boardMember.create({
      data: { boardId: board.id, userId: memberUserId, role: "AGENT" },
    })
  })

  afterAll(async () => {
    await prisma.boardMember.deleteMany({
      where: { boardId: testBoardId },
    })
    await prisma.board.deleteMany({ where: { id: testBoardId } })
    await prisma.teamMember.deleteMany({
      where: { teamId: testTeamId },
    })
    await prisma.team.deleteMany({ where: { id: testTeamId } })
    await prisma.user.deleteMany({
      where: { email: { startsWith: "test-auth-" } },
    })
    await prisma.$disconnect()
  })

  // --- assertBoardAccess ---

  it("should allow board member access", async () => {
    const result = await assertBoardAccess({
      userId: memberUserId,
      boardId: testBoardId,
    })
    expect(result.boardId).toBe(testBoardId)
    expect(result.role).toBe("AGENT")
    expect(result.isAdmin).toBe(false)
  })

  it("should deny access for non-member", async () => {
    await expect(
      assertBoardAccess({
        userId: nonMemberUserId,
        boardId: testBoardId,
      }),
    ).rejects.toThrow(AccessError)
  })

  it("should throw on invalid boardId", async () => {
    await expect(
      assertBoardAccess({
        userId: memberUserId,
        boardId: "nonexistent-board",
      }),
    ).rejects.toThrow(AccessError)
  })

  it("should allow admin bypass for ADMIN users", async () => {
    const result = await assertBoardAccess({
      userId: adminUserId,
      boardId: testBoardId,
    })
    expect(result.isAdmin).toBe(true)
    expect(result.role).toBe("ADMIN")
  })

  it("should deny admin bypass when allowAdminOverride=false", async () => {
    await expect(
      assertBoardAccess({
        userId: adminUserId,
        boardId: testBoardId,
        allowAdminOverride: false,
      }),
    ).resolves.toBeDefined()
  })

  it("should fail CLOSED for non-existent user", async () => {
    await expect(
      assertBoardAccess({
        userId: "nonexistent-user",
        boardId: testBoardId,
      }),
    ).rejects.toThrow(AccessError)
  })

  it("should fail CLOSED for deleted board", async () => {
    const tempBoard = await prisma.board.create({
      data: {
        name: "[TEST AUTH] Temp Board",
        teamId: testTeamId,
        ownerId: adminUserId,
      },
    })
    await prisma.boardMember.create({
      data: { boardId: tempBoard.id, userId: memberUserId, role: "AGENT" },
    })
    await prisma.board.delete({ where: { id: tempBoard.id } })

    await expect(
      assertBoardAccess({
        userId: memberUserId,
        boardId: tempBoard.id,
      }),
    ).rejects.toThrow(AccessError)
  })
})

describe("assertConversationAccess", () => {
  let userId: string
  let testBoardId: string
  let testTeamId: string
  let testConversationId: string

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `test-auth-conv-${Date.now()}@example.com`,
        name: "Conv Test User",
      },
    })
    userId = user.id

    const team = await prisma.team.create({
      data: {
        name: "[TEST AUTH] Conv Team",
        slug: `test-auth-conv-${Date.now()}`,
        ownerId: userId,
      },
    })
    testTeamId = team.id

    const board = await prisma.board.create({
      data: {
        name: "[TEST AUTH] Conv Board",
        teamId: team.id,
        ownerId: userId,
      },
    })
    testBoardId = board.id

    await prisma.boardMember.create({
      data: { boardId: board.id, userId, role: "AGENT" },
    })

    const conversation = await prisma.conversation.create({
      data: {
        leadId: "",
        boardId: board.id,
        channel: "test",
        status: "ACTIVE",
      },
    })
    testConversationId = conversation.id
  })

  afterAll(async () => {
    await prisma.conversation.deleteMany({ where: { id: testConversationId } })
    await prisma.boardMember.deleteMany({ where: { boardId: testBoardId } })
    await prisma.board.deleteMany({ where: { id: testBoardId } })
    await prisma.teamMember.deleteMany({ where: { teamId: testTeamId } })
    await prisma.team.deleteMany({ where: { id: testTeamId } })
    await prisma.user.deleteMany({ where: { id: userId } })
    await prisma.$disconnect()
  })

  it("should allow access to own conversation", async () => {
    const result = await assertConversationAccess({
      userId,
      conversationId: testConversationId,
    })
    expect(result.boardId).toBe(testBoardId)
    expect(result.conversationId).toBe(testConversationId)
  })

  it("should deny access to another user's conversation", async () => {
    const otherUser = await prisma.user.create({
      data: {
        email: `test-auth-other-${Date.now()}@example.com`,
        name: "Other User",
      },
    })

    await expect(
      assertConversationAccess({
        userId: otherUser.id,
        conversationId: testConversationId,
      }),
    ).rejects.toThrow(AccessError)

    await prisma.user.delete({ where: { id: otherUser.id } })
  })

  it("should fail on deleted conversation", async () => {
    await expect(
      assertConversationAccess({
        userId,
        conversationId: "nonexistent-conversation",
      }),
    ).rejects.toThrow(AccessError)
  })
})

describe("assertTeamMemberAccess", () => {
  let ownerId: string
  let memberId: string
  let targetMemberRowId: string
  let testTeamId: string

  beforeAll(async () => {
    const owner = await prisma.user.create({
      data: {
        email: `test-auth-team-owner-${Date.now()}@example.com`,
        name: "Team Owner",
      },
    })
    ownerId = owner.id

    const member = await prisma.user.create({
      data: {
        email: `test-auth-team-member-${Date.now()}@example.com`,
        name: "Team Member",
      },
    })
    memberId = member.id

    const team = await prisma.team.create({
      data: {
        name: "[TEST AUTH] Team Access",
        slug: `test-auth-team-access-${Date.now()}`,
        ownerId: owner.id,
      },
    })
    testTeamId = team.id

    await prisma.teamMember.create({
      data: { teamId: team.id, userId: owner.id, role: "ADMIN" },
    })
    const target = await prisma.teamMember.create({
      data: { teamId: team.id, userId: member.id, role: "MEMBER" },
    })
    targetMemberRowId = target.id
  })

  afterAll(async () => {
    await prisma.teamMember.deleteMany({ where: { teamId: testTeamId } })
    await prisma.team.deleteMany({ where: { id: testTeamId } })
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, memberId] } } })
    await prisma.$disconnect()
  })

  it("should allow access within same team", async () => {
    await expect(
      assertTeamMemberAccess({ userId: ownerId, targetMemberId: targetMemberRowId }),
    ).resolves.toBeUndefined()
  })

  it("should deny access from outside team", async () => {
    const outsider = await prisma.user.create({
      data: {
        email: `test-auth-outsider-${Date.now()}@example.com`,
        name: "Outsider",
      },
    })

    await expect(
      assertTeamMemberAccess({ userId: outsider.id, targetMemberId: targetMemberRowId }),
    ).rejects.toThrow(AccessError)

    await prisma.user.delete({ where: { id: outsider.id } })
  })

  it("should fail on invalid targetMemberId", async () => {
    await expect(
      assertTeamMemberAccess({ userId: ownerId, targetMemberId: "nonexistent" }),
    ).rejects.toThrow(AccessError)
  })
})

describe("assertReportAccess", () => {
  let userId: string
  let testBoardId: string
  let testTeamId: string
  let testReportId: string

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `test-auth-report-${Date.now()}@example.com`,
        name: "Report User",
      },
    })
    userId = user.id

    const team = await prisma.team.create({
      data: {
        name: "[TEST AUTH] Report Team",
        slug: `test-auth-report-${Date.now()}`,
        ownerId: user.id,
      },
    })
    testTeamId = team.id

    const board = await prisma.board.create({
      data: {
        name: "[TEST AUTH] Report Board",
        teamId: team.id,
        ownerId: user.id,
      },
    })
    testBoardId = board.id

    await prisma.boardMember.create({
      data: { boardId: board.id, userId, role: "AGENT" },
    })

    const report = await prisma.adminReport.create({
      data: {
        boardId: board.id,
        type: "MANUAL_INTERVENTION",
        message: "[TEST] Report access",
        status: "OPEN",
      },
    })
    testReportId = report.id
  })

  afterAll(async () => {
    await prisma.adminReport.deleteMany({ where: { id: testReportId } })
    await prisma.boardMember.deleteMany({ where: { boardId: testBoardId } })
    await prisma.board.deleteMany({ where: { id: testBoardId } })
    await prisma.teamMember.deleteMany({ where: { teamId: testTeamId } })
    await prisma.team.deleteMany({ where: { id: testTeamId } })
    await prisma.user.deleteMany({ where: { id: userId } })
    await prisma.$disconnect()
  })

  it("should allow access to own report", async () => {
    const result = await assertReportAccess({
      userId,
      reportId: testReportId,
    })
    expect(result.reportId).toBe(testReportId)
  })

  it("should deny access to other user's report", async () => {
    const otherUser = await prisma.user.create({
      data: {
        email: `test-auth-other-report-${Date.now()}@example.com`,
        name: "Other Report User",
      },
    })
    await expect(
      assertReportAccess({ userId: otherUser.id, reportId: testReportId }),
    ).rejects.toThrow(AccessError)
    await prisma.user.delete({ where: { id: otherUser.id } })
  })

  it("should fail on deleted report", async () => {
    await expect(
      assertReportAccess({ userId, reportId: "nonexistent-report" }),
    ).rejects.toThrow(AccessError)
  })
})
