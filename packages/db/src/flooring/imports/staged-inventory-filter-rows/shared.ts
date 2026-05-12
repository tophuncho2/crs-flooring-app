import type { Prisma, PrismaClient } from "@prisma/client"

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
  // Children's startingStock is the input to the normalizer's
  // remainingStock + startingStockSum computation. childRowCount falls
  // out of the array length. Filter rows under an import are bounded
  // (~tens), so a single-query include beats a separate aggregate.
  stagedInventoryRows: {
    select: { startingStock: true },
  },
} as const satisfies Prisma.FlooringImportStagedInventoryFilterRowSelect

export type StagedInventoryFilterRowPayload =
  Prisma.FlooringImportStagedInventoryFilterRowGetPayload<{
    select: typeof stagedInventoryFilterRowSelect
  }>
