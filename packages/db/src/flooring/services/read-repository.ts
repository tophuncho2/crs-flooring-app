import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "@prisma/client"

type ServiceDbClient = PrismaClient | Prisma.TransactionClient

// --- Types ---

export type ServiceRecord = {
  id: string
  name: string
  unitId: string
  unitName: string
  baseCost: string
  notes: string
  createdAt: string
  updatedAt: string
}

export type ServiceDeleteStateResult = { id: string } | null

// --- Normalizers ---

export function normalizeServiceRow(service: {
  id: string
  name: string
  baseCost: { toString(): string }
  notes: string | null
  createdAt: Date
  updatedAt: Date
  unit: { id: string; name: string }
}): ServiceRecord {
  return {
    id: service.id,
    name: service.name,
    unitId: service.unit.id,
    unitName: service.unit.name,
    baseCost: service.baseCost.toString(),
    notes: service.notes ?? "",
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
  }
}

// --- Include helpers ---

const serviceInclude = {
  unit: {
    select: {
      id: true,
      name: true,
    },
  },
} as const

// --- Read functions ---

export async function listServices(
  client: ServiceDbClient = db,
): Promise<ServiceRecord[]> {
  const services = await client.flooringService.findMany({
    include: serviceInclude,
    orderBy: { name: "asc" },
  })

  return services.map(normalizeServiceRow)
}

export async function getServiceById(
  id: string,
  client: ServiceDbClient = db,
): Promise<ServiceRecord> {
  const service = await client.flooringService.findUniqueOrThrow({
    where: { id },
    include: serviceInclude,
  })

  return normalizeServiceRow(service)
}

export async function getServiceDeleteState(
  id: string,
  client: ServiceDbClient = db,
): Promise<ServiceDeleteStateResult> {
  return client.flooringService.findUnique({
    where: { id },
    select: { id: true },
  })
}
