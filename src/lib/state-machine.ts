import { prisma } from "./db"

export interface ConversationWithState {
  id: string
  boardId: string | null
  currentStateId: string | null
  customerPhone: string
}

/**
 * Get the current state for a conversation
 * Falls back to first state of board if none set
 */
export async function getCurrentState(conversationId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      currentState: true,
      board: { include: { states: { orderBy: { orderIndex: "asc" }, take: 1 } } },
    },
  })

  if (!conversation) return null

  // If conversation has a current state, return it
  if (conversation.currentState) {
    return conversation.currentState
  }

  // Otherwise, assign and return the first state of the board
  if (conversation.board?.states?.[0]) {
    const firstState = conversation.board.states[0]
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { currentStateId: firstState.id },
    })
    return firstState
  }

  return null
}

/**
 * Check if state transition should happen and execute it
 */
export async function checkStateTransition(
  conversationId: string,
  currentState: { id: string; type: string; rules: string | null; nextStateId: string | null; autoTransition: boolean },
  userMessage: string
): Promise<boolean> {
  let shouldTransition = false
  let targetStateId: string | null = null

  // CONDITION type: evaluate rules as condition
  if (currentState.type === "CONDITION" && currentState.nextStateId) {
    const condition = parseCondition(currentState.rules)
    if (evaluateCondition(userMessage, condition)) {
      shouldTransition = true
      targetStateId = currentState.nextStateId
    }
  }

  // Auto-transition: always move to next state
  if (currentState.autoTransition && currentState.nextStateId) {
    shouldTransition = true
    targetStateId = currentState.nextStateId
  }

  // Simple keyword-based transition (fallback)
  if (!shouldTransition && currentState.nextStateId) {
    const positiveKeywords = ["ja", "yes", "ok", "klar", "gerne", "passt", "perfekt", "interessiert", "weiter"]
    const lowerMsg = userMessage.toLowerCase()
    if (positiveKeywords.some((kw) => lowerMsg.includes(kw))) {
      shouldTransition = true
      targetStateId = currentState.nextStateId
    }
  }

  if (shouldTransition && targetStateId) {
    await transitionState(conversationId, targetStateId)
    return true
  }

  return false
}

/**
 * Transition conversation to a new state
 */
export async function transitionState(conversationId: string, newStateId: string) {
  const conversation = await prisma.conversation.update({
    where: { id: conversationId },
    data: { currentStateId: newStateId },
    include: { currentState: true },
  })

  console.log(`🔄 State transition: ${conversationId} → ${conversation.currentState?.name || newStateId}`)

  // Log the transition
  await prisma.executionLog.create({
    data: {
      boardId: conversation.boardId || "unknown",
      conversationId,
      stateId: newStateId,
      action: "STATE_TRANSITION",
      status: "SUCCESS",
    },
  })

  return conversation
}

/* ──────────────────────────── Helpers ───────────────────────────────────── */

interface ParsedCondition {
  field?: string
  operator?: string
  value?: string
  raw: string
}

function parseCondition(rulesText: string | null): ParsedCondition {
  if (!rulesText) return { raw: "" }

  // Very simple parser: look for patterns like "score > 50" or "contains: ja"
  const match = rulesText.match(/(\w+)\s*(>|<|=|contains|equals)\s*["']?([^"'\n]+)["']?/i)
  if (match) {
    return {
      field: match[1],
      operator: match[2],
      value: match[3].trim(),
      raw: rulesText,
    }
  }

  return { raw: rulesText }
}

function evaluateCondition(userMessage: string, condition: ParsedCondition): boolean {
  if (!condition.operator) {
    // Default: check if any positive keyword is in message
    const positiveWords = ["ja", "yes", "ok", "klar", "gerne", "passt", "perfekt", "interessiert"]
    return positiveWords.some((w) => userMessage.toLowerCase().includes(w))
  }

  const lowerMsg = userMessage.toLowerCase()
  const lowerVal = (condition.value || "").toLowerCase()

  switch (condition.operator.toLowerCase()) {
    case "contains":
      return lowerMsg.includes(lowerVal)
    case "equals":
    case "=":
      return lowerMsg === lowerVal
    case ">":
      return parseFloat(lowerMsg) > parseFloat(condition.value || "0")
    case "<":
      return parseFloat(lowerMsg) < parseFloat(condition.value || "0")
    default:
      return lowerMsg.includes(lowerVal)
  }
}
