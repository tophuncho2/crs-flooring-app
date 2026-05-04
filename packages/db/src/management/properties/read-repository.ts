import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "@prisma/client"
import {
  normalizeProperty,
  normalizePropertyListRow,
  normalizePropertyOption,
  type PropertyDetailRecord,
  type PropertyListRow,
  type PropertyOption,
} from "@builders/domain"

type PropertiesDbClient = PrismaClient | Prisma.TransactionClient

const propertyListSelect = {
  id: true,
  updatedAt: true,
  name: true,
  streetAddress: true,
  city: true,
  state: true,
  postalCode: true,
  phone: true,
  email: true,
  managementCompany: {
    select: { id: true, name: true },
  },
  _count: {
    select: { templates: true },
  },
} as const

const propertyDetailSelect = {
  id: true,
  updatedAt: true,
  name: true,
  streetAddress: true,
  city: true,
  state: true,
  postalCode: true,
  phone: true,
  email: true,
  instructions: true,
  managementCompany: {
    select: { id: true, name: true },
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
} as const

export async function listPropertyOptions(
  client: PropertiesDbClient = db,
): Promise<PropertyOption[]> {
  const properties = await client.property.findMany({
    orderBy: { name: "asc" },
    select: propertyOptionSelect,
  })

  return properties.map(normalizePropertyOption)
}

export async function getPropertyById(
  id: string,
  client: PropertiesDbClient = db,
): Promise<PropertyDetailRecord> {
  const property = await client.property.findUniqueOrThrow({
    where: { id },
    select: propertyDetailSelect,
  })

  return normalizeProperty(property)
}

export async function countTemplatesByPropertyId(
  propertyId: string,
  client: PropertiesDbClient = db,
): Promise<number> {
  return client.flooringTemplate.count({ where: { propertyId } })
}

export type PropertyListViewOptions = {
  search?: string
  filters?: { managementCompanyId?: ReadonlyArray<string> }
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

  const managementCompanyIds = options.filters?.managementCompanyId
  if (managementCompanyIds && managementCompanyIds.length > 0) {
    clauses.push({ managementCompanyId: { in: [...managementCompanyIds] } })
  }

  if (clauses.length === 0) return undefined
  if (clauses.length === 1) return clauses[0]
  return { AND: clauses }
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
      orderBy: { name: "asc" },
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
  managementCompanyId?: string
  take: number
}

export async function searchPropertyOptions(
  args: PropertyOptionsSearchArgs,
  client: PropertiesDbClient = db,
): Promise<PropertyOption[]> {
  const clauses: Prisma.PropertyWhereInput[] = []
  if (args.search) {
    clauses.push({ name: { contains: args.search, mode: "insensitive" } })
  }
  if (args.managementCompanyId) {
    clauses.push({ managementCompanyId: args.managementCompanyId })
  }
  const where: Prisma.PropertyWhereInput | undefined =
    clauses.length === 0 ? undefined : clauses.length === 1 ? clauses[0] : { AND: clauses }

  const properties = await client.property.findMany({
    where,
    orderBy: { name: "asc" },
    take: args.take,
    select: propertyOptionSelect,
  })

  return properties.map(normalizePropertyOption)
}
