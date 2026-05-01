import { prisma } from "./db"
import { generateAIResponse } from "./ai-service"
import { getCurrentState, checkStateTransition } from "./state-machine"
import { runAgentLoop, type AgentLoopContext } from "./ai/tool-engine"
import { sendMessage as dispatchMessage } from "./messaging/dispatcher"
import { createNotification } from "./notifications"

/**
 * Main agent orchestration:
 * 1. Gets current state
 * 2. Loads brainlab config
 * 3. Builds message context
 * 4. Generates AI response
 * 5. Saves + sends message
 * 6. Checks state transition
 */
export async function processAgentResponse(conversationId: string, userMessage: string) {
  try {
    // 1. Get conversation with current state
    const currentState = await getCurrentState(conversationId)
    if (!currentState) {
      console.warn(`⚠️ No state found for conversation ${conversationId}`)
      return
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    })

    if (!conversation) {
      console.warn(`⚠️ Conversation not found: ${conversationId}`)
      return
    }

    // Check if frozen
    if (conversation.frozen) {
      console.log(`❄️ Conversation ${conversationId} is frozen. Skipping AI response.`)
      return
    }

    // Check if AI enabled
    if (conversation.aiEnabled === false) {
      console.log(`🤖 AI disabled for conversation ${conversationId}. Skipping.`)
      return
    }

    // 2. Load brainlab
    const brain = await prisma.boardBrain.findUnique({
      where: { boardId: conversation.boardId || "undefined" },
    })

    if (!brain) {
      console.warn(`⚠️ No brainlab found for board ${conversation.boardId}`)
    }

    // 3. Build message context (last 10 messages)
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { timestamp: "desc" },
      take: 10,
    })

    const context = messages.reverse().map((m) => ({
      direction: m.direction,
      content: m.content,
      timestamp: m.timestamp,
    }))

    // 4. Generate AI response
    let responseText: string

    const brainConfig = brain || {
      systemPrompt: "You are a helpful customer service agent.",
      stylePrompt: "Be friendly and professional.",
      infoPrompt: "",
      rulePrompt: "",
      defaultModel: "gpt-4o-mini",
      temperature: 0.7,
      maxTokens: 500,
      language: "en",
      tone: "friendly",
    }

    if (currentState.type === "MESSAGE") {
      const msgConfig = currentState.config as Record<string, any> | null
      responseText = msgConfig?.text || "Hello! How can I help you?"
    } else if (currentState.type === "WAIT") {
      console.log(`⏱️ WAIT state: no response for conversation ${conversationId}`)
      return
    } else if (currentState.type === "AI") {
      const loopCtx: AgentLoopContext = {
        conversationId,
        boardId: conversation.boardId || "",
        waAccountId: conversation.waAccountId ?? "",
        customerPhone: conversation.customerPhone,
        channel: conversation.channel,
        userMessage,
        brain: brainConfig as any,
        state: {
          id: currentState.id,
          name: currentState.name,
          mission: currentState.mission,
          rules: currentState.rules,
          type: currentState.type,
          nextStateId: currentState.nextStateId ?? null,
          dataToCollect: (currentState.dataToCollect as string[]) ?? [],
          completionRule: currentState.completionRule ?? null,
        },
        collectedFields: (conversation.collectedFields as string[]) ?? [],
        customData: (conversation.customData as Record<string, unknown>) ?? {},
        assets: [],
      }

      const result = await runAgentLoop(loopCtx)

      // Safety-Net: Wenn AI weder geantwortet noch State gewechselt hat
      if (result.sentMessages.length === 0 && result.stateTransitions.length === 0) {
        await prisma.executionLog.create({
          data: {
            boardId: conversation.boardId || "unknown",
            conversationId,
            stateId: currentState.id,
            action: "agent_loop_silent",
            status: "ERROR",
            errorMessage: "AI loop completed without sending message or changing state",
            needsAttention: true,
          },
        })

        responseText = await generateAIResponse(brainConfig, currentState, context, userMessage)
      } else {
        // AI hat geantwortet oder State gewechselt — alles erledigt
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { lastMessageAt: new Date() },
        })

        const didTransition = result.stateTransitions.length > 0
        console.log(
          `✅ Agent AI loop completed for ${conversation.customerPhone}${
            didTransition ? " (state transitioned)" : ""
          }`
        )
        return
      }
    } else if (currentState.type === "CONDITION") {
      responseText = await generateAIResponse(brainConfig, currentState, context, userMessage)
    } else {
      // Fallback für unbekannte State-Typen
      responseText = await generateAIResponse(brainConfig, currentState, context, userMessage)
    }

    // 5. Save outbound message
    const savedMessage = await prisma.message.create({
      data: {
        conversationId,
        direction: "OUTBOUND",
        content: responseText,
        messageType: "TEXT",
        status: "SENT",
        aiGenerated: true,
      },
    })

    // 6. Send via dispatcher (handles Telegram, WhatsApp, etc.)
    const sendResult = await dispatchMessage(conversationId, responseText)
    if (sendResult.ok && sendResult.externalMessageId) {
      await prisma.message.update({
        where: { id: savedMessage.id },
        data: { externalId: sendResult.externalMessageId },
      })
    } else if (!sendResult.ok) {
      console.log(`📤 Message saved locally (send skipped: ${sendResult.error})`)
    }

    // 7. Update conversation lastMessageAt
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    })

    // 8. Check state transition
    const didTransition = await checkStateTransition(conversationId, currentState, userMessage)

    console.log(
      `✅ Agent response sent to ${conversation.customerPhone}${
        didTransition ? " (state transitioned)" : ""
      }`
    )
  } catch (error) {
    console.error("❌ Agent processing error:", error)

    // Try to get boardId for notification
    let boardIdForLog = "unknown"
    try {
      const conv = await prisma.conversation.findUnique({ where: { id: conversationId }, select: { boardId: true } })
      boardIdForLog = conv?.boardId || "unknown"
    } catch { /* ignore */ }

    await prisma.executionLog.create({
      data: {
        boardId: boardIdForLog,
        conversationId,
        action: "AGENT_RESPONSE",
        input: userMessage,
        status: "ERROR",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        needsAttention: true,
      },
    })

    if (boardIdForLog !== "unknown") {
      await createNotification(
        boardIdForLog,
        conversationId,
        "agent_error",
        error instanceof Error ? error.message : "Unknown agent error"
      )
    }
  }
}

