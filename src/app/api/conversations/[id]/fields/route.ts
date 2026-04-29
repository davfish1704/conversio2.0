import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"
// assertConversationOwnership nicht nötig — Ownership-Check ist ins findFirst unten eingebaut

/**
 * PATCH /api/conversations/[id]/fields
 * Update custom fields for a conversation
 * Body: { customFields: Record<string, any>, fieldHistory?: Array }
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
    const { customFields, fieldHistory } = body

    if (!customFields || typeof customFields !== "object") {
      return NextResponse.json({ error: "customFields object is required" }, { status: 400 })
    }

    // findFirst mit Board-Membership-Check — kombiniert Ownership-Prüfung + Datenabruf
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: params.id,
        board: { members: { some: { userId: session.user.id } } },
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
    }

    // Merge with existing custom fields
    const existingFields = (conversation.customFields as Record<string, any> | null) || {}
    const mergedFields = { ...existingFields, ...customFields }

    // Track field changes for audit
    const changes: Array<{
      field: string
      oldValue: any
      newValue: any
      timestamp: string
    }> = []

    for (const [key, value] of Object.entries(customFields)) {
      if (existingFields[key] !== value) {
        changes.push({
          field: key,
          oldValue: existingFields[key],
          newValue: value,
          timestamp: new Date().toISOString(),
        })
      }
    }

    const updatedConversation = await prisma.conversation.update({
      where: { id: params.id },
      data: {
        customFields: mergedFields,
      },
      include: {
        currentState: true,
      },
    })

    return NextResponse.json({
      conversation: updatedConversation,
      changes,
    })
  } catch (error) {
    console.error("❌ Fields update error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
