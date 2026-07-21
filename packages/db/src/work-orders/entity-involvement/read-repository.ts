import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import {
  normalizeWorkOrderEntityInvolvement,
  type WorkOrderEntityInvolvementRow,
} from "@builders/domain"
import { entityTypeSelect } from "../../entities/read-repository.js"

type WorkOrdersDbClient = PrismaClient | Prisma.TransactionClient

const workOrderEntityInvolvementSelect = {
  id: true,
  entityId: true,
  // Linked entity name + type chips — read-only hydration flattened by the
  // domain normalizer (reuses the canonical entityTypeSelect fragment).
  entity: { select: { id: true, entity: true, entityType: entityTypeSelect } },
  involvementType: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
} as const

export async function listWorkOrderEntityInvolvements(
  workOrderId: string,
  client: WorkOrdersDbClient = db,
): Promise<WorkOrderEntityInvolvementRow[]> {
  const items = await client.flooringWorkOrderEntityInvolvement.findMany({
    where: { workOrderId },
    select: workOrderEntityInvolvementSelect,
    orderBy: { createdAt: "asc" },
  })

  return items.map(normalizeWorkOrderEntityInvolvement)
}
