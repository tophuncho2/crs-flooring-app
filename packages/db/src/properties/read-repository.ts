import { db } from "../client.js"
import { Prisma } from "../generated/prisma/client.js"
import type { PrismaClient } from "../generated/prisma/client.js"
import {
  NO_PROPERTY_NEIGHBORS,
  normalizeProperty,
  normalizePropertyListRow,
  normalizePropertyOption,
  type PropertyDetailRecord,
  type PropertyListRow,
  type PropertyNeighbors,
  type PropertyOption,
} from "@builders/domain"
import { resolveNumberNeighbors } from "../shared/number-neighbors.js"
import { exactNumberIntEquals } from "../shared/exact-number-search.js"
import { sliceHasMore } from "../shared/paginate.js"
import { combineAnd } from "../shared/where.js"
import { buildPropertiesOrderBy } from "./order-by.js"

type PropertiesDbClient = PrismaClient | Prisma.TransactionClient

export type PropertiesListSortEntry = {
  /** Sort column — maps through `propertyFieldOrderBy`. */
  field: string
  direction: "asc" | "desc"
}

export type PropertiesListSort = {
  /** Ordered sort columns, highest priority first. An empty list falls straight
   * through to the `createdAt`+`id` tiebreaker. */
  entries: PropertiesListSortEntry[]
}

const propertyListSelect = {
  id: true,
  propertyNumber: true,
  createdAt: true,
  updatedAt: true,
  name: true,
  streetAddress: true,
  city: true,
  state: true,
  postalCode: true,
  phone: true,
  email: true,
  color: true,
  createdBy: true,
  updatedBy: true,
  entity: {
    select: { id: true, entity: true },
  },
  _count: {
    select: { templates: true },
  },
} as const

const propertyDetailSelect = {
  id: true,
  propertyNumber: true,
  // The numeric sort key (generated column) — read here so the detail loader can
  // resolve the adjacent rows for the record-view shell stepper.
  propertyNumberInt: true,
  createdAt: true,
  updatedAt: true,
  name: true,
  streetAddress: true,
  city: true,
  state: true,
  postalCode: true,
  phone: true,
  email: true,
  instructions: true,
  color: true,
  createdBy: true,
  updatedBy: true,
  entity: {
    select: { id: true, entity: true },
  },
} as const

const propertyOptionSelect = {
  id: true,
  updatedAt: true,
  name: true,
  streetAddress: true,
  city: true,
  state: true,
  postalCode: true,
  instructions: true,
  entityId: true,
  entity: {
    select: { entity: true },
  },
} as const

/**
 * Resolve the property rows immediately before/after the given numeric sort key
 * in the global property-number order (`propertyNumberInt`). Powers the
 * record-view shell stepper — deliberately global: no entity / state scoping, the
 * stepper walks the raw number line. Two single-row lookups on the
 * `propertyNumberInt` index. Both null when the key is null (no generated value
 * yet) or the row is at the sequence's edge.
 */
async function getPropertyNeighbors(
  propertyNumberInt: number | null,
  client: PropertiesDbClient = db,
): Promise<PropertyNeighbors> {
  const { previous, next } = await resolveNumberNeighbors(
    "propertyNumberInt",
    propertyNumberInt,
    (q) => client.property.findFirst({ ...q, select: { id: true } }),
  )

  return {
    previousProperty: previous ? { id: previous.id } : null,
    nextProperty: next ? { id: next.id } : null,
  }
}

/**
 * Read the full property detail. By default it also resolves the adjacent rows
 * for the record-view shell stepper; pass `{ withNeighbors: false }` on paths
 * that only read a snapshot (e.g. the update/delete conflict check) to skip the
 * two extra lookups.
 */
export async function getPropertyById(
  id: string,
  options: { withNeighbors?: boolean } = {},
  client: PropertiesDbClient = db,
): Promise<PropertyDetailRecord> {
  const property = await client.property.findUniqueOrThrow({
    where: { id },
    select: propertyDetailSelect,
  })

  const neighbors =
    options.withNeighbors === false
      ? NO_PROPERTY_NEIGHBORS
      : await getPropertyNeighbors(property.propertyNumberInt, client)

  return normalizeProperty(property, neighbors)
}

export async function countTemplatesByPropertyId(
  propertyId: string,
  client: PropertiesDbClient = db,
): Promise<number> {
  return client.template.count({ where: { propertyId } })
}

export type PropertyListViewOptions = {
  search?: string
  /** Ordered multi-column sort; falls through to the createdAt+id tiebreak. */
  sort?: PropertiesListSort
  filters?: {
    /**
     * Exact match on the generated `propertyNumberInt` (btree) — the toolbar's
     * PROP-# bar. Non-digits are stripped, so "5" and "PROP-5" both find PROP-5.
     */
    propNumber?: string
    entityId?: ReadonlyArray<string>
    state?: ReadonlyArray<string>
  }
  skip: number
  take: number
}

export type PropertyListViewResult = {
  rows: PropertyListRow[]
  total: number
}

function buildListViewWhere(
  options: Pick<PropertyListViewOptions, "search" | "filters">,
): Prisma.PropertyWhereInput | undefined {
  const clauses: Prisma.PropertyWhereInput[] = []

  if (options.search) {
    clauses.push({ name: { contains: options.search, mode: "insensitive" } })
  }

  // Exact identity search on the generated int — strip non-digits, parse, match.
  // No digits → -1 sentinel so a junk term returns no rows (never all rows).
  const propNumber = options.filters?.propNumber?.trim() ?? ""
  if (propNumber.length > 0) {
    clauses.push({ propertyNumberInt: exactNumberIntEquals(propNumber) })
  }

  const entityIds = options.filters?.entityId
  if (entityIds && entityIds.length > 0) {
    clauses.push({ entityId: { in: [...entityIds] } })
  }

  const stateCodes = options.filters?.state
  if (stateCodes && stateCodes.length > 0) {
    clauses.push({ state: { in: [...stateCodes] } })
  }

  return combineAnd(clauses)
}

export async function listPropertiesForListView(
  options: PropertyListViewOptions,
  client: PropertiesDbClient = db,
): Promise<PropertyListViewResult> {
  const where = buildListViewWhere(options)

  const [total, rows] = await Promise.all([
    client.property.count({ where }),
    client.property.findMany({
      where,
      orderBy: buildPropertiesOrderBy(options.sort),
      skip: options.skip,
      take: options.take,
      select: propertyListSelect,
    }),
  ])

  return {
    total,
    rows: rows.map(normalizePropertyListRow),
  }
}

export type PropertyOptionsSearchArgs = {
  search?: string
  entityId?: string
  skip?: number
  take: number
}

export type PropertyOptionsSearchResult = {
  items: PropertyOption[]
  hasMore: boolean
}

export async function searchPropertyOptions(
  args: PropertyOptionsSearchArgs,
  client: PropertiesDbClient = db,
): Promise<PropertyOptionsSearchResult> {
  const clauses: Prisma.PropertyWhereInput[] = []
  if (args.search) {
    clauses.push({ name: { contains: args.search, mode: "insensitive" } })
  }
  if (args.entityId) {
    clauses.push({ entityId: args.entityId })
  }
  const where = combineAnd(clauses)

  // Fetch take+1 to detect a next page without a separate count query.
  const rows = await client.property.findMany({
    where,
    orderBy: [{ name: "asc" }, { id: "asc" }],
    skip: args.skip ?? 0,
    take: args.take + 1,
    select: propertyOptionSelect,
  })

  const { page, hasMore } = sliceHasMore(rows, args.take)
  return { items: page.map(normalizePropertyOption), hasMore }
}
