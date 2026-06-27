import { db } from "../../client.js"
import { numberNeighborQueries } from "../../shared/number-neighbors.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import {
  normalizeTemplate,
  normalizeTemplateListRow,
  normalizeTemplateOption,
  type TemplateDetail,
  type TemplateListRow,
  type TemplateOption,
} from "@builders/domain"

type TemplatesDbClient = PrismaClient | Prisma.TransactionClient

/**
 * Concrete filter map for the templates list view. Both fields are
 * multi-value arrays so the engine's URL wire format (multiple values per
 * filter key) maps cleanly onto Prisma `IN (...)` clauses; the chip UI
 * single-selects but the data layer is array-shaped throughout.
 */
export type TemplatesListFilterMap = {
  entityId?: ReadonlyArray<string>
  propertyId?: ReadonlyArray<string>
  // Per-column identity search bars — each a free-text ILIKE against its own
  // column. Array-shaped (single-element) to ride the same engine URL wire
  // format as the entity/property chips; setting both narrows (AND).
  unitType?: ReadonlyArray<string>
  description?: ReadonlyArray<string>
}

export type TemplatesListArgs = {
  filters?: TemplatesListFilterMap
  pagination?: { skip: number; take: number }
}

const templateListSelect = {
  id: true,
  templateNumber: true,
  color: true,
  unitType: true,
  description: true,
  propertyId: true,
  property: {
    select: { name: true, entity: { select: { id: true, entity: true } } },
  },
  jobTypeId: true,
  jobType: { select: { id: true, name: true } },
  warehouseId: true,
  warehouse: { select: { name: true } },
  _count: { select: { items: true } },
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
} as const

