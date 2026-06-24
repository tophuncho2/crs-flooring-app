"use client"

import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"
import type {
  FlooringInventoryAdjustmentType,
  InventoryAdjustmentRow,
  PaletteColor,
} from "@builders/domain"

/**
 * URL-deriving scope discriminator. Mirrors the application-layer
 * `AdjustmentMutationScope` (in `@builders/application`): work-order routes
 * hang off `/api/work-orders/[id]/adjustments/…` and inventory routes off
 * `/api/inventory/[id]/adjustments/…`. Update / delete accept either scope;
 * create always targets the inventory route (the form knows the chosen
 * inventory id) via `createAdjustmentRequest`.
 */
export type AdjustmentScopeUrl =
  | { kind: "work-order"; workOrderId: string }
  | { kind: "inventory"; inventoryId: string }

function basePath(scope: AdjustmentScopeUrl): string {
  return scope.kind === "work-order"
    ? `/api/work-orders/${scope.workOrderId}/adjustments`
    : `/api/inventory/${scope.inventoryId}/adjustments`
}

export type PendingAdjustmentMutationResponse = {
  adjustment: InventoryAdjustmentRow
  inventoryId: string
  netDeducted: string
}

export type DeletePendingAdjustmentResponse = {
  deletedId: string
  inventoryId: string
  netDeducted: string
}

/**
 * Single create path. The form always knows the chosen inventory id, so every
 * create — whether opened from the work-orders record view or the inventory
 * hub — posts to the inventory route. The body carries direction + amount +
 * waste + notes, plus the optional `workOrderId` link (any product, any
 * direction) and the selected `warehouseId` filter (the server asserts it
 * matches the chosen inventory's warehouse).
 */
export async function createAdjustmentRequest(args: {
  inventoryId: string
  adjustmentType: FlooringInventoryAdjustmentType
  quantity: string
  isWaste: boolean
  notes: string
  color: PaletteColor
  location?: string | null
  warehouseId?: string | null
  workOrderId?: string | null
}) {
  const payload: Record<string, unknown> = {
    adjustmentType: args.adjustmentType,
    quantity: args.quantity,
    isWaste: args.isWaste,
    notes: args.notes,
    color: args.color,
    location: args.location ?? null,
  }
  if (args.warehouseId) payload.warehouseId = args.warehouseId
  if (args.workOrderId) payload.workOrderId = args.workOrderId
  const body = withMutationMeta(payload)
  return requestJson<PendingAdjustmentMutationResponse>(
    `/api/inventory/${args.inventoryId}/adjustments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  )
}

export async function updatePendingAdjustmentRequest(args: {
  scope: AdjustmentScopeUrl
  adjustmentId: string
  expectedUpdatedAt: string
  patch: {
    quantity?: string
    adjustmentType?: FlooringInventoryAdjustmentType
    isWaste?: boolean
    notes?: string
    color?: PaletteColor
    location?: string | null
    link?: { workOrderId: string | null }
  }
}) {
  const body = withMutationMeta(
    { patch: args.patch } as Record<string, unknown>,
    args.expectedUpdatedAt,
  )
  return requestJson<PendingAdjustmentMutationResponse>(
    `${basePath(args.scope)}/${args.adjustmentId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  )
}

export async function deletePendingAdjustmentRequest(args: {
  scope: AdjustmentScopeUrl
  adjustmentId: string
  expectedUpdatedAt: string
}) {
  const body = withMutationMeta({} as Record<string, unknown>, args.expectedUpdatedAt)
  return requestJson<DeletePendingAdjustmentResponse>(
    `${basePath(args.scope)}/${args.adjustmentId}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  )
}

