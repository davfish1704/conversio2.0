import { prisma } from "@/lib/db"

export async function executePauseLead(leadId: string): Promise<void> {
  await prisma.conversation.updateMany({
    where: { leadId, status: "ACTIVE" },
    data:  { frozen: true, frozenReason: "supervisor_pause", frozenAt: new Date() },
  })
}
