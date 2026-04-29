/**
 * Seed-Script: Erstellt zwei isolierte Test-User fuer Security-Tests.
 * Idempotent — kann mehrfach ausgefuehrt werden.
 *
 * User A: test-a@conversio.test / TestPassword1  → Team A + Board A
 * User B: test-b@conversio.test / TestPassword1  → Team B + Board B
 *
 * Erwartetes Verhalten nach Security-Sprint 2:
 * - User B hat KEINEN Zugriff auf Board A (brain/simulate, brain/documents, etc.)
 * - User B hat KEINEN Zugriff auf Team-Members von Team A
 */

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const SEED = {
  userA: {
    id: "test-user-a-0000000000000",
    email: "test-a@conversio.test",
    password: "TestPassword1",
    name: "Test User A",
  },
  userB: {
    id: "test-user-b-0000000000000",
    email: "test-b@conversio.test",
    password: "TestPassword1",
    name: "Test User B",
  },
  teamA: { id: "test-team-a-0000000000000", slug: "test-team-a" },
  teamB: { id: "test-team-b-0000000000000", slug: "test-team-b" },
  boardA: { id: "test-board-a-000000000000" },
  boardB: { id: "test-board-b-000000000000" },
  memberA: { id: "test-member-a-00000000000" }, // TeamMember A
  memberB: { id: "test-member-b-00000000000" }, // TeamMember B
}

async function main() {
  const pw = await bcrypt.hash("TestPassword1", 10)

  // --- User A ---
  const userA = await prisma.user.upsert({
    where: { email: SEED.userA.email },
    update: { password: pw },
    create: {
      id: SEED.userA.id,
      email: SEED.userA.email,
      name: SEED.userA.name,
      password: pw,
      emailVerified: new Date(),
    },
  })
  console.log("User A:", userA.id, userA.email)

  // --- User B ---
  const userB = await prisma.user.upsert({
    where: { email: SEED.userB.email },
    update: { password: pw },
    create: {
      id: SEED.userB.id,
      email: SEED.userB.email,
      name: SEED.userB.name,
      password: pw,
      emailVerified: new Date(),
    },
  })
  console.log("User B:", userB.id, userB.email)

  // --- Team A (owned by User A) ---
  const teamA = await prisma.team.upsert({
    where: { slug: SEED.teamA.slug },
    update: {},
    create: {
      id: SEED.teamA.id,
      name: "Test Team A",
      slug: SEED.teamA.slug,
      ownerId: userA.id,
    },
  })
  console.log("Team A:", teamA.id)

  // --- Team B (owned by User B) ---
  const teamB = await prisma.team.upsert({
    where: { slug: SEED.teamB.slug },
    update: {},
    create: {
      id: SEED.teamB.id,
      name: "Test Team B",
      slug: SEED.teamB.slug,
      ownerId: userB.id,
    },
  })
  console.log("Team B:", teamB.id)

  // --- TeamMember A: User A in Team A ---
  const tmA = await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: teamA.id, userId: userA.id } },
    update: {},
    create: {
      id: SEED.memberA.id,
      teamId: teamA.id,
      userId: userA.id,
      role: "ADMIN",
    },
  })
  console.log("TeamMember A:", tmA.id)

  // --- TeamMember B: User B in Team B ---
  const tmB = await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: teamB.id, userId: userB.id } },
    update: {},
    create: {
      id: SEED.memberB.id,
      teamId: teamB.id,
      userId: userB.id,
      role: "ADMIN",
    },
  })
  console.log("TeamMember B:", tmB.id)

  // --- Board A (owned by User A, in Team A) ---
  const boardA = await prisma.board.upsert({
    where: { id: SEED.boardA.id },
    update: {},
    create: {
      id: SEED.boardA.id,
      name: "Test Board A",
      teamId: teamA.id,
      ownerId: userA.id,
    },
  })
  console.log("Board A:", boardA.id)

  // --- Board B (owned by User B, in Team B) ---
  const boardB = await prisma.board.upsert({
    where: { id: SEED.boardB.id },
    update: {},
    create: {
      id: SEED.boardB.id,
      name: "Test Board B",
      teamId: teamB.id,
      ownerId: userB.id,
    },
  })
  console.log("Board B:", boardB.id)

  // --- BoardMember A: User A in Board A ---
  await prisma.boardMember.upsert({
    where: { boardId_userId: { boardId: boardA.id, userId: userA.id } },
    update: {},
    create: {
      boardId: boardA.id,
      userId: userA.id,
      role: "ADMIN",
    },
  })
  console.log("BoardMember A: User A in Board A")

  // --- BoardMember B: User B in Board B ---
  await prisma.boardMember.upsert({
    where: { boardId_userId: { boardId: boardB.id, userId: userB.id } },
    update: {},
    create: {
      boardId: boardB.id,
      userId: userB.id,
      role: "ADMIN",
    },
  })
  console.log("BoardMember B: User B in Board B")

  console.log("\n=== Seed abgeschlossen ===")
  console.log("Board A ID:", boardA.id, "  (User A's board, User B hat keinen Zugriff)")
  console.log("Board B ID:", boardB.id)
  console.log("TeamMember A ID:", tmA.id, "  (in Team A, User B darf nicht aendern/loeschen)")
  console.log("TeamMember B ID:", tmB.id)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
