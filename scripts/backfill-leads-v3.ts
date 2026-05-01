/**
 * backfill-leads-v3.ts
 *
 * Läuft NACH v3_prep und VOR v3_finalize.
 * Erstellt Lead-Einträge aus bestehenden Conversations und
 * migriert conversation_memory → lead_memory.
 *
 * Ausführen mit:
 *   npx tsx scripts/backfill-leads-v3.ts
 *
 * Gruppierung: (customerPhone, boardId) → 1 Lead.
 * Mehrere Conversations mit gleicher Phone+Board teilen sich einen Lead.
 * Conversations ohne boardId werden übersprungen (Waisenkinder).
 */

import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient({ log: ['warn', 'error'] })

// ─── Typen für alte DB-Spalten die im neuen Schema nicht mehr exist. ─────────

type OldConversation = {
  id: string
  boardId: string | null
  currentStateId: string | null
  customerPhone: string
  customerName: string | null
  customerAvatar: string | null
  source: string | null
  channel: string
  tags: string[]
  leadScore: number
  stateHistory: Prisma.JsonValue | null
  customData: Prisma.JsonValue
  createdAt: Date
}

type OldMemory = {
  conversationId: string
  key: string
  value: string
}

// ─── Hilfsfunktion: Array sicher chunken für große Batches ───────────────────

function chunks<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size))
  return result
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== v3 Lead Backfill ===\n')

  // 1. Alle Conversations mit boardId laden (alte Spalten via Raw SQL)
  const allConvs = await prisma.$queryRaw<OldConversation[]>`
    SELECT
      id,
      "boardId",
      "currentStateId",
      "customerPhone",
      "customerName",
      "customerAvatar",
      source,
      channel,
      tags,
      "leadScore",
      "stateHistory",
      "customData",
      "createdAt"
    FROM conversations
    WHERE "boardId" IS NOT NULL
    ORDER BY "createdAt" ASC
  `

  console.log(`Conversations mit boardId: ${allConvs.length}`)

  const skippedCount = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*)::bigint FROM conversations WHERE "boardId" IS NULL
  `
  console.log(`Übersprungen (kein boardId): ${skippedCount[0].count}\n`)

  if (allConvs.length === 0) {
    console.log('Nichts zu migrieren.')
    return
  }

  // 2. Nach (customerPhone, boardId) gruppieren → 1 Lead pro Kontakt+Board
  const groups = new Map<string, OldConversation[]>()

  for (const c of allConvs) {
    const key = `${c.customerPhone}::${c.boardId}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(c)
  }

  console.log(`Unique (phone, board) Gruppen → ${groups.size} Leads werden erstellt\n`)

  let created = 0
  let errors = 0
  let memoriesMigrated = 0
  const groupList = [...groups.entries()]

  for (let i = 0; i < groupList.length; i++) {
    const [groupKey, group] = groupList[i]
    const first = group[0] // Älteste Conversation als Basis für Lead-Daten

    try {
      // 3. Lead anlegen
      const lead = await prisma.lead.create({
        data: {
          boardId:        first.boardId!,
          currentStateId: first.currentStateId ?? undefined,
          name:           first.customerName ?? undefined,
          phone:          first.customerPhone,
          avatar:         first.customerAvatar ?? undefined,
          source:         first.source ?? 'manual',
          channel:        first.channel ?? 'whatsapp',
          tags:           first.tags ?? [],
          leadScore:      first.leadScore ?? 0,
          stateHistory:   first.stateHistory ?? undefined,
          customData:     (first.customData as object) ?? {},
        },
      })

      // 4. Alle Conversations der Gruppe auf diesen Lead zeigen lassen
      const ids = group.map(c => c.id)

      for (const convChunk of chunks(ids, 50)) {
        await prisma.$executeRaw`
          UPDATE "conversations"
          SET    "leadId" = ${lead.id}
          WHERE  "id" IN (${Prisma.join(convChunk)})
        `
      }

      // 5. conversation_memory → lead_memory migrieren
      //    Alle Memories dieser Gruppe per Raw SQL holen
      const memories = await prisma.$queryRaw<OldMemory[]>`
        SELECT "conversationId", key, value
        FROM   conversation_memory
        WHERE  "conversationId" IN (${Prisma.join(ids)})
        ORDER BY "createdAt" ASC
      `

      for (const mem of memories) {
        await prisma.leadMemory.upsert({
          where:  { leadId_key: { leadId: lead.id, key: mem.key } },
          create: { leadId: lead.id, key: mem.key, value: mem.value },
          update: { value: mem.value }, // spätere Conversation-Memory überschreibt
        })
        memoriesMigrated++
      }

      created++

      if ((i + 1) % 100 === 0) {
        console.log(`  ${i + 1}/${groupList.length} Leads erstellt…`)
      }
    } catch (err) {
      console.error(`\nFehler bei Gruppe "${groupKey}":`, err)
      errors++
    }
  }

  // 6. Abschlussbericht
  console.log('\n─── Ergebnis ───────────────────────────────────────')
  console.log(`Leads erstellt:         ${created}`)
  console.log(`Memories migriert:      ${memoriesMigrated}`)
  console.log(`Fehler:                 ${errors}`)

  const unlinked = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*)::bigint FROM conversations WHERE "leadId" IS NULL AND "boardId" IS NOT NULL
  `
  const unlinkedCount = Number(unlinked[0].count)
  console.log(`Unverknüpfte Convs:     ${unlinkedCount}`)

  if (unlinkedCount > 0) {
    console.error('\n⚠  WARNUNG: Es gibt noch Conversations ohne leadId!')
    console.error('   v3_finalize NICHT ausführen bis dieser Wert 0 ist.')
    process.exit(1)
  } else if (errors > 0) {
    console.error('\n⚠  WARNUNG: Es gab Fehler bei einzelnen Gruppen. Bitte prüfen.')
    process.exit(1)
  } else {
    console.log('\n✓ Backfill erfolgreich. v3_finalize kann jetzt ausgeführt werden.')
  }
}

main()
  .catch(err => {
    console.error('\nFataler Fehler:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
