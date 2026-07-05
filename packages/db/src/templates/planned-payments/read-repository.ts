import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import { normalizeTemplatePlannedPayment, type TemplatePlannedPaymentRow } from "@builders/domain"

type TemplatesDbClient = PrismaClient | Prisma.TransactionClient

const templatePlannedPaymentSelect = {
  id: true,
  amount: true,
  direction: true,
  paymentDate: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
} as const

export async function listTemplatePlannedPayments(
  templateId: string,
  client: TemplatesDbClient = db,
): Promise<TemplatePlannedPaymentRow[]> {
  const items = await client.templatePlannedPayment.findMany({
    where: { templateId },
    select: templatePlannedPaymentSelect,
    orderBy: { createdAt: "asc" },
  })

  return items.map(normalizeTemplatePlannedPayment)
}
