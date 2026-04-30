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

export type PropertiesListSort = {
  direction: "asc" | "desc"
  groupByKeys: string[]
  isGroupingEnabled: boolean
}

export type PropertiesListArgs = {
  searchQuery?: string
  sort?: PropertiesListSort
  pagination?: { skip: number; take: number }
}

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
  templates: {
    select: { id: true, unitType: true },
    orderBy: { createdAt: "desc" as const },
    take: 3,
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

function buildPropertiesWhere(
  searchQuery: string | undefined,
): Prisma.PropertyWhereInput | undefined {
  if (!searchQuery) return undefined

  return {
    OR: [
      { name: { contains: searchQuery, mode: "insensitive" } },
      { streetAddress: { contains: searchQuery, mode: "insensitive" } },
      { city: { contains: searchQuery, mode: "insensitive" } },
      { state: { contains: searchQuery, mode: "insensitive" } },
      { postalCode: { contains: searchQuery, mode: "insensitive" } },
      { phone: { contains: searchQuery, mode: "insensitive" } },
      { email: { contains: searchQuery, mode: "insensitive" } },
      { managementCompany: { name: { contains: searchQuery, mode: "insensitive" } } },
    ],
  }
}

function appendUniqueOrderBy<T>(values: T[], nextValue: T | null | undefined) {
  if (!nextValue) return
  const serialized = JSON.stringify(nextValue)
  if (values.some((value) => JSON.stringify(value) === serialized)) return
  values.push(nextValue)
}

function buildPropertiesOrderBy(
  sort: PropertiesListSort | undefined,
): Prisma.PropertyOrderByWithRelationInput[] {
  const direction: Prisma.SortOrder = sort?.direction ?? "asc"
  const orderBy: Prisma.PropertyOrderByWithRelationInput[] = []
  const fieldMap: Record<string, Prisma.PropertyOrderByWithRelationInput> = {
    property: { name: direction },
    street: { streetAddress: direction },
    city: { city: direction },
    state: { state: direction },
    zip: { postalCode: direction },
    phone: { phone: direction },
    email: { email: direction },
    fullAddress: { streetAddress: direction },
    managementCompany: { managementCompany: { name: direction } },
  }

  if (sort?.isGroupingEnabled) {
    for (const groupKey of sort.groupByKeys) {
      appendUniqueOrderBy(orderBy, fieldMap[groupKey])
    }
  }

  appendUniqueOrderBy(orderBy, { name: direction })

  return orderBy
}

export async function listProperties(
  args: PropertiesListArgs,
  client: PropertiesDbClient = db,
): Promise<PropertyListRow[]> {
  const properties = await client.property.findMany({
    where: buildPropertiesWhere(args.searchQuery),
    orderBy: buildPropertiesOrderBy(args.sort),
    select: propertyListSelect,
    ...(args.pagination ?? {}),
  })

  return properties.map(normalizePropertyListRow)
}

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

export async function countProperties(
  args: { searchQuery?: string },
  client: PropertiesDbClient = db,
): Promise<number> {
  return client.property.count({
    where: buildPropertiesWhere(args.searchQuery),
  })
}

export async function countTemplatesByPropertyId(
  propertyId: string,
  client: PropertiesDbClient = db,
): Promise<number> {
  return client.flooringTemplate.count({ where: { propertyId } })
}
