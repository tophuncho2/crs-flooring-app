import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"

export type InventoryIndicatorDbClient = PrismaClient | Prisma.TransactionClient

export const indicatorRowSelect = {
  id: true,
  indicatorNumber: true,
  productId: true,
  // Live product join — the normalizer derives the displayed product label from
  // this (via buildFlooringProductDisplayName). `productId` is non-nullable so the
  // relation is always present.
  product: { select: { name: true, style: true, color: true, productNumber: true } },
  warehouseId: true,
  warehouse: { select: { name: true } },
  // Identity unit FK + resolved unit; display derives solely from the join.
  unitId: true,
  unit: { select: { name: true, abbreviation: true } },
  lowStockThreshold: true,
  internalNotes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
} as const satisfies Prisma.FlooringInventoryIndicatorSelect

export type InventoryIndicatorRowPayload = Prisma.FlooringInventoryIndicatorGetPayload<{
  select: typeof indicatorRowSelect
}>
