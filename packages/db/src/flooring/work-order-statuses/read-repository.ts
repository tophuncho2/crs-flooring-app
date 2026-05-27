import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import {
  normalizeWorkOrderStatusOption,
  type WorkOrderStatusOption,
} from "@builders/domain"

type WorkOrderStatusesDbClient = PrismaClient | Prisma.TransactionClient

export type WorkOrderStatusOptionsSearchArgs = {
  search?: string
  take: number
}

export async function searchWorkOrderStatusOptions(
  args: WorkOrderStatusOptionsSearchArgs,
  client: WorkOrderStatusesDbClient = db,
): Promise<WorkOrderStatusOption[]> {
  const where = args.search
    ? { name: { contains: args.search, mode: "insensitive" as const } }
    : undefined

  const statuses = await client.flooringWorkOrderStatus.findMany({
    where,
    orderBy: { name: "asc" },
    take: args.take,
    select: { id: true, name: true },
  })
  return statuses.map(normalizeWorkOrderStatusOption)
}

/**
 * Resolves a status id from its stable slug. Used by the create / sync
 * use cases to default a new work order to the "none" status.
 */
export async function getWorkOrderStatusIdBySlug(
  slug: string,
  client: WorkOrderStatusesDbClient = db,
): Promise<string | null> {
  const status = await client.flooringWorkOrderStatus.findUnique({
    where: { slug },
    select: { id: true },
  })
  return status?.id ?? null
}
