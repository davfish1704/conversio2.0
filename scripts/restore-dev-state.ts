/**
 * Idempotentes Restore-Script für den Dev-Zustand nach einem DB-Reset.
 *
 * Erstellt/aktualisiert: Admin-User → Team → TeamMember → optional Board + States.
 *
 * Verwendung:
 *   npx tsx scripts/restore-dev-state.ts --email <email> --password <pass> --name <name>
 *   npx tsx scripts/restore-dev-state.ts --email <email> --password <pass> --name <name> --template insurance
 *
 * Templates: insurance | real-estate | generic
 */

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

// ── CLI Args ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)

function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`)
  return idx !== -1 ? args[idx + 1] : undefined
}

const emailArg    = getArg("email")
const passwordArg = getArg("password")
const nameArg     = getArg("name")
const templateArg = getArg("template")

if (!emailArg || !passwordArg || !nameArg) {
  console.error("Verwendung: npx tsx scripts/restore-dev-state.ts --email <email> --password <password> --name <name> [--template insurance|real-estate|generic]")
  process.exit(1)
}

const email    = emailArg.toLowerCase().trim()
const name     = nameArg.trim()
const password = passwordArg // Raw — NICHT ausgeben

// ── Template Loader ────────────────────────────────────────────────────────────

async function loadTemplate(templateName: string) {
  switch (templateName.toLowerCase()) {
    case "insurance":
      return (await import("../prisma/seed-templates/insurance")).insuranceTemplate
    case "real-estate":
    case "realestate":
      return (await import("../prisma/seed-templates/real-estate")).realEstateTemplate
    case "generic":
    case "generic-funnel":
      return (await import("../prisma/seed-templates/generic-funnel")).genericFunnelTemplate
    default:
      throw new Error(`Unbekanntes Template: '${templateName}'. Verfügbar: insurance, real-estate, generic`)
  }
}

// ── Team Slug Generator ────────────────────────────────────────────────────────

function emailToSlug(e: string): string {
  // "info@trsales.net" → "trsales-team"
  const prefix = e.split("@")[1]?.split(".")[0] ?? e.split("@")[0]
  return `${prefix}-team`.toLowerCase().replace(/[^a-z0-9-]/g, "-")
}

async function findOrCreateTeam(userId: string): Promise<{ id: string; name: string; slug: string }> {
  // Existing team owned by this user
  const existing = await prisma.team.findFirst({
    where: { ownerId: userId },
    select: { id: true, name: true, slug: true },
  })
  if (existing) return existing

  // Create new team — handle slug collisions
  const baseSlug = emailToSlug(email)
  let slug = baseSlug
  let attempt = 1

  while (true) {
    const collision = await prisma.team.findUnique({ where: { slug }, select: { id: true } })
    if (!collision) break
    attempt++
    slug = `${baseSlug}-${attempt}`
  }

  const team = await prisma.team.create({
    data: {
      name:    `${name}'s Team`,
      slug,
      ownerId: userId,
      plan:    "pro",
    },
    select: { id: true, name: true, slug: true },
  })

  return team
}

// ── State Seeder (inline, same logic as seed-templates.ts) ────────────────────

async function seedStates(
  boardId: string,
  states: import("../prisma/seed-templates/types").StateTemplate[],
): Promise<void> {
  const createdIds = new Map<string, string>() // name → id

  for (const s of states) {
    const created = await prisma.state.create({
      data: {
        boardId,
        name:                    s.name,
        type:                    s.type,
        orderIndex:              s.orderIndex,
        agentRole:               s.agentRole              ?? null,
        agentSystemPrompt:       s.agentSystemPrompt      ?? null,
        agentGoal:               s.agentGoal              ?? null,
        handoffMode:             s.handoffMode            ?? "HYBRID",
        handoffRules:            s.handoffRules           ?? [],
        minAgentConfidence:      s.minAgentConfidence     ?? 0.7,
        mission:                 s.mission                ?? null,
        rules:                   s.rules                  ?? null,
        availableTools:          s.availableTools         ?? [],
        dataToCollect:           s.dataToCollect          ?? [],
        escalateOnNoReply:       s.escalateOnNoReply      ?? null,
        escalateOnLowConfidence: s.escalateOnLowConfidence ?? true,
        escalateOnOffMission:    s.escalateOnOffMission    ?? true,
        isActive:                true,
      },
      select: { id: true },
    })
    createdIds.set(s.name, created.id)
  }

  // Wire nextStateId links
  for (const s of states) {
    if (!s.nextStateName) continue
    const currentId = createdIds.get(s.name)
    const nextId    = createdIds.get(s.nextStateName)
    if (!currentId || !nextId) continue
    await prisma.state.update({ where: { id: currentId }, data: { nextStateId: nextId } })
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🔄 Conversio — Dev State Restore\n")

  // ── Step 1: Password Hash ──────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash(password, 12)

  // ── Step 2: User upsert ────────────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      password:         hashedPassword,
      role:             "ADMIN",
      emailVerified:    new Date(),
      verifyToken:      null,
      verifyTokenExpiry: null,
    },
    create: {
      email,
      name,
      password:         hashedPassword,
      role:             "ADMIN",
      emailVerified:    new Date(),
      verifyToken:      null,
      verifyTokenExpiry: null,
    },
    select: { id: true, email: true, role: true, emailVerified: true, password: true },
  })

  console.log(`✅ Admin user ready: ${user.email} (role: ${user.role})`)

  // ── Step 3: Team ───────────────────────────────────────────────────────────
  const team = await findOrCreateTeam(user.id)
  console.log(`✅ Team: ${team.slug} (id: ${team.id})`)

  // ── Step 4: TeamMember ─────────────────────────────────────────────────────
  await prisma.teamMember.upsert({
    where:  { teamId_userId: { teamId: team.id, userId: user.id } },
    update: { role: "ADMIN" },
    create: { teamId: team.id, userId: user.id, role: "ADMIN" },
  })

  // ── Step 5: Board + Template (optional) ───────────────────────────────────
  if (templateArg) {
    const template = await loadTemplate(templateArg)

    const board = await prisma.board.create({
      data: {
        teamId:  team.id,
        ownerId: user.id,
        name:    template.name,
        description: template.description,
        isActive: true,
        members: { create: { userId: user.id, role: "ADMIN" } },
      },
      select: { id: true, name: true },
    })

    await seedStates(board.id, template.states)
    console.log(`✅ Board: ${board.name} (id: ${board.id}, template: ${templateArg})`)
  }

  // ── Step 6: Login-Verifikation ─────────────────────────────────────────────
  const storedHash = user.password!
  const hashValid = await bcrypt.compare(password, storedHash)
  const emailVerified = user.emailVerified !== null

  if (hashValid && emailVerified) {
    console.log(`✅ Login-Verifikation: Passwort-Hash valid, emailVerified: gesetzt`)
  } else {
    if (!hashValid)      console.error("❌ Passwort-Mismatch — Hash stimmt nicht!")
    if (!emailVerified)  console.error("❌ emailVerified nicht gesetzt!")
    process.exit(1)
  }

  console.log("\nLogin unter /login mit der angegebenen Email und dem Passwort möglich.\n")
}

main()
  .catch((err) => {
    console.error("\n❌ Fehler:", err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
