import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"

export type WarehousesDbClient = PrismaClient | Prisma.TransactionClient

export const warehouseRowSelect = {
  id: true,
  warehouseNumber: true,
  warehouseNumberInt: true,
  name: true,
  streetAddress: true,
  city: true,
  state: true,
  postalCode: true,
  phone: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      workOrders: true,
    },
  },
} as const

export const warehouseDetailSelect = warehouseRowSelect

export const warehouseListRowSelect = {
  id: true,
  warehouseNumber: true,
  name: true,
  streetAddress: true,
  city: true,
  state: true,
  postalCode: true,
  phone: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      workOrders: true,
    },
  },
} as const

export type WarehouseRowPayload = Prisma.FlooringWarehouseGetPayload<{ select: typeof warehouseRowSelect }>
export type WarehouseDetailPayload = WarehouseRowPayload
export type WarehouseListRowPayload = Prisma.FlooringWarehouseGetPayload<{ select: typeof warehouseListRowSelect }>
