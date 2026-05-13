import { db } from "../../../client.js"
import type { Prisma, PrismaClient } from "../../../generated/prisma/client.js"
import type { WorkOrderFileRow } from "./read-repository.js"

type WorkOrdersDbClient = PrismaClient | Prisma.TransactionClient

const workOrderFileSelect = {
  id: true,
  workOrderId: true,
  fileNumber: true,
  status: true,
  fileKey: true,
  errorMessage: true,
  createdAt: true,
  completedAt: true,
} as const

/**
 * Computes the next fileNumber for this work order (max + 1) and inserts
 * a new file row at status QUEUED. Caller passes the producer's TX
 * client; the unique constraint `[workOrderId, fileNumber]` plus row-level
 * locks (taken by the application layer before this call) prevent races.
 */
export async function createWorkOrderFile(
  workOrderId: string,
  client: WorkOrdersDbClient = db,
): Promise<WorkOrderFileRow> {
  const last = await client.flooringWorkOrderFile.findFirst({
    where: { workOrderId },
    orderBy: { fileNumber: "desc" },
    select: { fileNumber: true },
  })
  const nextFileNumber = (last?.fileNumber ?? 0) + 1

  return client.flooringWorkOrderFile.create({
    data: {
      workOrderId,
      fileNumber: nextFileNumber,
      status: "QUEUED",
    },
    select: workOrderFileSelect,
  })
}

export async function markWorkOrderFileWorking(
  id: string,
  client: WorkOrdersDbClient = db,
): Promise<void> {
  await client.flooringWorkOrderFile.update({
    where: { id },
    data: { status: "WORKING" },
    select: { id: true },
  })
}

export async function markWorkOrderFileCompleted(
  id: string,
  input: { fileKey: string; completedAt: Date },
  client: WorkOrdersDbClient = db,
): Promise<void> {
  await client.flooringWorkOrderFile.update({
    where: { id },
    data: {
      status: "COMPLETED",
      fileKey: input.fileKey,
      completedAt: input.completedAt,
      errorMessage: null,
    },
    select: { id: true },
  })
}

export async function markWorkOrderFileFailed(
  id: string,
  input: { errorMessage: string },
  client: WorkOrdersDbClient = db,
): Promise<void> {
  await client.flooringWorkOrderFile.update({
    where: { id },
    data: {
      status: "FAILED",
      errorMessage: input.errorMessage,
    },
    select: { id: true },
  })
}

/**
 * Removes the file row only. The bucket object delete is the
 * application layer's responsibility (synchronous use case opens its
 * own TX, deletes the bucket object, then calls this).
 */
export async function deleteWorkOrderFile(
  id: string,
  client: WorkOrdersDbClient = db,
): Promise<void> {
  await client.flooringWorkOrderFile.delete({ where: { id } })
}
