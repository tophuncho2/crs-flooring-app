import type { Prisma, PrismaClient } from "@prisma/client"

export type StagedInventoryDbClient = PrismaClient | Prisma.TransactionClient

export const stagedInventoryRowSelect = {
  id: true,
  importEntryId: true,
  importEntry: {
    select: {
      id: true,
      importNumber: true,
    },
  },
  productId: true,
  product: {
    select: {
      id: true,
      name: true,
      style: true,
      color: true,
      coveragePerUnit: true,
      category: {
        select: {
          id: true,
          slug: true,
          name: true,
          stockUnit: { select: { name: true, abbreviation: true } },
          itemCoverageUnit: { select: { name: true, abbreviation: true } },
          sendUnit: { select: { name: true, abbreviation: true } },
        },
      },
    },
  },
  rollNumber: true,
  dyeLot: true,
  warehouseId: true,
  warehouse: { select: { id: true, name: true, number: true } },
  location: true,
  startingStock: true,
  isImported: true,
  status: true,
  note: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.FlooringImportStagedInventoryRowSelect

export type StagedInventoryRowPayload = Prisma.FlooringImportStagedInventoryRowGetPayload<{
  select: typeof stagedInventoryRowSelect
}>
