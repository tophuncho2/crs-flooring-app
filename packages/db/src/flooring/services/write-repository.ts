import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "@prisma/client"
import { normalizeServiceRow, type ServiceRecord } from "./read-repository.js"

type ServiceDbClient = PrismaClient | Prisma.TransactionClient

const serviceInclude = {
  unit: {
    select: {
      id: true,
      name: true,
    },
  },
  _count: {
    select: {
      templateItems: true,
      workOrderItems: true,
    },
  },
} as const

export async function createServiceRecord(
  input: { name: string; unitId: string; baseCost: string | number; notes: string | null },
  client: ServiceDbClient = db,
): Promise<ServiceRecord> {
  const service = await client.flooringService.create({
    data: input,
    include: serviceInclude,
  })

  return normalizeServiceRow(service)
}

export async function updateServiceRecord(
  id: string,
  input: { name: string; unitId: string; baseCost: string | number; notes: string | null },
  client: ServiceDbClient = db,
): Promise<ServiceRecord> {
  const service = await client.flooringService.update({
    where: { id },
    data: input,
    include: serviceInclude,
  })

  return normalizeServiceRow(service)
}

export async function deleteServiceRecordById(
  id: string,
  client: ServiceDbClient = db,
): Promise<void> {
  await client.flooringService.delete({
    where: { id },
  })
}
