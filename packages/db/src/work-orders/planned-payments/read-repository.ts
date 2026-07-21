import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import { normalizeWorkOrderPlannedPayment, type WorkOrderPlannedPaymentRow } from "@builders/domain"
import { entityTypeSelect } from "../../entities/read-repository.js"

type WorkOrdersDbClient = PrismaClient | Prisma.TransactionClient

const workOrderPlannedPaymentSelect = {
  id: true,
  amount: true,
  direction: true,
  notes: true,
  entityId: true,
  // Linked entity name + type chips — read-only hydration flattened by the
  // domain normalizer (reuses the canonical entityTypeSelect fragment).
  entity: { select: { id: true, entity: true, entityType: entityTypeSelect } },
  paymentPurposeId: true,
  // Linked purpose name + palette color — read-only hydration flattened by the
  // domain normalizer for the colored chip.
  paymentPurpose: { select: { id: true, name: true, color: true } },
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
} as const

export async function listWorkOrderPlannedPayments(
  workOrderId: string,
  client: WorkOrdersDbClient = db,
): Promise<WorkOrderPlannedPaymentRow[]> {
  const items = await client.flooringWorkOrderPlannedPayment.findMany({
    where: { workOrderId },
    select: workOrderPlannedPaymentSelect,
    orderBy: { createdAt: "asc" },
  })

  return items.map(normalizeWorkOrderPlannedPayment)
}
