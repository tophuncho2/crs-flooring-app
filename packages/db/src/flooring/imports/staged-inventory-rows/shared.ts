import type { Prisma, PrismaClient } from "../../../generated/prisma/client.js"

export type StagedInventoryDbClient = PrismaClient | Prisma.TransactionClient

export const stagedInventoryRowSelect = {
  id: true,
  importEntryId: true,
  importEntry: {
    select: {
      id: true,
      importNumber: true,
      // Warehouse is parent-owned: the staged row no longer stores its own
      // warehouseId, so display + materialize source it from the import entry
      // (non-null, frozen-while-children-exist).
      warehouseId: true,
      warehouse: { select: { id: true, name: true } },
    },
  },
  productId: true,
  product: {
    select: {
      id: true,
      name: true,
      style: true,
      color: true,
      // Product's own unit FK + resolved unit (UoM epic 2B) — seeds a staged
      // row's `unitId` on add / product-change.
      unitId: true,
      unit: { select: { name: true, abbreviation: true } },
      category: {
        select: {
          id: true,
        },
      },
    },
  },
  // The staged row's OWN unit FK (UoM epic 2B) — editable in staging, and the
  // value the worker materializes forward into inventory. Nullable until the
  // importability gate requires it. `unit` resolves the display abbrev/name.
  unitId: true,
  unit: { select: { name: true, abbreviation: true } },
  rollPrefix: true,
  rollNumber: true,
  dyeLot: true,
  location: true,
  startingStock: true,
  cost: true,
  freight: true,
  status: true,
  note: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.FlooringImportStagedInventoryRowSelect

export type StagedInventoryRowPayload = Prisma.FlooringImportStagedInventoryRowGetPayload<{
  select: typeof stagedInventoryRowSelect
}>
