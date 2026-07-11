import { db } from "../client.js"
import type { Prisma, PrismaClient } from "../generated/prisma/client.js"
import { resolveNumberNeighbors } from "../shared/number-neighbors.js"
import { exactNumberIntEquals } from "../shared/exact-number-search.js"
import { sliceHasMore } from "../shared/paginate.js"
import { combineAnd } from "../shared/where.js"
import {
  normalizeEntityType,
  normalizeEntityTypeOption,
  type EntityType,
  type EntityTypeListRow,
  type EntityTypeOption,
} from "@builders/domain"

type EntityTypesDbClient = PrismaClient | Prisma.TransactionClient

// Adjacent entity-type ids in the global ET-number order — powers the
// record-view shell stepper. Both null at the sequence edges (or when the row
// carries no generated int yet).
export type EntityTypeNeighbors = {
  previousEntityType: { id: string } | null
  nextEntityType: { id: string } | null
}

export const NO_ENTITY_TYPE_NEIGHBORS: EntityTypeNeighbors = {
  previousEntityType: null,
  nextEntityType: null,
}

export type EntityTypeDetailRecord = EntityType & EntityTypeNeighbors

export type EntityTypeListViewOptions = {
  search?: string
  entityTypeNumber?: string
  skip: number
  take: number
}

export type EntityTypeListViewResult = {
  rows: EntityTypeListRow[]
  total: number
}

export async function listEntityTypesForListView(
  options: EntityTypeListViewOptions,
  client: EntityTypesDbClient = db,
): Promise<EntityTypeListViewResult> {
  const clauses: Prisma.FlooringEntityTypeWhereInput[] = []
  if (options.search) {
    clauses.push({ type: { contains: options.search, mode: "insensitive" } })
  }
  // ET-number bar: EXACT match on the generated int (btree), mirroring the
  // job-type / warehouse number bars. Strip non-digits so "7" or "ET-7" both
  // resolve to 7; a non-numeric query hits the -1 sentinel (the sequence is
  // always positive) so it matches nothing.
  const entityTypeNumber = options.entityTypeNumber?.trim()
  if (entityTypeNumber) {
    clauses.push({ entityTypeNumberInt: exactNumberIntEquals(entityTypeNumber) })
  }
  const where = combineAnd(clauses)

  const [total, rows] = await Promise.all([
    client.flooringEntityType.count({ where }),
    client.flooringEntityType.findMany({
      where,
      orderBy: [{ type: "asc" }, { id: "asc" }],
      skip: options.skip,
      take: options.take,
    }),
  ])

  return {
    total,
    rows: rows.map(normalizeEntityType),
  }
}

export async function getEntityTypeById(
  id: string,
  client: EntityTypesDbClient = db,
): Promise<EntityType> {
  const entityType = await client.flooringEntityType.findUniqueOrThrow({
    where: { id },
  })
  return normalizeEntityType(entityType)
}

/**
 * Resolve the entity-type rows immediately before/after the given numeric sort
 * key in the global ET-number order (`entityTypeNumberInt`). Powers the
 * record-view shell stepper — deliberately global (no scoping), two single-row
 * lookups on the `entityTypeNumberInt` index. Both null when the key is null
 * (no generated value yet) or the row sits at the sequence edge.
 */
async function getEntityTypeNeighbors(
  entityTypeNumberInt: number | null,
  client: EntityTypesDbClient = db,
): Promise<EntityTypeNeighbors> {
  const { previous, next } = await resolveNumberNeighbors(
    "entityTypeNumberInt",
    entityTypeNumberInt,
    (q) => client.flooringEntityType.findFirst({ ...q, select: { id: true } }),
  )

  return {
    previousEntityType: previous ? { id: previous.id } : null,
    nextEntityType: next ? { id: next.id } : null,
  }
}

export async function getEntityTypeDetailById(
  id: string,
  options: { withNeighbors?: boolean } = {},
  client: EntityTypesDbClient = db,
): Promise<EntityTypeDetailRecord | null> {
  const row = await client.flooringEntityType.findUnique({ where: { id } })
  if (!row) return null
  const neighbors =
    options.withNeighbors === false
      ? NO_ENTITY_TYPE_NEIGHBORS
      : await getEntityTypeNeighbors(row.entityTypeNumberInt, client)
  return { ...normalizeEntityType(row), ...neighbors }
}

export type EntityTypeOptionsSearchArgs = {
  search?: string
  skip?: number
  take: number
}

export type EntityTypeOptionsSearchResult = {
  items: EntityTypeOption[]
  hasMore: boolean
}

// Paginated entity-type search for the array picker. Mirrors
// `searchEntityOptions`: ILIKE on `type`, take+1 to detect a next page.
export async function searchEntityTypeOptions(
  args: EntityTypeOptionsSearchArgs,
  client: EntityTypesDbClient = db,
): Promise<EntityTypeOptionsSearchResult> {
  const where = args.search
    ? { type: { contains: args.search, mode: "insensitive" as const } }
    : undefined

  const rows = await client.flooringEntityType.findMany({
    where,
    orderBy: [{ type: "asc" }, { id: "asc" }],
    skip: args.skip ?? 0,
    take: args.take + 1,
    select: { id: true, type: true, color: true },
  })

  const { page, hasMore } = sliceHasMore(rows, args.take)
  return { items: page.map(normalizeEntityTypeOption), hasMore }
}
