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
 * Default sort is fixed: `templateNumber DESC` (newest TP-NNNNN first), with
 * `id DESC` as a stable tiebreak. The list-view toolbar no longer exposes a
 * sort toggle — this matches the imports / inventory list views.
 */
function buildTemplatesOrderBy(): Prisma.FlooringTemplateOrderByWithRelationInput[] {
  return [{ templateNumber: "desc" }, { id: "desc" }]
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

export async function listTemplateOptions(
  client: TemplatesDbClient = db,
): Promise<TemplateOption[]> {
  const templates = await client.flooringTemplate.findMany({
    orderBy: [{ unitType: "asc" }, { id: "asc" }],
    select: { id: true, templateNumber: true, unitType: true, description: true },
  })

  return templates.map(normalizeTemplateOption)
}

export type TemplateOptionsSearchArgs = {
  search?: string
  propertyId: string
  take: number
}

export async function searchTemplateOptions(
  args: TemplateOptionsSearchArgs,
  client: TemplatesDbClient = db,
): Promise<TemplateOption[]> {
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

  const templates = await client.flooringTemplate.findMany({
    where,
    orderBy: [{ unitType: "asc" }, { id: "asc" }],
    take: args.take,
    select: { id: true, templateNumber: true, unitType: true, description: true },
  })

  return templates.map(normalizeTemplateOption)
}

const templatePreviewHeaderSelect = {
  id: true,
  templateNumber: true,
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
