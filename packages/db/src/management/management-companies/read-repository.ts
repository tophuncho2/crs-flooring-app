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

export type ManagementCompanyListViewOptions = {
  search?: string
  skip: number
  take: number
}

export type ManagementCompanyListViewResult = {
  rows: ManagementCompanyListRow[]
  total: number
}

function buildListViewWhere(
  search: string | undefined,
): Prisma.FlooringManagementCompanyWhereInput | undefined {
  if (!search) return undefined
  return { name: { contains: search, mode: "insensitive" } }
}

export async function listManagementCompaniesForListView(
  options: ManagementCompanyListViewOptions,
  client: ManagementCompaniesDbClient = db,
): Promise<ManagementCompanyListViewResult> {
  const where = buildListViewWhere(options.search)

  const [total, rows] = await Promise.all([
    client.flooringManagementCompany.count({ where }),
    client.flooringManagementCompany.findMany({
      where,
      orderBy: { name: "asc" },
      skip: options.skip,
      take: options.take,
      select: managementCompanyListSelect,
    }),
  ])

  return {
    total,
    rows: rows.map(normalizeManagementCompanyListRow),
  }
}

export type ManagementCompanyOptionsSearchArgs = {
  search?: string
  take: number
}

export async function searchManagementCompanyOptions(
  args: ManagementCompanyOptionsSearchArgs,
  client: ManagementCompaniesDbClient = db,
): Promise<ManagementCompanyOption[]> {
  const where = args.search
    ? { name: { contains: args.search, mode: "insensitive" as const } }
    : undefined

  const companies = await client.flooringManagementCompany.findMany({
    where,
    orderBy: { name: "asc" },
    take: args.take,
    select: { id: true, name: true },
  })

  return companies.map(normalizeManagementCompanyOption)
}
