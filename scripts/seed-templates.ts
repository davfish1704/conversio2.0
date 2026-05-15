/**
 * Seed-CLI: Wendet ein State-Template auf ein Board an.
 *
 * Verwendung:
 *   npx tsx scripts/seed-templates.ts --template insurance --boardId <id>
 *   npx tsx scripts/seed-templates.ts --template real-estate --boardId <id>
 *   npx tsx scripts/seed-templates.ts --template generic --boardId <id>
 *
 * Optionen:
 *   --dry-run     Zeigt an, was erstellt werden würde, ohne DB-Änderungen
 *   --clear       Löscht bestehende States des Boards vor dem Seeden
 */

import { PrismaClient } from "@prisma/client"
import type { BoardTemplate, StateTemplate } from "../prisma/seed-templates/types"

const prisma = new PrismaClient()

// ── CLI Args ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)

function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`)
  return idx !== -1 ? args[idx + 1] : undefined
}

function hasFlag(name: string): boolean {
  return args.includes(`--${name}`)
}

const templateName = getArg("template")
const boardId      = getArg("boardId")
const dryRun       = hasFlag("dry-run")
const clearFirst   = hasFlag("clear")

if (!templateName || !boardId) {
  console.error("Verwendung: npx tsx scripts/seed-templates.ts --template <name> --boardId <id>")
  console.error("Verfügbare Templates: insurance | real-estate | generic")
  process.exit(1)
}

// ── Template Loader ────────────────────────────────────────────────────────────

async function loadTemplate(name: string): Promise<BoardTemplate> {
  switch (name.toLowerCase()) {
    case "insurance":
      return (await import("../prisma/seed-templates/insurance")).insuranceTemplate
    case "real-estate":
    case "realestate":
      return (await import("../prisma/seed-templates/real-estate")).realEstateTemplate
    case "generic":
    case "generic-funnel":
      return (await import("../prisma/seed-templates/generic-funnel")).genericFunnelTemplate
    default:
      throw new Error(`Unbekanntes Template: '${name}'. Verfügbar: insurance, real-estate, generic`)
  }
}

// ── Seeder ─────────────────────────────────────────────────────────────────────

async function seedTemplate(boardId: string, template: BoardTemplate): Promise<void> {
  // Verify board exists
  const board = await (prisma as any).board.findUnique({
    where: { id: boardId },
    select: { id: true, name: true },
  })
  if (!board) throw new Error(`Board '${boardId}' nicht gefunden`)

  console.log(`\n📋 Board: ${board.name} (${boardId})`)
  console.log(`📦 Template: ${template.name} (${template.industry})`)

  if (dryRun) {
    console.log("\n🔍 DRY RUN — keine Änderungen werden vorgenommen\n")
    for (const s of template.states) {
      console.log(`  [${s.orderIndex}] ${s.name} (${s.type}) → nächster: ${s.nextStateName ?? "—"}`)
    }
    return
  }

  // Optionally clear existing states
  if (clearFirst) {
    const deleted = await (prisma as any).state.deleteMany({ where: { boardId } })
    console.log(`🗑  ${deleted.count} bestehende States gelöscht`)
  }

  // Step 1: Create all states (without nextStateId first)
  const createdStates = new Map<string, string>() // name → id

  for (const s of template.states) {
    const created = await createState(boardId, s)
    createdStates.set(s.name, created.id)
    console.log(`  ✓ State erstellt: "${s.name}" (${s.type}) → id: ${created.id}`)
  }

  // Step 2: Wire nextStateId links
  let linked = 0
  for (const s of template.states) {
    if (!s.nextStateName) continue
    const currentId = createdStates.get(s.name)
    const nextId    = createdStates.get(s.nextStateName)
    if (!currentId || !nextId) {
      console.warn(`  ⚠ Konnte nextStateId nicht auflösen: "${s.name}" → "${s.nextStateName}"`)
      continue
    }
    await (prisma as any).state.update({
      where: { id: currentId },
      data: { nextStateId: nextId },
    })
    linked++
  }

  console.log(`\n✅ ${createdStates.size} States erstellt, ${linked} nextStateId-Links gesetzt`)
}

async function createState(boardId: string, s: StateTemplate) {
  return (prisma as any).state.create({
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
      rules:                   s.rules                  ?? null,
      availableTools:          s.availableTools         ?? [],
      dataToCollect:           s.dataToCollect          ?? [],
      escalateOnNoReply:       s.escalateOnNoReply      ?? null,
      escalateOnLowConfidence: s.escalateOnLowConfidence ?? true,
      escalateOnOffMission:    s.escalateOnOffMission    ?? true,
      isActive:                true,
    },
  })
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🌱 Conversio State-Seed-CLI`)

  const template = await loadTemplate(templateName!)
  await seedTemplate(boardId!, template)
}

main()
  .catch((err) => {
    console.error("\n❌ Fehler:", err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
