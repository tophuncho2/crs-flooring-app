import { db } from "../../../client.js"
import type { Prisma, PrismaClient } from "../../../generated/prisma/client.js"
import { normalizeTemplateMaterialItem, type TemplateMaterialItemRow } from "@builders/domain"

type TemplatesDbClient = PrismaClient | Prisma.TransactionClient

const templateMaterialItemSelect = {
  id: true,
  productId: true,
  product: { select: { name: true, category: { select: { name: true } } } },
  quantity: true,
  // The item's OWN unit FK + resolved unit (UoM epic 2C); `unit` resolves the
  // display name/abbrev, the frozen `sendUnit*` strings are the fallback.
  unitId: true,
  unit: { select: { name: true, abbreviation: true } },
  sendUnitName: true,
  sendUnitAbbrev: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
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
