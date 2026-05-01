import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"
// assertConversationOwnership nicht nötig — Ownership-Check ist ins findFirst unten eingebaut

/**
 * PATCH /api/conversations/[id]/fields
 * Update custom fields for a conversation
 * Body: { customFields?: Record<string, any>, customData?: Record<string, any>, fieldHistory?: Array }
 * Saves to both customFields (legacy) and customData (new dynamic fields)
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

    // Merge with existing fields
    const existingCustomFields = (conversation.customFields as Record<string, unknown> | null) || {}
    const existingCustomData = (conversation.customData as Record<string, unknown> | null) || {}

    const mergedCustomFields = { ...existingCustomFields, ...fieldsToUpdate }
    const mergedCustomData = { ...existingCustomData, ...fieldsToUpdate }

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

    const updatedConversation = await prisma.conversation.update({
      where: { id: params.id },
      data: {
        customFields: mergedCustomFields,
        customData: mergedCustomData,
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
    console.error("Fields update error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
