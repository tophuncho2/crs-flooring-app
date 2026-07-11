import { db } from "../client.js"
import type { Prisma, PrismaClient } from "../generated/prisma/client.js"
import { resolveNumberNeighbors } from "../shared/number-neighbors.js"
import { exactNumberIntEquals } from "../shared/exact-number-search.js"
import { combineAnd } from "../shared/where.js"
import {
  normalizeJobType,
  normalizeJobTypeOption,
  type JobType,
  type JobTypeListRow,
  type JobTypeOption,
  type JobTypeStats,
} from "@builders/domain"

type JobTypesDbClient = PrismaClient | Prisma.TransactionClient

// Adjacent job-type ids in the global JT-number order — powers the record-view
// shell stepper. Both null at the sequence edges (or when the row carries no
// generated int yet).
export type JobTypeNeighbors = {
  previousJobType: { id: string } | null
  nextJobType: { id: string } | null
}

export const NO_JOB_TYPE_NEIGHBORS: JobTypeNeighbors = {
  previousJobType: null,
  nextJobType: null,
}

export type JobTypeDetailRecord = JobType & JobTypeNeighbors

export type JobTypeListViewOptions = {
  search?: string
  jobTypeNumber?: string
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
  const clauses: Prisma.FlooringJobTypeWhereInput[] = []
  if (options.search) {
    clauses.push({ name: { contains: options.search, mode: "insensitive" } })
  }
  // JT-number bar: EXACT match on the generated int (btree), mirroring the
  // warehouse store-# bar. Strip non-digits so "7" or "JT-7" both resolve to 7;
  // a non-numeric query hits the -1 sentinel (the sequence is always positive)
  // so it matches nothing.
  const jobTypeNumber = options.jobTypeNumber?.trim()
  if (jobTypeNumber) {
    clauses.push({ jobTypeNumberInt: exactNumberIntEquals(jobTypeNumber) })
  }
  const where = combineAnd(clauses)

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

/**
 * Resolve the job-type rows immediately before/after the given numeric sort key
 * in the global JT-number order (`jobTypeNumberInt`). Powers the record-view
 * shell stepper — deliberately global (no scoping), two single-row lookups on
 * the `jobTypeNumberInt` index. Both null when the key is null (no generated
 * value yet) or the row sits at the sequence edge.
 */
async function getJobTypeNeighbors(
  jobTypeNumberInt: number | null,
  client: JobTypesDbClient = db,
): Promise<JobTypeNeighbors> {
  const { previous, next } = await resolveNumberNeighbors(
    "jobTypeNumberInt",
    jobTypeNumberInt,
    (q) => client.flooringJobType.findFirst({ ...q, select: { id: true } }),
  )

  return {
    previousJobType: previous ? { id: previous.id } : null,
    nextJobType: next ? { id: next.id } : null,
  }
}

export async function getJobTypeDetailById(
  id: string,
  options: { withNeighbors?: boolean } = {},
  client: JobTypesDbClient = db,
): Promise<JobTypeDetailRecord | null> {
  const row = await client.flooringJobType.findUnique({ where: { id } })
  if (!row) return null
  const neighbors =
    options.withNeighbors === false
      ? NO_JOB_TYPE_NEIGHBORS
      : await getJobTypeNeighbors(row.jobTypeNumberInt, client)
  return { ...normalizeJobType(row), ...neighbors }
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
