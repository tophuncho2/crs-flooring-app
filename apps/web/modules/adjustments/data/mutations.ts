"use client"

import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"
import type {
  FlooringInventoryAdjustmentType,
  InventoryAdjustmentRow,
} from "@builders/domain"

/**
 * URL-deriving scope discriminator. Mirrors the application-layer
 * `AdjustmentMutationScope` (in `@builders/application`): work-order routes
 * hang off `/api/work-orders/[id]/adjustments/…` and inventory routes off
 * `/api/inventory/[id]/adjustments/…`. Update / delete / void / finalize
 * accept either; create stays WO-only (adjustments are always created
 * under a WOMI in the UI) and takes a narrower input.
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

export type FinalizeAdjustmentResponse = {
  adjustment: InventoryAdjustmentRow
}

/**
 * Create — WO-only. Caller passes the WO + WOMI + inventory triple; the
 * server verifies WOMI ownership of the WO before locking the parent
 * inventory and inserting.
 */
export async function createPendingAdjustmentRequest(args: {
  workOrderId: string
  workOrderItemId: string
  inventoryId: string
  quantity: string
  isWaste: boolean
  notes: string
}) {
  const body = withMutationMeta({
    workOrderItemId: args.workOrderItemId,
    inventoryId: args.inventoryId,
    quantity: args.quantity,
    isWaste: args.isWaste,
    notes: args.notes,
  } as Record<string, unknown>)
  return requestJson<PendingAdjustmentMutationResponse>(
    `/api/work-orders/${args.workOrderId}/adjustments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  )
}

/**
 * Create a manual (non-WO) adjustment on one inventory record. Inventory-only:
 * the parent inventory id rides on the route path, so the body carries just the
 * direction + amount + notes. Never WO-linked, never waste.
 */
export async function createManualAdjustmentRequest(args: {
  inventoryId: string
  adjustmentType: FlooringInventoryAdjustmentType
  quantity: string
  notes: string
}) {
  const body = withMutationMeta({
    adjustmentType: args.adjustmentType,
    quantity: args.quantity,
    notes: args.notes,
  } as Record<string, unknown>)
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
    isWaste?: boolean
    notes?: string
    link?: { workOrderId: string | null; workOrderItemId: string | null }
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

/**
 * Finalize — resource-level URL on BOTH sides. The WO finalize URL was
 * normalized in this sweep (collection-level `/adjustments/finalize`
 * deleted) so the request shape is symmetric across WO + inv.
 */
export async function finalizeAdjustmentRequest(args: {
  scope: AdjustmentScopeUrl
  adjustmentId: string
}) {
  return requestJson<FinalizeAdjustmentResponse>(
    `${basePath(args.scope)}/${args.adjustmentId}/finalize`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta({})),
    },
  )
}
