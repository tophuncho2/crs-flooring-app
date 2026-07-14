import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"

export type InventoryAdjustmentDbClient = PrismaClient | Prisma.TransactionClient

export const adjustmentRowSelect = {
  id: true,
  adjustmentNumber: true,
  inventoryId: true,
  inventoryNumber: true,
  rollPrefix: true,
  rollNumber: true,
  dyeLot: true,
  inventoryNote: true,
  location: true,
  area: true,
  productId: true,
  // Live product join — the normalizer derives the displayed product label
  // from this (via buildFlooringProductDisplayName). `productId` is non-nullable
  // (onDelete: Restrict) so the relation is always present.
  product: { select: { name: true, style: true, color: true } },
  warehouseId: true,
  workOrderId: true,
  before: true,
  quantity: true,
  after: true,
  cost: true,
  freight: true,
  // Canonical unit FK + resolved unit (UoM epic 2B). The normalizer derives the
  // display abbrev/name solely from `unit`; snapshot columns fully de-referenced
  // (2D drops them).
  unitId: true,
  unit: { select: { name: true, abbreviation: true } },
  // Conversion feature — coverage basis + linked formula. convertedBalance (basis
  // = `quantity`) + the target unit derive in the normalizer via convertQuantity.
  coverageUnitId: true,
  coverageUnit: { select: { id: true, name: true, abbreviation: true } },
  coveragePerUnit: true,
  conversionFormulaId: true,
  conversionFormula: {
    select: {
      id: true,
      name: true,
      fromUnitId: true,
      operator: true,
      factorMode: true,
      constantFactor: true,
      toUnit: { select: { id: true, name: true, abbreviation: true } },
    },
  },
  adjustmentType: true,
  isWaste: true,
  internalNotes: true,
  color: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
} as const satisfies Prisma.FlooringInventoryAdjustmentSelect

export type InventoryAdjustmentRowPayload = Prisma.FlooringInventoryAdjustmentGetPayload<{
  select: typeof adjustmentRowSelect
}>

/**
 * Inventory-side adjustment read shape: `adjustmentRowSelect` plus the linked
 * work-order's `workOrderNumber` and the snapshot warehouse's `name`. Used by
 * `inventoryDetailSelect` (and the WO Adjustments grid) so the row renders its
 * labels without a follow-up fetch. Adjustments no longer link to a material
 * item, so there is no work-order-item join.
 */
export const enrichedInventoryAdjustmentRowSelect = {
  ...adjustmentRowSelect,
  workOrder: {
    select: {
      workOrderNumber: true,
    },
  },
  warehouse: {
    select: {
      name: true,
    },
  },
} as const satisfies Prisma.FlooringInventoryAdjustmentSelect

export type EnrichedInventoryAdjustmentRowPayload =
  Prisma.FlooringInventoryAdjustmentGetPayload<{
    select: typeof enrichedInventoryAdjustmentRowSelect
  }>
