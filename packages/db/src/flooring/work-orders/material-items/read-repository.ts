import { db } from "../../../client.js"
import type { Prisma, PrismaClient } from "../../../generated/prisma/client.js"
import {
  normalizeWorkOrderMaterialItem,
  type WorkOrderMaterialItemRow,
} from "@builders/domain"

type WorkOrdersDbClient = PrismaClient | Prisma.TransactionClient

const workOrderMaterialItemSelect = {
  id: true,
  productId: true,
  product: { select: { name: true } },
  quantity: true,
  // The item's OWN unit FK + resolved unit (UoM epic 2C); `unit` resolves the
  // display name/abbrev (snapshot columns fully de-referenced, 2D drops them).
  unitId: true,
  unit: { select: { name: true, abbreviation: true } },
  notes: true,
  sourceTemplatePlannedProductId: true,
  createdAt: true,
  createdBy: true,
  updatedBy: true,
} as const

export async function listWorkOrderMaterialItems(
  workOrderId: string,
  client: WorkOrdersDbClient = db,
): Promise<WorkOrderMaterialItemRow[]> {
  const items = await client.flooringWorkOrderItem.findMany({
    where: { workOrderId },
    select: workOrderMaterialItemSelect,
    orderBy: { createdAt: "asc" },
  })

  return items.map((item) => normalizeWorkOrderMaterialItem(item))
}

