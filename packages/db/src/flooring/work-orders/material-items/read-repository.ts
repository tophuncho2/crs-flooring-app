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
  sendUnitName: true,
  sendUnitAbbrev: true,
  notes: true,
  status: true,
  sourceTemplateItemId: true,
  createdAt: true,
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

