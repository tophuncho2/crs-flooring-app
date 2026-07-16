import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"

type WorkOrderPrintEventsDbClient = PrismaClient | Prisma.TransactionClient

export type CreateWorkOrderPrintEventRecordInput = {
  workOrderId: string
  // Nullable: the doc type may have been deleted between load and print. The name
  // snapshot below is the durable label either way.
  documentTypeId: string | null
  documentTypeName: string
  createdBy: string
}

/**
 * Append one print/export event. The log is append-only (no update, no OCC) —
 * per-doc-type counts are aggregates (see `getWorkOrderPrintCountsByDocumentType`).
 */
export async function createWorkOrderPrintEventRecord(
  input: CreateWorkOrderPrintEventRecordInput,
  client: WorkOrderPrintEventsDbClient = db,
): Promise<void> {
  await client.flooringWorkOrderPrintEvent.create({
    data: {
      workOrderId: input.workOrderId,
      documentTypeId: input.documentTypeId,
      documentTypeName: input.documentTypeName,
      createdBy: input.createdBy,
    },
  })
}
