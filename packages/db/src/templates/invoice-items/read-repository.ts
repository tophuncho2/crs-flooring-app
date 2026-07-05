import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import { normalizeTemplateInvoiceItem, type TemplateInvoiceItemRow } from "@builders/domain"

type TemplatesDbClient = PrismaClient | Prisma.TransactionClient

const templateInvoiceItemSelect = {
  id: true,
  amount: true,
  direction: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
} as const

export async function listTemplateInvoiceItems(
  templateId: string,
  client: TemplatesDbClient = db,
): Promise<TemplateInvoiceItemRow[]> {
  const items = await client.templateInvoiceItem.findMany({
    where: { templateId },
    select: templateInvoiceItemSelect,
    orderBy: { createdAt: "asc" },
  })

  return items.map(normalizeTemplateInvoiceItem)
}
