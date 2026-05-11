import { prisma } from "@/lib/db"
import { aiRegistry } from "@/lib/ai/registry"

export async function summarizeConversation(conversationId: string): Promise<void> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      boardId: true,
      summaryUpdatedAt: true,
      conversationSummary: true,
    },
  })
  if (!conversation?.boardId) return

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { timestamp: "asc" },
    select: { direction: true, content: true, timestamp: true },
  })

  if (messages.length < 5) return

  const transcript = messages
    .map((m) =>
      m.direction === "INBOUND"
        ? `User: ${m.content}`
        : `Assistant: ${m.content}`,
    )
    .join("\n")

  const prevSummary = conversation.conversationSummary
    ? `Previous summary: ${conversation.conversationSummary}\n\n`
    : ""

  const response = await aiRegistry.execute({
    boardId: conversation.boardId,
    purpose: "summarization",
    messages: [
      {
        role: "system",
        content:
          "You create precise conversation summaries. Reply with the summary text only, no introduction or formatting. Write in the same language as the conversation.",
      },
      {
        role: "user",
        content: `${prevSummary}Summarize this conversation in 3-5 sentences. Focus on: collected data, user preferences, decisions made, open questions, emotional tone.\n\n${transcript}`,
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
