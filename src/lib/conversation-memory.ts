import { prisma } from "@/lib/db"
import { aiRegistry } from "@/lib/ai/registry"

export async function summarizeConversation(conversationId: string): Promise<void> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { boardId: true, summaryUpdatedAt: true, conversationSummary: true },
  })
  if (!conversation?.boardId) return

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { timestamp: "asc" },
    select: { direction: true, content: true, timestamp: true },
  })

  if (messages.length < 5) return

  const transcript = messages
    .map((m) => `${m.direction === "INBOUND" ? "Nutzer" : "Assistent"}: ${m.content}`)
    .join("\n")

  const prevSummary = conversation.conversationSummary
    ? `Vorherige Zusammenfassung: ${conversation.conversationSummary}\n\n`
    : ""

  const response = await aiRegistry.execute({
    boardId: conversation.boardId,
    purpose: "summarization",
    messages: [
      {
        role: "system",
        content: "Du erstellst präzise Gesprächszusammenfassungen. Antworte nur mit dem reinen Zusammenfassungstext, ohne Einleitung oder Formatierung.",
      },
      {
        role: "user",
        content: `${prevSummary}Fasse dieses Gespräch in 3-5 Sätzen zusammen. Fokus auf: gesammelte Daten, Nutzerpräferenzen, getroffene Entscheidungen, offene Fragen, emotionaler Ton.\n\n${transcript}`,
      },
    ],
    maxTokens: 300,
    temperature: 0.3,
  })

  if (response.content) {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        conversationSummary: response.content.trim(),
        summaryUpdatedAt: new Date(),
        messageCountSinceSum: 0,
      },
    })
  }
}
