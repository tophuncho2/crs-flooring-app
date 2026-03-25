import type { Prisma, PrismaClient } from "@builders/db"
import { prisma } from "@/server/db/prisma"
import { createAppError, parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"

type DbClient = Prisma.TransactionClient | PrismaClient

const warehouseSelect = {
  id: true,
  name: true,
  address: true,
  phone: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      sections: true,
      locations: true,
      workOrders: true,
    },
  },
} as const

export function normalizeWarehouseRow(warehouse: {
  id: string
  name: string
  address: string | null
  phone: string | null
  createdAt: Date
  updatedAt: Date
  _count: {
    sections: number
    locations: number
    workOrders: number
  }
}) {
  return {
    id: warehouse.id,
    name: warehouse.name,
    address: warehouse.address,
    phone: warehouse.phone,
    sectionsCount: warehouse._count.sections,
    locationsCount: warehouse._count.locations,
    workOrdersCount: warehouse._count.workOrders,
    createdAt: warehouse.createdAt.toISOString(),
    updatedAt: warehouse.updatedAt.toISOString(),
  }
}

export async function listWarehouseRows(db: DbClient = prisma) {
  const warehouses = await db.flooringWarehouse.findMany({
    select: warehouseSelect,
    orderBy: { createdAt: "desc" },
  })

  return warehouses.map(normalizeWarehouseRow)
}

export async function createWarehouseRow(body: Record<string, unknown>, db: DbClient = prisma) {
  const warehouse = await db.flooringWarehouse.create({
    data: {
      name: parseRequiredString(body.name, "name"),
      address: parseOptionalString(body.address),
      phone: parseOptionalString(body.phone),
    },
    select: warehouseSelect,
  })

  return normalizeWarehouseRow(warehouse)
}

export async function updateWarehouseRow(id: string, body: Record<string, unknown>, db: DbClient = prisma) {
  const data: { name?: string; address?: string | null; phone?: string | null } = {}

  if ("name" in body) data.name = parseRequiredString(body.name, "name")
  if ("address" in body) data.address = parseOptionalString(body.address)
  if ("phone" in body) data.phone = parseOptionalString(body.phone)

  const warehouse = await db.flooringWarehouse.update({
    where: { id },
    data,
    select: warehouseSelect,
  })

  return normalizeWarehouseRow(warehouse)
}

export function normalizeSectionRow(section: {
  id: string
  warehouseId: string
  name: string
  _count: { locations: number }
}) {
  return {
    id: section.id,
    warehouseId: section.warehouseId,
    name: section.name,
    locationsCount: section._count.locations,
  }
}

export function normalizeLocationRow(location: {
  id: string
  warehouseId: string
  locationCode: string
  sectionId: string
  section: { name: string } | null
}) {
  return {
    id: location.id,
    warehouseId: location.warehouseId,
    locationCode: location.locationCode,
    sectionId: location.sectionId,
    sectionName: location.section?.name ?? null,
  }
}

export async function listSectionRows(db: DbClient = prisma, warehouseId?: string | null) {
  const sections = await db.flooringSection.findMany({
    where: warehouseId ? { warehouseId } : undefined,
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      warehouseId: true,
      name: true,
      _count: { select: { locations: true } },
    },
  })

  return sections.map(normalizeSectionRow)
}

export async function createSectionRow(db: DbClient = prisma, body: Record<string, unknown>) {
  const created = await db.flooringSection.create({
    data: {
      warehouseId: parseRequiredString(body.warehouseId, "warehouseId"),
      name: parseRequiredString(body.name, "name").trim(),
    },
    select: {
      id: true,
      warehouseId: true,
      name: true,
      _count: { select: { locations: true } },
    },
  })

  return normalizeSectionRow(created)
}

export async function updateSectionRow(db: DbClient = prisma, id: string, body: Record<string, unknown>) {
  const updated = await db.flooringSection.update({
    where: { id },
    data: {
      name: parseRequiredString(body.name, "name").trim(),
    },
    select: {
      id: true,
      warehouseId: true,
      name: true,
      _count: { select: { locations: true } },
    },
  })

  return normalizeSectionRow(updated)
}

