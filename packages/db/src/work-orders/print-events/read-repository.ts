import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"

type WorkOrderPrintEventsDbClient = PrismaClient | Prisma.TransactionClient

/** How many times a work order was printed as a given document type. */
export type WorkOrderPrintCountByDocumentType = {
  documentTypeName: string
  count: number
}

/**
 * Per-doc-type print counts for one work order — the aggregate over the
 * append-only event log. Grouped by the snapshotted `documentTypeName` so the
 * label is always present and survives a doc-type rename/deletion. Ordered by
 * count desc, then name. Empty array when the WO was never printed.
 */
export async function getWorkOrderPrintCountsByDocumentType(
  workOrderId: string,
  client: WorkOrderPrintEventsDbClient = db,
): Promise<WorkOrderPrintCountByDocumentType[]> {
  const groups = await client.flooringWorkOrderPrintEvent.groupBy({
    by: ["documentTypeName"],
    where: { workOrderId },
    _count: { _all: true },
  })

  return groups
    .map((group) => ({ documentTypeName: group.documentTypeName, count: group._count._all }))
    .sort((a, b) => b.count - a.count || a.documentTypeName.localeCompare(b.documentTypeName))
}
