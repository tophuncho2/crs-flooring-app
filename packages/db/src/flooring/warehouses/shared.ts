import type { Prisma, PrismaClient } from "@prisma/client"

export type WarehousesDbClient = PrismaClient | Prisma.TransactionClient

export const warehouseRowSelect = {
  id: true,
  slug: true,
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

export const sectionRowSelect = {
  id: true,
  warehouseId: true,
  slug: true,
  name: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      locations: true,
    },
  },
} as const

export const locationRowSelect = {
  id: true,
  warehouseId: true,
  sectionId: true,
  locationCode: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      inventories: true,
    },
  },
} as const

export const warehouseDetailSelect = {
  id: true,
  slug: true,
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
  sections: {
    select: sectionRowSelect,
    orderBy: { name: "asc" },
  },
  locations: {
    select: locationRowSelect,
    orderBy: { locationCode: "asc" },
  },
} as const

export type WarehouseRowPayload = Prisma.FlooringWarehouseGetPayload<{ select: typeof warehouseRowSelect }>
export type WarehouseDetailPayload = Prisma.FlooringWarehouseGetPayload<{ select: typeof warehouseDetailSelect }>
export type SectionRowPayload = Prisma.FlooringSectionGetPayload<{ select: typeof sectionRowSelect }>
export type LocationRowPayload = Prisma.FlooringLocationGetPayload<{ select: typeof locationRowSelect }>
