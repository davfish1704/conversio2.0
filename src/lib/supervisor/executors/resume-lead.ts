import { prisma } from "@/lib/db"

export async function executeResumeLead(leadId: string): Promise<void> {
  await prisma.conversation.updateMany({
    where: { leadId, status: "ACTIVE", frozen: true, frozenReason: "supervisor_pause" },
    data:  { frozen: false, frozenReason: null, frozenAt: null },
  })
}
