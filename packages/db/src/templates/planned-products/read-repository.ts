import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import { normalizeTemplatePlannedProduct, type TemplatePlannedProductRow } from "@builders/domain"

type TemplatesDbClient = PrismaClient | Prisma.TransactionClient

const templatePlannedProductSelect = {
  id: true,
  productId: true,
  // `cost` is a LIVE read-join off the product — the planned product no longer
  // stores its own cost; the row's subtotal derives from it.
  product: { select: { name: true, cost: true, category: { select: { name: true } } } },
  quantity: true,
  // The item's OWN unit FK + resolved unit (UoM epic 2C); `unit` resolves the
  // display name/abbrev (snapshot columns fully de-referenced, 2D drops them).
  unitId: true,
  unit: { select: { name: true, abbreviation: true } },
  notes: true,
  estimatedGrossProfitMargin: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
} as const

export async function listTemplatePlannedProducts(
  templateId: string,
  client: TemplatesDbClient = db,
): Promise<TemplatePlannedProductRow[]> {
  const items = await client.templatePlannedProduct.findMany({
    where: { templateId },
    select: templatePlannedProductSelect,
    orderBy: { createdAt: "asc" },
  })

  return items.map(normalizeTemplatePlannedProduct)
}
