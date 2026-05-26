import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import {
  normalizeTemplate,
  normalizeTemplateListRow,
  normalizeTemplateMaterialItem,
  normalizeTemplateOption,
  normalizeTemplatePreviewHeader,
  type TemplateDetail,
  type TemplateListRow,
  type TemplateMaterialItemRow,
  type TemplateOption,
  type TemplatePreviewHeader,
  type TemplatePreviewMaterialItemPage,
} from "@builders/domain"

type TemplatesDbClient = PrismaClient | Prisma.TransactionClient

/**
 * Concrete filter map for the templates list view. Both fields are
 * multi-value arrays so the engine's URL wire format (multiple values per
 * filter key) maps cleanly onto Prisma `IN (...)` clauses; the chip UI
 * single-selects but the data layer is array-shaped throughout.
 */
export type TemplatesListFilterMap = {
  managementCompanyId?: ReadonlyArray<string>
  propertyId?: ReadonlyArray<string>
}

export type TemplatesListArgs = {
  searchQuery?: string
  filters?: TemplatesListFilterMap
  pagination?: { skip: number; take: number }
}

const templateListSelect = {
  id: true,
  templateNumber: true,
  unitType: true,
  description: true,
  propertyId: true,
  property: { select: { name: true } },
  managementCompanyId: true,
  managementCompany: { select: { id: true, name: true } },
  jobTypeId: true,
  jobType: { select: { id: true, name: true } },
  warehouseId: true,
  warehouse: { select: { name: true } },
  _count: { select: { items: true } },
  createdAt: true,
  updatedAt: true,
} as const

const templateDetailSelect = {
  ...templateListSelect,
  internalNotes: true,
  installerInstructions: true,
  property: {
    select: {
      name: true,
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
      product: { select: { name: true } },
      quantity: true,
      sendUnitName: true,
      sendUnitAbbrev: true,
      notes: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const

/**
 * List-view search mirrors the picker (`searchTemplateOptions`): OR-ILIKE
 * across unitType and description. Filters AND together via exact `IN (...)`
 * matches on the direct columns of `FlooringTemplate`.
 */
function buildTemplatesWhere(
  searchQuery: string | undefined,
  filters: TemplatesListFilterMap | undefined,
): Prisma.FlooringTemplateWhereInput | undefined {
  const clauses: Prisma.FlooringTemplateWhereInput[] = []

  const trimmed = searchQuery?.trim() ?? ""
  if (trimmed.length > 0) {
    clauses.push({
      OR: [
        { unitType: { contains: trimmed, mode: "insensitive" } },
        { description: { contains: trimmed, mode: "insensitive" } },
      ],
    })
  }

  const managementCompanyIds = filters?.managementCompanyId
  if (managementCompanyIds && managementCompanyIds.length > 0) {
    clauses.push({ managementCompanyId: { in: [...managementCompanyIds] } })
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
    where: buildTemplatesWhere(args.searchQuery, args.filters),
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
  propertyId: string
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
  const clauses: Prisma.FlooringTemplateWhereInput[] = [{ propertyId: args.propertyId }]
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

const templatePreviewHeaderSelect = {
  id: true,
  unitType: true,
  description: true,
  installerInstructions: true,
  jobType: { select: { name: true } },
  warehouse: { select: { name: true } },
  property: {
    select: {
      streetAddress: true,
      city: true,
      state: true,
      postalCode: true,
      instructions: true,
    },
  },
} as const

export async function getTemplatePreviewHeaderById(
  id: string,
  client: TemplatesDbClient = db,
): Promise<TemplatePreviewHeader> {
  const template = await client.flooringTemplate.findUniqueOrThrow({
    where: { id },
    select: templatePreviewHeaderSelect,
  })

  return normalizeTemplatePreviewHeader(template)
}

const templatePreviewMaterialItemSelect = {
  id: true,
  productId: true,
  product: { select: { name: true } },
  quantity: true,
  sendUnitName: true,
  sendUnitAbbrev: true,
  notes: true,
  createdAt: true,
} as const

export type TemplatePreviewMaterialItemsPaginationArgs = {
  page: number
  pageSize: number
}

export async function listTemplatePreviewMaterialItemsById(
  templateId: string,
  pagination: TemplatePreviewMaterialItemsPaginationArgs,
  client: TemplatesDbClient = db,
): Promise<TemplatePreviewMaterialItemPage> {
  const [rawRows, total] = await Promise.all([
    client.flooringTemplateItem.findMany({
      where: { templateId },
      orderBy: { createdAt: "asc" },
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      select: templatePreviewMaterialItemSelect,
    }),
    client.flooringTemplateItem.count({ where: { templateId } }),
  ])

  const rows: TemplateMaterialItemRow[] = rawRows.map(normalizeTemplateMaterialItem)
  return {
    rows,
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
  }
}

export async function getTemplateById(
  id: string,
  client: TemplatesDbClient = db,
): Promise<TemplateDetail> {
  const template = await client.flooringTemplate.findUniqueOrThrow({
    where: { id },
    select: templateDetailSelect,
  })

  return normalizeTemplate(template)
}

export async function countTemplates(
  args: { searchQuery?: string; filters?: TemplatesListFilterMap },
  client: TemplatesDbClient = db,
): Promise<number> {
  return client.flooringTemplate.count({
    where: buildTemplatesWhere(args.searchQuery, args.filters),
  })
}
