import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"

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
  // The staged row's OWN conversion trio — editable in staging, materialized
  // forward by the worker. `conversionFormula` resolves the picker label.
  coverageUnitId: true,
  coverageUnit: { select: { name: true, abbreviation: true } },
  coveragePerUnit: true,
  conversionFormulaId: true,
  conversionFormula: { select: { name: true } },
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

/**
 * Lean projection for the worker materialize read. The materialize use case
 * copies only scalar columns forward onto the new inventory row plus the parent
 * import's `warehouseId` (warehouse is parent-owned) — it never touches the
 * product / unit / coverageUnit / conversionFormula relation objects. Reducing
 * the 5-relation `stagedInventoryRowSelect` to this single-relation projection
 * keeps the read safe on the pinned interactive-transaction connection: a
 * multi-relation select on a `tx` client fires concurrent relation sub-queries
 * on one pg connection and wedges it ("client is already executing a query").
 */
export const stagedInventoryMaterializeSelect = {
  id: true,
  productId: true,
  unitId: true,
  coverageUnitId: true,
  coveragePerUnit: true,
  conversionFormulaId: true,
  rollPrefix: true,
  rollNumber: true,
  dyeLot: true,
  location: true,
  startingStock: true,
  cost: true,
  freight: true,
  note: true,
  importEntry: { select: { warehouseId: true } },
} as const satisfies Prisma.FlooringImportStagedInventoryRowSelect

export type StagedInventoryMaterializePayload =
  Prisma.FlooringImportStagedInventoryRowGetPayload<{
    select: typeof stagedInventoryMaterializeSelect
  }>