export async function deleteSectionRow(db: DbClient = prisma, id: string) {
  const section = await db.flooringSection.findUnique({
    where: { id },
    select: {
      id: true,
      warehouseId: true,
      _count: { select: { locations: true } },
    },
  })

  if (!section) {
    throw createAppError("Section not found", { status: 404 })
  }

  if (section._count.locations > 0) {
    throw createAppError("Section cannot be deleted while locations are linked to it", { status: 409 })
  }

  await db.flooringSection.delete({ where: { id } })

  return {
    ok: true,
    sectionId: id,
    warehouseId: section.warehouseId,
  }
}

export async function listLocationRows(db: DbClient = prisma, warehouseId?: string | null) {
  const locations = await db.flooringLocation.findMany({
    where: warehouseId ? { warehouseId } : undefined,
    orderBy: [{ section: { name: "asc" } }, { locationCode: "asc" }],
    select: {
      id: true,
      warehouseId: true,
      locationCode: true,
      sectionId: true,
      section: { select: { name: true } },
    },
  })

  return locations.map(normalizeLocationRow)
}

async function ensureWarehouseSectionMatch(db: DbClient, warehouseId: string, sectionId: string) {
  const section = await db.flooringSection.findUnique({
    where: { id: sectionId },
    select: { id: true, warehouseId: true },
  })

  if (!section || section.warehouseId !== warehouseId) {
    throw createAppError("Selected section is invalid for this warehouse", { status: 400 })
  }
}

export async function createLocationRow(db: DbClient = prisma, body: Record<string, unknown>) {
  const warehouseId = parseRequiredString(body.warehouseId, "warehouseId")
  const locationCode = parseRequiredString(body.locationCode, "locationCode").trim()
  const sectionId = parseRequiredString(body.sectionId, "sectionId")

  await ensureWarehouseSectionMatch(db, warehouseId, sectionId)

  const created = await db.flooringLocation.create({
    data: {
      warehouseId,
      sectionId,
      locationCode,
    },
    select: {
      id: true,
      warehouseId: true,
      locationCode: true,
      sectionId: true,
      section: { select: { name: true } },
    },
  })

  return normalizeLocationRow(created)
}

export async function updateLocationRow(db: DbClient = prisma, id: string, body: Record<string, unknown>) {
  const hasLocationCode = "locationCode" in body
  const hasSectionId = "sectionId" in body
  const locationCode = hasLocationCode ? parseRequiredString(body.locationCode, "locationCode").trim() : undefined
  const sectionId = hasSectionId ? parseRequiredString(body.sectionId, "sectionId").trim() : undefined

  const existing = await db.flooringLocation.findUnique({
    where: { id },
    select: { warehouseId: true },
  })

  if (!existing) {
    throw createAppError("Location not found", { status: 404 })
  }

  if (sectionId) {
    await ensureWarehouseSectionMatch(db, existing.warehouseId, sectionId)
  }

  const updated = await db.flooringLocation.update({
    where: { id },
    data: {
      ...(hasLocationCode ? { locationCode } : {}),
      ...(hasSectionId ? { sectionId } : {}),
    },
    select: {
      id: true,
      warehouseId: true,
      locationCode: true,
      sectionId: true,
      section: { select: { name: true } },
    },
  })

  return normalizeLocationRow(updated)
}

export async function deleteLocationRow(db: DbClient = prisma, id: string) {
  const location = await db.flooringLocation.findUnique({
    where: { id },
    select: {
      id: true,
      warehouseId: true,
      sectionId: true,
    },
  })

  if (!location) {
    throw createAppError("Location not found", { status: 404 })
  }

  await db.flooringLocation.delete({ where: { id } })

  return {
    ok: true,
    locationId: id,
    warehouseId: location.warehouseId,
    sectionId: location.sectionId,
  }
}

export function parseWarehouseFilter(warehouseId: string | null) {
  return parseOptionalString(warehouseId)
}
