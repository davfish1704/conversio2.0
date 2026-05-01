import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"

/**
 * POST /api/boards/[id]/leads/import
 * Bulk import leads from CSV
 * Accepts multipart/form-data with file field
 */

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const membership = await prisma.boardMember.findFirst({
      where: {
        boardId: params.id,
        userId: session.user.id,
        role: { in: ["ADMIN", "AGENT"] },
      },
    })

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const text = await file.text()
    const rows = parseCSV(text)

    if (rows.length === 0) {
      return NextResponse.json({ error: "CSV is empty or invalid" }, { status: 400 })
    }

    const firstState = await prisma.state.findFirst({
      where: { boardId: params.id },
      orderBy: { orderIndex: "asc" },
    })

    const results = { imported: 0, errors: [] as string[] }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        const phone = row.phone || row.telefon || row.phone_number || row.mobil || row.mobile
        const name = row.name || row.vorname || row.full_name || row.customer_name || ""
        const email = row.email || row.mail || ""
        const tags = row.tags ? row.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : []

        if (!phone) {
          results.errors.push(`Row ${i + 2}: No phone number found`)
          continue
        }

        const normalizedPhone = phone.startsWith("+") ? phone : `+${phone}`

        // Dedup nach phone + boardId
        const existingLead = await (prisma as any).lead.findFirst({
          where: { boardId: params.id, phone: normalizedPhone },
        })

        if (existingLead) {
          // Update
          await (prisma as any).lead.update({
            where: { id: existingLead.id },
            data: {
              currentStateId: firstState?.id || existingLead.currentStateId,
              name: name || existingLead.name,
              tags,
              source: "csv_import",
            },
          })
        } else {
          const lead = await (prisma as any).lead.create({
            data: {
              boardId: params.id,
              phone: normalizedPhone,
              name: name || normalizedPhone,
              email: email || null,
              source: "csv_import",
              channel: "manual",
              tags,
              currentStateId: firstState?.id || null,
              customData: email ? { email } : {},
            },
          })
          // Leere Conversation anlegen
          await (prisma as any).conversation.create({
            data: {
              leadId: lead.id,
              boardId: params.id,
              channel: "manual",
              status: "ACTIVE",
            },
          })
        }

        results.imported++
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error"
        results.errors.push(`Row ${i + 2}: ${msg}`)
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error("Import API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n")
  if (lines.length < 2) return []

  // Parse header
  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().trim())
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx] || ""
    })
    rows.push(row)
  }

  return rows
}

function parseLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}
