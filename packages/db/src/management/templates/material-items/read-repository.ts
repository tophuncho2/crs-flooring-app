import { db } from "../../../client.js"
import type { Prisma, PrismaClient } from "@prisma/client"
import { normalizeTemplateMaterialItem, type TemplateMaterialItemRow } from "@builders/domain"

type TemplatesDbClient = PrismaClient | Prisma.TransactionClient

const templateMaterialItemSelect = {
  id: true,
  productId: true,
  product: { select: { name: true } },
  quantity: true,
  unitPrice: true,
  notes: true,
  createdAt: true,
} as const

export async function listTemplateMaterialItems(
  templateId: string,
  client: TemplatesDbClient = db,
): Promise<TemplateMaterialItemRow[]> {
  const items = await client.flooringTemplateItem.findMany({
    where: { templateId },
    select: templateMaterialItemSelect,
    orderBy: { createdAt: "asc" },
  })

  return items.map(normalizeTemplateMaterialItem)
}
