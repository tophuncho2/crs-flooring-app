import { db } from "../../client.js"
import { Prisma } from "../../generated/prisma/client.js"
import type { PrismaClient } from "../../generated/prisma/client.js"
import {
  normalizeEntity,
  normalizeEntityListRow,
  normalizeEntityOption,
  type EntityDetail,
  type EntityListRow,
  type EntityOption,
} from "@builders/domain"

type EntitiesDbClient = PrismaClient | Prisma.TransactionClient

// Linked entity-types, slimmed to what the chip/picker render. Ordered by type
// name so chips render in a stable, alphabetical order. Exported so the write
// repository reuses the exact same shape (single source of truth).
export const entityTypesSelect = {
  select: {
    entityType: { select: { id: true, type: true, color: true } },
  },
  orderBy: { entityType: { type: "asc" } },
} as const satisfies Prisma.Entity$entityTypesArgs

const entityListSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  entity: true,
  streetAddress: true,
  city: true,
  state: true,
  postalCode: true,
  phone: true,
  email: true,
  _count: {
    select: { properties: true },
  },
  entityTypes: entityTypesSelect,
} as const

const entityDetailSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  entity: true,
  streetAddress: true,
  city: true,
  state: true,
  postalCode: true,
  phone: true,
  email: true,
  _count: {
    select: { properties: true },
  },
  entityTypes: entityTypesSelect,
} as const

// Picker option select — carries the contact/address columns so a freshly
// picked entity can hydrate its Phone/Email/Address cells without a detail
// refetch (mirrors `propertyOptionSelect`).
const entityOptionSelect = {
  id: true,
  entity: true,
  streetAddress: true,
  city: true,
  state: true,
  postalCode: true,
  phone: true,
  email: true,
  entityTypes: entityTypesSelect,
} as const

export async function listEntityOptions(
  client: EntitiesDbClient = db,
): Promise<EntityOption[]> {
  const entities = await client.entity.findMany({
    orderBy: { entity: "asc" },
    select: entityOptionSelect,
  })

  return entities.map(normalizeEntityOption)
}

export async function getEntityById(
  id: string,
  client: EntitiesDbClient = db,
): Promise<EntityDetail> {
  const entity = await client.entity.findUniqueOrThrow({
    where: { id },
    select: entityDetailSelect,
  })

  return normalizeEntity(entity)
}

export type EntityListViewOptions = {
  search?: string
  filters?: {
    state?: ReadonlyArray<string>
    entityTypeIds?: ReadonlyArray<string>
  }
  skip: number
  take: number
}

export type EntityListViewResult = {
  rows: EntityListRow[]
  total: number
}

function buildListViewWhere(
  options: Pick<EntityListViewOptions, "search" | "filters">,
): Prisma.EntityWhereInput | undefined {
  const clauses: Prisma.EntityWhereInput[] = []

  if (options.search) {
    clauses.push({ entity: { contains: options.search, mode: "insensitive" } })
  }

  const stateCodes = options.filters?.state
  if (stateCodes && stateCodes.length > 0) {
    clauses.push({ state: { in: [...stateCodes] } })
  }

  // Entity-type filter: an entity holds an array of types (m2m), so match is
  // `some linked type ∈ selection` (contains/OR), never equality. The EXISTS
  // is served by the join's @@unique([entityId, entityTypeId]) / @@index([entityTypeId]).
  const entityTypeIds = options.filters?.entityTypeIds
  if (entityTypeIds && entityTypeIds.length > 0) {
    clauses.push({ entityTypes: { some: { entityTypeId: { in: [...entityTypeIds] } } } })
  }

  if (clauses.length === 0) return undefined
  if (clauses.length === 1) return clauses[0]
  return { AND: clauses }
}

export async function listEntitiesForListView(
  options: EntityListViewOptions,
  client: EntitiesDbClient = db,
): Promise<EntityListViewResult> {
  const where = buildListViewWhere(options)

  const [total, rows] = await Promise.all([
    client.entity.count({ where }),
    client.entity.findMany({
      where,
      orderBy: [{ entity: "asc" }, { id: "asc" }],
      skip: options.skip,
      take: options.take,
      select: entityListSelect,
    }),
  ])

  return {
    total,
    rows: rows.map(normalizeEntityListRow),
  }
}

export type EntityOptionsSearchArgs = {
  search?: string
  /**
   * Optional entity-type narrowing — keep only entities carrying at least one
   * of these types (m2m `some/in`, same shape as the list-view filter). Powers
   * the combo picker's type side.
   */
  typeIds?: ReadonlyArray<string>
  skip?: number
  take: number
}

export type EntityOptionsSearchResult = {
  items: EntityOption[]
  hasMore: boolean
}

export async function searchEntityOptions(
  args: EntityOptionsSearchArgs,
  client: EntitiesDbClient = db,
): Promise<EntityOptionsSearchResult> {
  const optionClauses: Prisma.EntityWhereInput[] = []
  if (args.search) {
    optionClauses.push({ entity: { contains: args.search, mode: "insensitive" } })
  }
  if (args.typeIds && args.typeIds.length > 0) {
    optionClauses.push({
      entityTypes: { some: { entityTypeId: { in: [...args.typeIds] } } },
    })
  }
  const where =
    optionClauses.length === 0
      ? undefined
      : optionClauses.length === 1
        ? optionClauses[0]
        : { AND: optionClauses }

  // Fetch take+1 to detect a next page without a separate count query.
  const rows = await client.entity.findMany({
    where,
    orderBy: [{ entity: "asc" }, { id: "asc" }],
    skip: args.skip ?? 0,
    take: args.take + 1,
    select: entityOptionSelect,
  })

  const hasMore = rows.length > args.take
  const page = hasMore ? rows.slice(0, args.take) : rows
  return { items: page.map(normalizeEntityOption), hasMore }
}
