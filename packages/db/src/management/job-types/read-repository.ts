import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import {
  normalizeJobType,
  normalizeJobTypeOption,
  type JobType,
  type JobTypeListRow,
  type JobTypeOption,
  type JobTypeStats,
} from "@builders/domain"

type JobTypesDbClient = PrismaClient | Prisma.TransactionClient

export async function listJobTypes(client: JobTypesDbClient = db): Promise<JobType[]> {
  const jobTypes = await client.flooringJobType.findMany({
    orderBy: { name: "asc" },
  })
  return jobTypes.map(normalizeJobType)
}

export type JobTypeListViewOptions = {
  search?: string
  skip: number
  take: number
}

export type JobTypeListViewResult = {
  rows: JobTypeListRow[]
  total: number
}

export async function listJobTypesForListView(
  options: JobTypeListViewOptions,
  client: JobTypesDbClient = db,
): Promise<JobTypeListViewResult> {
  const where: Prisma.FlooringJobTypeWhereInput | undefined = options.search
    ? { name: { contains: options.search, mode: "insensitive" } }
    : undefined

  const [total, rows] = await Promise.all([
    client.flooringJobType.count({ where }),
    client.flooringJobType.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: options.skip,
      take: options.take,
    }),
  ])

  return {
    total,
    rows: rows.map(normalizeJobType),
  }
}

export async function listJobTypeOptions(client: JobTypesDbClient = db): Promise<JobTypeOption[]> {
  const jobTypes = await client.flooringJobType.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })
  return jobTypes.map(normalizeJobTypeOption)
}

export type JobTypeOptionsSearchArgs = {
  search?: string
  take: number
}

export async function searchJobTypeOptions(
  args: JobTypeOptionsSearchArgs,
  client: JobTypesDbClient = db,
): Promise<JobTypeOption[]> {
  const where = args.search
    ? { name: { contains: args.search, mode: "insensitive" as const } }
    : undefined

  const jobTypes = await client.flooringJobType.findMany({
    where,
    orderBy: { name: "asc" },
    take: args.take,
    select: { id: true, name: true },
  })
  return jobTypes.map(normalizeJobTypeOption)
}

export async function getJobTypeById(
  id: string,
  client: JobTypesDbClient = db,
): Promise<JobType> {
  const jobType = await client.flooringJobType.findUniqueOrThrow({
    where: { id },
  })
  return normalizeJobType(jobType)
}

export async function countJobTypes(client: JobTypesDbClient = db): Promise<number> {
  return client.flooringJobType.count()
}

// Fetched separately from the row select so the list view never pays for the
// count subqueries — mirrors getWarehouseStats.
export async function getJobTypeStats(
  id: string,
  client: JobTypesDbClient = db,
): Promise<JobTypeStats | null> {
  const row = await client.flooringJobType.findUnique({
    where: { id },
    select: { _count: { select: { templates: true, workOrders: true } } },
  })
  if (!row) return null
  return {
    templatesCount: row._count.templates,
    workOrdersCount: row._count.workOrders,
  }
}
