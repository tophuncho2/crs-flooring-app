import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "@prisma/client"
import {
  normalizeTemplate,
  normalizeTemplateListRow,
  normalizeTemplateOption,
  type TemplateDetail,
  type TemplateListRow,
  type TemplateOption,
} from "@builders/domain"

type TemplatesDbClient = PrismaClient | Prisma.TransactionClient

export type TemplatesListSort = {
  direction: "asc" | "desc"
  groupByKeys: string[]
  isGroupingEnabled: boolean
}

export type TemplatesListArgs = {
  searchQuery?: string
  sort?: TemplatesListSort
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
  instructions: true,
  templateNotes: true,
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

function buildTemplatesWhere(
  searchQuery: string | undefined,
): Prisma.FlooringTemplateWhereInput | undefined {
  if (!searchQuery) return undefined

  return {
    OR: [
      { templateNumber: { contains: searchQuery, mode: "insensitive" } },
      { unitType: { contains: searchQuery, mode: "insensitive" } },
      { description: { contains: searchQuery, mode: "insensitive" } },
      { property: { name: { contains: searchQuery, mode: "insensitive" } } },
      { managementCompany: { name: { contains: searchQuery, mode: "insensitive" } } },
      { jobType: { name: { contains: searchQuery, mode: "insensitive" } } },
      { warehouse: { name: { contains: searchQuery, mode: "insensitive" } } },
    ],
  }
}

function appendUniqueOrderBy<T>(values: T[], nextValue: T | null | undefined) {
  if (!nextValue) return
  const serialized = JSON.stringify(nextValue)
  if (values.some((value) => JSON.stringify(value) === serialized)) return
  values.push(nextValue)
}

function buildTemplatesOrderBy(
  sort: TemplatesListSort | undefined,
): Prisma.FlooringTemplateOrderByWithRelationInput[] {
  const direction: Prisma.SortOrder = sort?.direction ?? "asc"
  const orderBy: Prisma.FlooringTemplateOrderByWithRelationInput[] = []
  const fieldMap: Record<string, Prisma.FlooringTemplateOrderByWithRelationInput> = {
    templateNumber: { templateNumber: direction },
    unitType: { unitType: direction },
    property: { property: { name: direction } },
    managementCompany: { managementCompany: { name: direction } },
    jobType: { jobType: { name: direction } },
    warehouse: { warehouse: { name: direction } },
  }

  if (sort?.isGroupingEnabled) {
    for (const groupKey of sort.groupByKeys) {
      appendUniqueOrderBy(orderBy, fieldMap[groupKey])
    }
  }

  appendUniqueOrderBy(orderBy, { templateNumber: direction })

  return orderBy
}

export async function listTemplates(
  args: TemplatesListArgs,
  client: TemplatesDbClient = db,
): Promise<TemplateListRow[]> {
  const templates = await client.flooringTemplate.findMany({
    where: buildTemplatesWhere(args.searchQuery),
    orderBy: buildTemplatesOrderBy(args.sort),
    select: templateListSelect,
    ...(args.pagination ?? {}),
  })

  return templates.map(normalizeTemplateListRow)
}

export async function listTemplateOptions(
  client: TemplatesDbClient = db,
): Promise<TemplateOption[]> {
  const templates = await client.flooringTemplate.findMany({
    orderBy: { templateNumber: "asc" },
    select: { id: true, templateNumber: true, unitType: true },
  })

  return templates.map(normalizeTemplateOption)
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
  args: { searchQuery?: string },
  client: TemplatesDbClient = db,
): Promise<number> {
  return client.flooringTemplate.count({
    where: buildTemplatesWhere(args.searchQuery),
  })
}
