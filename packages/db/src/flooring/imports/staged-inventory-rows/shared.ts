import type { Prisma, PrismaClient } from "../../../generated/prisma/client.js"

export type StagedInventoryDbClient = PrismaClient | Prisma.TransactionClient

export const stagedInventoryRowSelect = {
  id: true,
  importEntryId: true,
  importEntry: {
    select: {
      id: true,
      importNumber: true,
      purchaseOrderNumber: true,
    },
  },
  filterRowId: true,
  filterRow: {
    select: {
      id: true,
      productId: true,
      stockOrdered: true,
      stockUnitName: true,
      stockUnitAbbrev: true,
    },
  },
  productId: true,
  product: {
    select: {
      id: true,
      name: true,
      style: true,
      color: true,
      stockUnitName: true,
      stockUnitAbbrev: true,
      sendUnitName: true,
      sendUnitAbbrev: true,
      category: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
    },
  },
  rollPrefix: true,
  rollNumber: true,
  dyeLot: true,
  warehouseId: true,
  warehouse: { select: { id: true, name: true, number: true } },
  location: true,
  startingStock: true,
  stockUnitName: true,
  stockUnitAbbrev: true,
  isImported: true,
  status: true,
  note: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.FlooringImportStagedInventoryRowSelect

export type StagedInventoryRowPayload = Prisma.FlooringImportStagedInventoryRowGetPayload<{
  select: typeof stagedInventoryRowSelect
}>
