import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "@prisma/client"
import {
  normalizeManagementCompany,
  normalizeManagementCompanyListRow,
  normalizeManagementCompanyOption,
  type ManagementCompanyDetail,
  type ManagementCompanyListRow,
  type ManagementCompanyOption,
} from "@builders/domain"

type ManagementCompaniesDbClient = PrismaClient | Prisma.TransactionClient

export type ManagementCompaniesListSort = {
  direction: "asc" | "desc"
  groupByKeys: string[]
  isGroupingEnabled: boolean
}

export type ManagementCompaniesListArgs = {
  searchQuery?: string
  sort?: ManagementCompaniesListSort
  pagination?: { skip: number; take: number }
}

const managementCompanyListSelect = {
  id: true,
  updatedAt: true,
  name: true,
  streetAddress: true,
  city: true,
  state: true,
  postalCode: true,
  phone: true,
  email: true,
  _count: {
    select: { properties: true },
  },
  properties: {
    select: { id: true, name: true },
    orderBy: { name: "asc" as const },
    take: 3,
  },
} as const

const managementCompanyDetailSelect = {
  id: true,
  updatedAt: true,
  name: true,
  streetAddress: true,
  city: true,
  state: true,
  postalCode: true,
  phone: true,
  email: true,
  properties: {
    select: {
      id: true,
      name: true,
      streetAddress: true,
      city: true,
      state: true,
      postalCode: true,
      templates: {
        select: {
          id: true,
          unitType: true,
          warehouse: { select: { name: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: "desc" as const },
      },
    },
    orderBy: { name: "asc" as const },
  },
} as const

function buildManagementCompaniesWhere(
  searchQuery: string | undefined,
): Prisma.FlooringManagementCompanyWhereInput | undefined {
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
      {
        properties: {
          some: {
            OR: [
              { name: { contains: searchQuery, mode: "insensitive" } },
              { streetAddress: { contains: searchQuery, mode: "insensitive" } },
              { city: { contains: searchQuery, mode: "insensitive" } },
              { state: { contains: searchQuery, mode: "insensitive" } },
              { postalCode: { contains: searchQuery, mode: "insensitive" } },
            ],
          },
        },
      },
    ],
  }
}

function appendUniqueOrderBy<T>(values: T[], nextValue: T | null | undefined) {
  if (!nextValue) return
  const serialized = JSON.stringify(nextValue)
  if (values.some((value) => JSON.stringify(value) === serialized)) return
  values.push(nextValue)
}

function buildManagementCompaniesOrderBy(
  sort: ManagementCompaniesListSort | undefined,
): Prisma.FlooringManagementCompanyOrderByWithRelationInput[] {
  const direction: Prisma.SortOrder = sort?.direction ?? "asc"
  const orderBy: Prisma.FlooringManagementCompanyOrderByWithRelationInput[] = []
  const fieldMap: Record<string, Prisma.FlooringManagementCompanyOrderByWithRelationInput> = {
    company: { name: direction },
    street: { streetAddress: direction },
    city: { city: direction },
    state: { state: direction },
    zip: { postalCode: direction },
    phone: { phone: direction },
    email: { email: direction },
    fullAddress: { streetAddress: direction },
  }

  if (sort?.isGroupingEnabled) {
    for (const groupKey of sort.groupByKeys) {
      appendUniqueOrderBy(orderBy, fieldMap[groupKey])
    }
  }

  appendUniqueOrderBy(orderBy, { name: direction })

  return orderBy
}

export async function listManagementCompanies(
  args: ManagementCompaniesListArgs,
  client: ManagementCompaniesDbClient = db,
): Promise<ManagementCompanyListRow[]> {
  const companies = await client.flooringManagementCompany.findMany({
    where: buildManagementCompaniesWhere(args.searchQuery),
    orderBy: buildManagementCompaniesOrderBy(args.sort),
    select: managementCompanyListSelect,
    ...(args.pagination ?? {}),
  })

  return companies.map(normalizeManagementCompanyListRow)
}

export async function listManagementCompanyOptions(
  client: ManagementCompaniesDbClient = db,
): Promise<ManagementCompanyOption[]> {
  const companies = await client.flooringManagementCompany.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })

  return companies.map(normalizeManagementCompanyOption)
}

export async function getManagementCompanyById(
  id: string,
  client: ManagementCompaniesDbClient = db,
): Promise<ManagementCompanyDetail> {
  const company = await client.flooringManagementCompany.findUniqueOrThrow({
    where: { id },
    select: managementCompanyDetailSelect,
  })

  return normalizeManagementCompany(company)
}

export async function countManagementCompanies(
  args: { searchQuery?: string },
  client: ManagementCompaniesDbClient = db,
): Promise<number> {
  return client.flooringManagementCompany.count({
    where: buildManagementCompaniesWhere(args.searchQuery),
  })
}

export async function countPropertiesByManagementCompanyId(
  managementCompanyId: string,
  client: ManagementCompaniesDbClient = db,
): Promise<number> {
  return client.property.count({ where: { managementCompanyId } })
}
