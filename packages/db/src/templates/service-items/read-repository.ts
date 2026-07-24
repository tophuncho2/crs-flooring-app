import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import { normalizeTemplateServiceItem, type TemplateServiceItemRow } from "@builders/domain"

type TemplatesDbClient = PrismaClient | Prisma.TransactionClient

// Shared select fragment — reused by the standalone list read below AND the
// template detail read (which embeds service items as a nested array). No product
// join: a service item has no product; cost is a stored column, not a join.
export const templateServiceItemSelect = {
  id: true,
  itemType: true,
  itemName: true,
  quantity: true,
  // Item's own unit FK + resolved unit (UoM epic 2C); `unit` resolves the display
  // name/abbrev.
  unitId: true,
  unit: { select: { name: true, abbreviation: true } },
  // Persisted job-costing money column (cost is stored here, not a join, and
  // is the per-unit basis for the derived line total).
  cost: true,
  taxed: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
} as const

export async function listTemplateServiceItems(
  templateId: string,
  client: TemplatesDbClient = db,
): Promise<TemplateServiceItemRow[]> {
  const items = await client.templateServiceItem.findMany({
    where: { templateId },
    select: templateServiceItemSelect,
    orderBy: { createdAt: "asc" },
  })

  return items.map(normalizeTemplateServiceItem)
}
