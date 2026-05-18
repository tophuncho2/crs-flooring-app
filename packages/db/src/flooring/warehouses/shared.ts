import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"

export type WarehousesDbClient = PrismaClient | Prisma.TransactionClient

export const warehouseRowSelect = {
  id: true,
  number: true,
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

export type WarehouseRowPayload = Prisma.FlooringWarehouseGetPayload<{ select: typeof warehouseRowSelect }>
export type WarehouseDetailPayload = WarehouseRowPayload
