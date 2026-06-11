import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import { normalizePhoneNumber, type ManufacturerOption, type ManufacturerStats } from "@builders/domain"

type ManufacturerDbClient = PrismaClient | Prisma.TransactionClient

// --- Types ---

export type ManufacturerRecord = {
  id: string
  companyName: string
  agentName: string
  website: string
  phone: string
  email: string
  productsCount: number
  createdAt: string
  updatedAt: string
}

// --- Normalizers ---

export function normalizeManufacturer(manufacturer: {
  id: string
  companyName: string
  agentName: string | null
  website: string | null
  phone: string | null
  email: string | null
  createdAt: Date
  updatedAt: Date
  _count?: { products: number }
}): ManufacturerRecord {
  return {
    id: manufacturer.id,
    companyName: manufacturer.companyName,
    agentName: manufacturer.agentName ?? "",
    website: manufacturer.website ?? "",
    phone: normalizePhoneNumber(manufacturer.phone ?? ""),
    email: manufacturer.email ?? "",
    productsCount: manufacturer._count?.products ?? 0,
    createdAt: manufacturer.createdAt.toISOString(),
    updatedAt: manufacturer.updatedAt.toISOString(),
  }
}

// --- Include helpers ---

const manufacturerInclude = {
  _count: { select: { products: true } },
} as const

// --- Read functions ---

export async function listManufacturers(
  client: ManufacturerDbClient = db,
): Promise<ManufacturerRecord[]> {
  const manufacturers = await client.flooringManufacturer.findMany({
    include: manufacturerInclude,
    orderBy: { companyName: "asc" },
  })

  return manufacturers.map(normalizeManufacturer)
}

export async function getManufacturerById(
  id: string,
  client: ManufacturerDbClient = db,
): Promise<ManufacturerRecord> {
  const manufacturer = await client.flooringManufacturer.findUniqueOrThrow({
    where: { id },
    include: manufacturerInclude,
  })

  return normalizeManufacturer(manufacturer)
}

// Read-only totals for the manufacturer record-view "Statistics" section. Kept
// separate from `manufacturerInclude` so the list view doesn't pay for the
// imports count subquery per row.
export async function getManufacturerStats(
  id: string,
  client: ManufacturerDbClient = db,
): Promise<ManufacturerStats | null> {
  const row = await client.flooringManufacturer.findUnique({
    where: { id },
    select: { _count: { select: { products: true, imports: true } } },
  })
  if (!row) return null
  return { productsCount: row._count.products, importsCount: row._count.imports }
}

export async function manufacturerCompanyNameExists(
  normalizedCompanyName: string,
  currentId?: string,
  client: ManufacturerDbClient = db,
): Promise<boolean> {
  const existing = await client.flooringManufacturer.findFirst({
    where: {
      companyNameNormalized: normalizedCompanyName,
      ...(currentId ? { NOT: { id: currentId } } : {}),
    },
    select: { id: true },
  })

  return Boolean(existing)
}

// --- Picker / options search ---

export type ManufacturerOptionsSearchArgs = {
  search?: string
  skip?: number
  take: number
}

export type ManufacturerOptionsSearchResult = {
  items: ManufacturerOption[]
  hasMore: boolean
}

export async function searchManufacturerOptions(
  args: ManufacturerOptionsSearchArgs,
  client: ManufacturerDbClient = db,
): Promise<ManufacturerOptionsSearchResult> {
  const where = args.search
    ? { companyName: { contains: args.search, mode: "insensitive" as const } }
    : undefined

  // Fetch take+1 to detect a next page without a separate count query.
  const rows = await client.flooringManufacturer.findMany({
    where,
    orderBy: [{ companyName: "asc" }, { id: "asc" }],
    skip: args.skip ?? 0,
    take: args.take + 1,
    select: { id: true, companyName: true },
  })

  const hasMore = rows.length > args.take
  const page = hasMore ? rows.slice(0, args.take) : rows
  return {
    items: page.map((row) => ({ id: row.id, name: row.companyName })),
    hasMore,
  }
}

// --- List-view read ---

export type ManufacturerListViewOptions = {
  search?: string
  skip: number
  take: number
}

export type ManufacturerListViewResult = {
  rows: ManufacturerRecord[]
  total: number
}

function buildListViewWhere(
  search: string | undefined,
): Prisma.FlooringManufacturerWhereInput | undefined {
  if (!search) return undefined
  return { companyName: { contains: search, mode: "insensitive" } }
}

export async function listManufacturersForListView(
  options: ManufacturerListViewOptions,
  client: ManufacturerDbClient = db,
): Promise<ManufacturerListViewResult> {
  const where = buildListViewWhere(options.search)

  const [total, rows] = await Promise.all([
    client.flooringManufacturer.count({ where }),
    client.flooringManufacturer.findMany({
      where,
      orderBy: [{ companyName: "asc" }, { id: "asc" }],
      skip: options.skip,
      take: options.take,
      include: manufacturerInclude,
    }),
  ])

  return {
    total,
    rows: rows.map(normalizeManufacturer),
  }
}
