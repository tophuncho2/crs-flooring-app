import type { Prisma, PrismaClient } from "../../../generated/prisma/client.js"

export type StagedInventoryFilterDbClient = PrismaClient | Prisma.TransactionClient

export const stagedInventoryFilterRowSelect = {
  id: true,
  importEntryId: true,
  importEntry: { select: { id: true, importNumber: true } },
  categoryFilterId: true,
  categoryFilter: { select: { id: true, slug: true, name: true } },
  productId: true,
  product: {
    select: {
      id: true,
      name: true,
      style: true,
      color: true,
      stockUnitName: true,
      stockUnitAbbrev: true,
      category: { select: { id: true, slug: true, name: true } },
    },
  },
  stockOrdered: true,
  stockUnitName: true,
  stockUnitAbbrev: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.FlooringImportStagedInventoryFilterRowSelect

export type StagedInventoryFilterRowPayload =
  Prisma.FlooringImportStagedInventoryFilterRowGetPayload<{
    select: typeof stagedInventoryFilterRowSelect
  }>
