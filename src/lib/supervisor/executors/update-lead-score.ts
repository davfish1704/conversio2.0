import { prisma } from "@/lib/db"

export async function executeUpdateLeadScore(
  leadId: string,
  actionParams: Record<string, unknown>,
): Promise<void> {
  const delta = Number(actionParams.delta ?? 0)
  if (delta === 0) return

  await prisma.lead.update({
    where: { id: leadId },
    data:  { leadScore: { increment: delta } },
  })
}
