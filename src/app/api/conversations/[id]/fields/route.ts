import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"

/**
 * PATCH /api/conversations/[id]/fields
 * Update custom fields for a lead (via conversation ID)
 * Body: { customFields?: Record<string, any>, customData?: Record<string, any> }
 * Speichert in lead.customData
 */

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { customFields, customData } = body

    const fieldsToUpdate = customFields || customData

    if (!fieldsToUpdate || typeof fieldsToUpdate !== "object") {
      return NextResponse.json({ error: "customFields or customData object is required" }, { status: 400 })
    }

    // findFirst mit Board-Membership-Check
    const conversation = await (prisma as any).conversation.findFirst({
      where: {
        id: params.id,
        board: { members: { some: { userId: session.user.id } } },
      },
      include: { lead: true },
    })

    if (!conversation || !conversation.lead) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
    }

    const existingCustomData = (conversation.lead.customData as Record<string, unknown> | null) || {}

    const merged = { ...existingCustomData, ...fieldsToUpdate }

    // Track field changes for audit
    const changes: Array<{
      field: string
      oldValue: unknown
      newValue: unknown
      timestamp: string
    }> = []

    for (const [key, value] of Object.entries(fieldsToUpdate)) {
      if (existingCustomData[key] !== value) {
        changes.push({
          field: key,
          oldValue: existingCustomData[key],
          newValue: value,
          timestamp: new Date().toISOString(),
        })
      }
    }

    const updatedLead = await (prisma as any).lead.update({
      where: { id: conversation.lead.id },
      data: { customData: merged },
    })

    return NextResponse.json({ lead: updatedLead, changes })
  } catch (error) {
    console.error("Fields update error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
