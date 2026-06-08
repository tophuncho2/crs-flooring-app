import { db } from "../../client.js"
import { Prisma } from "../../generated/prisma/client.js"
import type { PrismaClient } from "../../generated/prisma/client.js"
import {
  normalizeManagementCompany,
  normalizeManagementCompanyListRow,
  normalizeManagementCompanyOption,
  type ManagementCompanyDetail,
  type ManagementCompanyListRow,
  type ManagementCompanyOption,
  type ManagementCompanyStateOption,
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
  _count: {
    select: { properties: true },
  },
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

export type ManagementCompanyListViewOptions = {
  search?: string
  filters?: { state?: ReadonlyArray<string> }
  skip: number
  take: number
}

export type ManagementCompanyListViewResult = {
  rows: ManagementCompanyListRow[]
  total: number
}

function buildListViewWhere(
  options: Pick<ManagementCompanyListViewOptions, "search" | "filters">,
): Prisma.FlooringManagementCompanyWhereInput | undefined {
  const clauses: Prisma.FlooringManagementCompanyWhereInput[] = []

  if (options.search) {
    clauses.push({ name: { contains: options.search, mode: "insensitive" } })
  }

  const stateCodes = options.filters?.state
  if (stateCodes && stateCodes.length > 0) {
    clauses.push({ state: { in: [...stateCodes] } })
  }

  if (clauses.length === 0) return undefined
  if (clauses.length === 1) return clauses[0]
  return { AND: clauses }
}

export async function listManagementCompaniesForListView(
  options: ManagementCompanyListViewOptions,
  client: ManagementCompaniesDbClient = db,
): Promise<ManagementCompanyListViewResult> {
  const where = buildListViewWhere(options)

  const [total, rows] = await Promise.all([
    client.flooringManagementCompany.count({ where }),
    client.flooringManagementCompany.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
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
  skip?: number
  take: number
}

export type ManagementCompanyOptionsSearchResult = {
  items: ManagementCompanyOption[]
  hasMore: boolean
}

export async function searchManagementCompanyOptions(
  args: ManagementCompanyOptionsSearchArgs,
  client: ManagementCompaniesDbClient = db,
): Promise<ManagementCompanyOptionsSearchResult> {
  const where = args.search
    ? { name: { contains: args.search, mode: "insensitive" as const } }
    : undefined

  // Fetch take+1 to detect a next page without a separate count query.
  const rows = await client.flooringManagementCompany.findMany({
    where,
    orderBy: [{ name: "asc" }, { id: "asc" }],
    skip: args.skip ?? 0,
    take: args.take + 1,
    select: { id: true, name: true },
  })

  const hasMore = rows.length > args.take
  const page = hasMore ? rows.slice(0, args.take) : rows
  return { items: page.map(normalizeManagementCompanyOption), hasMore }
}

export type ManagementCompanyStatesSearchArgs = {
  search?: string
  take: number
}

/**
 * Distinct state codes across all management companies. Excludes
 * NULL/whitespace-only values. Optional ILIKE substring on the search term.
 * Sorted ASC, deduped at the SQL layer.
 */
export async function searchManagementCompanyStates(
  args: ManagementCompanyStatesSearchArgs,
  client: ManagementCompaniesDbClient = db,
): Promise<ManagementCompanyStateOption[]> {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`"state" IS NOT NULL`,
    Prisma.sql`length(trim("state")) > 0`,
  ]
  const trimmed = args.search?.trim() ?? ""
  if (trimmed.length > 0) {
    conditions.push(Prisma.sql`"state" ILIKE ${`%${trimmed}%`}`)
  }
  const whereClause = Prisma.join(conditions, " AND ")

  const rows = await client.$queryRaw<{ state: string }[]>(Prisma.sql`
    SELECT DISTINCT "state"
    FROM "flooring_management_company"
    WHERE ${whereClause}
    ORDER BY "state" ASC
    LIMIT ${args.take}
  `)

  return rows.map((row) => ({ value: row.state }))
}
