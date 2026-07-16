import { db } from "../client.js"
import type { Prisma, PrismaClient } from "../generated/prisma/client.js"
import { resolveNumberNeighbors } from "../shared/number-neighbors.js"
import { exactNumberIntEquals } from "../shared/exact-number-search.js"
import { sliceHasMore } from "../shared/paginate.js"
import { combineAnd } from "../shared/where.js"
import {
  normalizeWorkOrderDocumentType,
  normalizeWorkOrderDocumentTypeOption,
  type WorkOrderDocumentType,
  type WorkOrderDocumentTypeListRow,
  type WorkOrderDocumentTypeOption,
} from "@builders/domain"

type WorkOrderDocumentTypesDbClient = PrismaClient | Prisma.TransactionClient

// Adjacent doc-type ids in the global ROW-number order — powers the record-view
// shell stepper. Both null at the sequence edges (or when the row carries no
// generated int yet).
export type WorkOrderDocumentTypeNeighbors = {
  previousWorkOrderDocumentType: { id: string } | null
  nextWorkOrderDocumentType: { id: string } | null
}

export const NO_WORK_ORDER_DOCUMENT_TYPE_NEIGHBORS: WorkOrderDocumentTypeNeighbors = {
  previousWorkOrderDocumentType: null,
  nextWorkOrderDocumentType: null,
}

export type WorkOrderDocumentTypeDetailRecord = WorkOrderDocumentType &
  WorkOrderDocumentTypeNeighbors

export type WorkOrderDocumentTypeListViewOptions = {
  search?: string
  workOrderDocumentTypeNumber?: string
  skip: number
  take: number
}

export type WorkOrderDocumentTypeListViewResult = {
  rows: WorkOrderDocumentTypeListRow[]
  total: number
}

export async function listWorkOrderDocumentTypesForListView(
  options: WorkOrderDocumentTypeListViewOptions,
  client: WorkOrderDocumentTypesDbClient = db,
): Promise<WorkOrderDocumentTypeListViewResult> {
  const clauses: Prisma.FlooringWorkOrderDocumentTypeWhereInput[] = []
  if (options.search) {
    clauses.push({ name: { contains: options.search, mode: "insensitive" } })
  }
  // ROW-number bar: EXACT match on the generated int (btree). Strip non-digits so
  // "7" or "ROW-7" both resolve to 7; a non-numeric query hits the -1 sentinel.
  const workOrderDocumentTypeNumber = options.workOrderDocumentTypeNumber?.trim()
  if (workOrderDocumentTypeNumber) {
    clauses.push({
      workOrderDocumentTypeNumberInt: exactNumberIntEquals(workOrderDocumentTypeNumber),
    })
  }
  const where = combineAnd(clauses)

  const [total, rows] = await Promise.all([
    client.flooringWorkOrderDocumentType.count({ where }),
    client.flooringWorkOrderDocumentType.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: options.skip,
      take: options.take,
    }),
  ])

  return {
    total,
    rows: rows.map(normalizeWorkOrderDocumentType),
  }
}

export async function getWorkOrderDocumentTypeById(
  id: string,
  client: WorkOrderDocumentTypesDbClient = db,
): Promise<WorkOrderDocumentType> {
  const documentType = await client.flooringWorkOrderDocumentType.findUniqueOrThrow({
    where: { id },
  })
  return normalizeWorkOrderDocumentType(documentType)
}

/**
 * Resolve the doc-type rows immediately before/after the given numeric sort key
 * in the global ROW-number order (`workOrderDocumentTypeNumberInt`). Powers the
 * record-view shell stepper — global (no scoping), two single-row lookups.
 */
async function getWorkOrderDocumentTypeNeighbors(
  workOrderDocumentTypeNumberInt: number | null,
  client: WorkOrderDocumentTypesDbClient = db,
): Promise<WorkOrderDocumentTypeNeighbors> {
  const { previous, next } = await resolveNumberNeighbors(
    "workOrderDocumentTypeNumberInt",
    workOrderDocumentTypeNumberInt,
    (q) => client.flooringWorkOrderDocumentType.findFirst({ ...q, select: { id: true } }),
  )

  return {
    previousWorkOrderDocumentType: previous ? { id: previous.id } : null,
    nextWorkOrderDocumentType: next ? { id: next.id } : null,
  }
}

export async function getWorkOrderDocumentTypeDetailById(
  id: string,
  options: { withNeighbors?: boolean } = {},
  client: WorkOrderDocumentTypesDbClient = db,
): Promise<WorkOrderDocumentTypeDetailRecord | null> {
  const row = await client.flooringWorkOrderDocumentType.findUnique({ where: { id } })
  if (!row) return null
  const neighbors =
    options.withNeighbors === false
      ? NO_WORK_ORDER_DOCUMENT_TYPE_NEIGHBORS
      : await getWorkOrderDocumentTypeNeighbors(row.workOrderDocumentTypeNumberInt, client)
  return { ...normalizeWorkOrderDocumentType(row), ...neighbors }
}

/**
 * All doc types as slim {id,name,color,printConfig} options in ROW-number order —
 * the shape the print configurator's doc-type selector renders and seeds its
 * checkboxes from. No pagination: the doc-type set is small and fully loaded.
 */
export async function listWorkOrderDocumentTypeOptions(
  client: WorkOrderDocumentTypesDbClient = db,
): Promise<WorkOrderDocumentTypeOption[]> {
  const rows = await client.flooringWorkOrderDocumentType.findMany({
    orderBy: [{ workOrderDocumentTypeNumberInt: "asc" }, { id: "asc" }],
    select: { id: true, name: true, color: true, printConfig: true },
  })
  return rows.map(normalizeWorkOrderDocumentTypeOption)
}

export type WorkOrderDocumentTypeOptionsSearchArgs = {
  search?: string
  skip?: number
  take: number
}

export type WorkOrderDocumentTypeOptionsSearchResult = {
  items: WorkOrderDocumentTypeOption[]
  hasMore: boolean
}

// Paginated doc-type search for the array picker. ILIKE on `name`, take+1 to
// detect a next page.
export async function searchWorkOrderDocumentTypeOptions(
  args: WorkOrderDocumentTypeOptionsSearchArgs,
  client: WorkOrderDocumentTypesDbClient = db,
): Promise<WorkOrderDocumentTypeOptionsSearchResult> {
  const where = args.search
    ? { name: { contains: args.search, mode: "insensitive" as const } }
    : undefined

  const rows = await client.flooringWorkOrderDocumentType.findMany({
    where,
    orderBy: [{ name: "asc" }, { id: "asc" }],
    skip: args.skip ?? 0,
    take: args.take + 1,
    select: { id: true, name: true, color: true, printConfig: true },
  })

  const { page, hasMore } = sliceHasMore(rows, args.take)
  return { items: page.map(normalizeWorkOrderDocumentTypeOption), hasMore }
}
