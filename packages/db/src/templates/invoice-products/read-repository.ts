import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import { normalizeTemplateInvoiceProduct, type TemplateInvoiceProductRow } from "@builders/domain"

type TemplatesDbClient = PrismaClient | Prisma.TransactionClient

const templateInvoiceProductSelect = {
  id: true,
  productId: true,
  product: { select: { name: true, category: { select: { name: true } } } },
  quantity: true,
  // The item's OWN unit FK + resolved unit (UoM epic 2C); `unit` resolves the
  // display name/abbrev (snapshot columns fully de-referenced, 2D drops them).
  unitId: true,
  unit: { select: { name: true, abbreviation: true } },
  notes: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
} as const

export async function listTemplateInvoiceProducts(
  templateId: string,
  client: TemplatesDbClient = db,
): Promise<TemplateInvoiceProductRow[]> {
  const items = await client.templateInvoiceProduct.findMany({
    where: { templateId },
    select: templateInvoiceProductSelect,
    orderBy: { createdAt: "asc" },
  })

  return items.map(normalizeTemplateInvoiceProduct)
}