const templateDetailSelect = {
  ...templateListSelect,
  // The numeric sort key (generated column) — read here so the detail loader can
  // resolve the adjacent rows for the record-view shell stepper.
  templateNumberInt: true,
  internalNotes: true,
  installerInstructions: true,
  property: {
    select: {
      name: true,
      entity: { select: { id: true, entity: true } },
      streetAddress: true,
      city: true,
      state: true,
      postalCode: true,
      instructions: true,
    },
  },
  items: {
    select: {
      id: true,
      productId: true,
      product: { select: { name: true, category: { select: { name: true } } } },
      quantity: true,
      sendUnitName: true,
      sendUnitAbbrev: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      createdBy: true,
      updatedBy: true,
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const

/**
 * List-view search: one independent ILIKE-substring clause per filled search
 * bar (Unit Type / Description), each backed by its own GIN trigram index.
 * Setting both narrows (AND). Note this diverges from the picker
 * (`searchTemplateOptions`), which keeps a single combined OR across the two
 * columns. Chip filters AND together via exact `IN (...)` matches — propertyId
 * on `FlooringTemplate` directly, entityId through the linked property
 * (templates no longer store their own entity).
 */
function buildTemplatesWhere(
  filters: TemplatesListFilterMap | undefined,
): Prisma.FlooringTemplateWhereInput | undefined {
  const clauses: Prisma.FlooringTemplateWhereInput[] = []

  const unitType = filters?.unitType?.[0]?.trim() ?? ""
  if (unitType.length > 0) {
    clauses.push({ unitType: { contains: unitType, mode: "insensitive" } })
  }

  const description = filters?.description?.[0]?.trim() ?? ""
  if (description.length > 0) {
    clauses.push({ description: { contains: description, mode: "insensitive" } })
  }

  const entityIds = filters?.entityId
  if (entityIds && entityIds.length > 0) {
    clauses.push({ property: { entityId: { in: [...entityIds] } } })
  }

  const propertyIds = filters?.propertyId
  if (propertyIds && propertyIds.length > 0) {
    clauses.push({ propertyId: { in: [...propertyIds] } })
  }

  if (clauses.length === 0) return undefined
  if (clauses.length === 1) return clauses[0]
  return { AND: clauses }
}

/**
 * Default sort is fixed: property name ASC → unitType ASC → createdAt ASC,
 * with `id ASC` as a stable tiebreak. Used for the templates list view AND
 * the picker options (`listTemplateOptions` / `searchTemplateOptions` mirror
 * the same chain modulo redundant keys). The list-view toolbar does not
 * expose a sort toggle — this ordering is the single source of truth.
 */
function buildTemplatesOrderBy(): Prisma.FlooringTemplateOrderByWithRelationInput[] {
  return [
    { property: { name: "asc" } },
    { unitType: "asc" },
    { createdAt: "asc" },
    { id: "asc" },
  ]
}

export async function listTemplates(
  args: TemplatesListArgs,
  client: TemplatesDbClient = db,
): Promise<TemplateListRow[]> {
  const templates = await client.flooringTemplate.findMany({
    where: buildTemplatesWhere(args.filters),
    orderBy: buildTemplatesOrderBy(),
    select: templateListSelect,
    ...(args.pagination ?? {}),
  })

  return templates.map(normalizeTemplateListRow)
}

// Picker/dropdown option projection. Carries jobType name + material-item
// count so every template dropdown can render the canonical card
// (unitType / jobType / description / "N items"). Mirrors the list select's
// jobType + _count shape.
const templateOptionSelect = {
  id: true,
  unitType: true,
  description: true,
  jobType: { select: { name: true } },
  _count: { select: { items: true } },
} as const

export async function listTemplateOptions(
  client: TemplatesDbClient = db,
): Promise<TemplateOption[]> {
  const templates = await client.flooringTemplate.findMany({
    orderBy: [
      { property: { name: "asc" } },
      { unitType: "asc" },
      { createdAt: "asc" },
      { id: "asc" },
    ],
    select: templateOptionSelect,
  })

  return templates.map(normalizeTemplateOption)
}

export type TemplateOptionsSearchArgs = {
  search?: string
  /** Scope to a single property. Optional — when absent the search is unscoped. */
  propertyId?: string
  /**
   * Scope to all properties under an entity. Only consulted when
   * `propertyId` is absent (a specific property already implies its entity).
   */
  entityId?: string
  skip?: number
  take: number
}

export type TemplateOptionsSearchResult = {
  items: TemplateOption[]
  hasMore: boolean
}

export async function searchTemplateOptions(
  args: TemplateOptionsSearchArgs,
  client: TemplatesDbClient = db,
): Promise<TemplateOptionsSearchResult> {
  const clauses: Prisma.FlooringTemplateWhereInput[] = []
  // Property scope wins; otherwise fall back to the entity scope via the
  // property relation. Neither set → unscoped (lists all templates, paginated).
  if (args.propertyId) {
    clauses.push({ propertyId: args.propertyId })
  } else if (args.entityId) {
    clauses.push({ property: { entityId: args.entityId } })
  }
  if (args.search) {
    clauses.push({
      OR: [
        { unitType: { contains: args.search, mode: "insensitive" } },
        { description: { contains: args.search, mode: "insensitive" } },
      ],
    })
  }
  const where: Prisma.FlooringTemplateWhereInput =
    clauses.length === 1 ? clauses[0] : { AND: clauses }

  // Fetch take+1 to detect a next page without a separate count query.
  const rows = await client.flooringTemplate.findMany({
    where,
    orderBy: [{ unitType: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    skip: args.skip ?? 0,
    take: args.take + 1,
    select: templateOptionSelect,
  })

  const hasMore = rows.length > args.take
  const page = hasMore ? rows.slice(0, args.take) : rows
  return { items: page.map(normalizeTemplateOption), hasMore }
}

type TemplateNeighbors = {
  previousTemplate: { id: string } | null
  nextTemplate: { id: string } | null
}

const NO_TEMPLATE_NEIGHBORS: TemplateNeighbors = {
  previousTemplate: null,
  nextTemplate: null,
}

/**
 * Resolve the template rows immediately before/after the given numeric sort key
 * in the global template-number order (`templateNumberInt`). Powers the
 * record-view shell stepper — deliberately global: no property / entity scoping, the
 * stepper walks the raw number line. Two single-row lookups on the
 * `templateNumberInt` index. Both null when the key is null (no generated value
 * yet) or the row is at the sequence's edge.
 */
async function getTemplateNeighbors(
  templateNumberInt: number | null,
  client: TemplatesDbClient = db,
): Promise<TemplateNeighbors> {
  if (templateNumberInt === null) return NO_TEMPLATE_NEIGHBORS

  const { previous: previousQuery, next: nextQuery } = numberNeighborQueries(
    "templateNumberInt",
    templateNumberInt,
  )
  const [previous, next] = await Promise.all([
    client.flooringTemplate.findFirst({
      ...previousQuery,
      select: { id: true },
    }),
    client.flooringTemplate.findFirst({
      ...nextQuery,
      select: { id: true },
    }),
  ])

  return {
    previousTemplate: previous ? { id: previous.id } : null,
    nextTemplate: next ? { id: next.id } : null,
  }
}

/**
 * Read the full template detail. By default it also resolves the adjacent rows
 * for the record-view shell stepper; pass `{ withNeighbors: false }` on paths
 * that only read a snapshot (e.g. the delete conflict check) to skip the two
 * extra lookups.
 */
export async function getTemplateById(
  id: string,
  options: { withNeighbors?: boolean } = {},
  client: TemplatesDbClient = db,
): Promise<TemplateDetail> {
  const template = await client.flooringTemplate.findUniqueOrThrow({
    where: { id },
    select: templateDetailSelect,
  })

  const neighbors =
    options.withNeighbors === false
      ? NO_TEMPLATE_NEIGHBORS
      : await getTemplateNeighbors(template.templateNumberInt, client)

  return normalizeTemplate(template, neighbors)
}

export async function countTemplates(
  args: { filters?: TemplatesListFilterMap },
  client: TemplatesDbClient = db,
): Promise<number> {
  return client.flooringTemplate.count({
    where: buildTemplatesWhere(args.filters),
  })
}
