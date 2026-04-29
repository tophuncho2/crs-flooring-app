import { db } from "../../../client.js"
import type { Prisma, PrismaClient } from "@prisma/client"

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

export type WorkOrderFileRow = Prisma.FlooringWorkOrderFileGetPayload<{
  select: typeof workOrderFileSelect
}>

export async function listWorkOrderFiles(
  workOrderId: string,
  client: WorkOrdersDbClient = db,
): Promise<WorkOrderFileRow[]> {
  return client.flooringWorkOrderFile.findMany({
    where: { workOrderId },
    select: workOrderFileSelect,
    orderBy: { createdAt: "desc" },
  })
}

export async function getWorkOrderFileById(
  id: string,
  client: WorkOrdersDbClient = db,
): Promise<WorkOrderFileRow> {
  return client.flooringWorkOrderFile.findUniqueOrThrow({
    where: { id },
    select: workOrderFileSelect,
  })
}
