import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "@prisma/client"

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
    phone: manufacturer.phone ?? "",
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

export type ManufacturerDeleteStateResult = {
  id: string
  _count: { products: number }
} | null

export async function getManufacturerDeleteState(
  id: string,
  client: ManufacturerDbClient = db,
): Promise<ManufacturerDeleteStateResult> {
  return client.flooringManufacturer.findUnique({
    where: { id },
    select: {
      id: true,
      _count: {
        select: {
          products: true,
        },
      },
    },
  })
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
      orderBy: { companyName: "asc" },
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
