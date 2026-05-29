import type { Prisma, PrismaClient } from "../../../generated/prisma/client.js"

export type InventoryAdjustmentDbClient = PrismaClient | Prisma.TransactionClient

export const adjustmentRowSelect = {
  id: true,
  adjustmentNumber: true,
  inventoryId: true,
  inventoryItem: true,
  inventoryNumber: true,
  rollPrefix: true,
  rollNumber: true,
  dyeLot: true,
  inventoryNote: true,
  location: true,
  categorySlug: true,
  productId: true,
  // Live product join — the normalizer derives the displayed product label
  // from this (via buildFlooringProductDisplayName). `productId` is non-nullable
  // (onDelete: Restrict) so the relation is always present.
  product: { select: { name: true, style: true, color: true } },
  warehouseId: true,
  workOrderId: true,
  workOrderItemId: true,
  before: true,
  quantity: true,
  coverage: true,
  after: true,
  stockUnitName: true,
  stockUnitAbbrev: true,
  itemCoverageUnitName: true,
  itemCoverageUnitAbbrev: true,
  adjustmentType: true,
  status: true,
  isFinal: true,
  finalSequence: true,
  isWaste: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.FlooringInventoryAdjustmentSelect

export type InventoryAdjustmentRowPayload = Prisma.FlooringInventoryAdjustmentGetPayload<{
  select: typeof adjustmentRowSelect
}>

/**
 * Inventory-side adjustment read shape: `adjustmentRowSelect` plus the linked
 * work-order's `workOrderNumber`, the linked work-order item's product name
 * parts, and the snapshot warehouse's `name`. Used only by
 * `inventoryDetailSelect` so the inventory side can render labels in the
 * adjustment row + side panel without a follow-up fetch. The work-orders
 * side still uses plain `adjustmentRowSelect`.
 */
export const enrichedInventoryAdjustmentRowSelect = {
  ...adjustmentRowSelect,
  workOrder: {
    select: {
      workOrderNumber: true,
    },
  },
  workOrderItem: {
    select: {
      notes: true,
      product: {
        select: {
          name: true,
          style: true,
          color: true,
        },
      },
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
