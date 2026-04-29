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

    // Get board and WA account
    const board = await prisma.board.findUnique({
      where: { id: params.id },
      select: { teamId: true },
    })

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 })
    }

    let waAccount = await prisma.whatsAppAccount.findFirst({
      where: { teamId: board.teamId },
    })

    if (!waAccount) {
      waAccount = await prisma.whatsAppAccount.create({
        data: {
          teamId: board.teamId,
          phoneNumber: "placeholder",
          status: "ACTIVE",
        },
      })
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

        // Check if exists
        const existing = await prisma.conversation.findFirst({
          where: {
            customerPhone: normalizedPhone,
            waAccountId: waAccount.id,
          },
        })

        if (existing) {
          // Update
          await prisma.conversation.update({
            where: { id: existing.id },
            data: {
              boardId: params.id,
              currentStateId: firstState?.id || existing.currentStateId,
              customerName: name || existing.customerName,
              tags,
              source: "csv_import",
            },
          })
        } else {
          await prisma.conversation.create({
            data: {
              customerPhone: normalizedPhone,
              customerName: name || normalizedPhone,
              waAccountId: waAccount.id,
              boardId: params.id,
              currentStateId: firstState?.id || null,
              source: "csv_import",
              tags,
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
    console.error("❌ Import API error:", error)
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
