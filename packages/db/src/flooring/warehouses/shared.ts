import type { Prisma, PrismaClient } from "@prisma/client"

export type WarehousesDbClient = PrismaClient | Prisma.TransactionClient

export const warehouseRowSelect = {
  id: true,
  number: true,
  name: true,
  address: true,
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
