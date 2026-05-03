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
