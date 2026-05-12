"use client"

import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"
import type { CutLogRow } from "@builders/domain"

/**
 * URL-deriving scope discriminator. Mirrors the application-layer
 * `CutLogMutationScope` (in `@builders/application`): work-order routes
 * hang off `/api/work-orders/[id]/cut-logs/…` and inventory routes off
 * `/api/inventory/[id]/cut-logs/…`. Update / delete / void / finalize
 * accept either; create stays WO-only (cut logs are always created
 * under a WOMI in the UI) and takes a narrower input.
 */
export type CutLogScopeUrl =
  | { kind: "work-order"; workOrderId: string }
  | { kind: "inventory"; inventoryId: string }

function basePath(scope: CutLogScopeUrl): string {
  return scope.kind === "work-order"
    ? `/api/work-orders/${scope.workOrderId}/cut-logs`
    : `/api/inventory/${scope.inventoryId}/cut-logs`
}

export type PendingCutLogMutationResponse = {
  cutLog: CutLogRow
  inventoryId: string
  totalCutSum: string
}

export type DeletePendingCutLogResponse = {
  deletedId: string
  inventoryId: string
  totalCutSum: string
}

export type FinalizeCutLogResponse = {
  cutLog: CutLogRow
}

/**
 * Create — WO-only. Caller passes the WO + WOMI + inventory triple; the
 * server verifies WOMI ownership of the WO before locking the parent
 * inventory and inserting.
 */
export async function createPendingCutLogRequest(args: {
  workOrderId: string
  workOrderItemId: string
  inventoryId: string
  cut: string
  isWaste: boolean
  notes: string
}) {
  const body = withMutationMeta({
    workOrderItemId: args.workOrderItemId,
    inventoryId: args.inventoryId,
    cut: args.cut,
    isWaste: args.isWaste,
    notes: args.notes,
  } as Record<string, unknown>)
  return requestJson<PendingCutLogMutationResponse>(
    `/api/work-orders/${args.workOrderId}/cut-logs`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  )
}

export async function updatePendingCutLogRequest(args: {
  scope: CutLogScopeUrl
  cutLogId: string
  expectedUpdatedAt: string
  patch: {
    cut?: string
    isWaste?: boolean
    notes?: string
    link?: { workOrderId: string | null; workOrderItemId: string | null }
  }
}) {
  const body = withMutationMeta(
    { patch: args.patch } as Record<string, unknown>,
    args.expectedUpdatedAt,
  )
  return requestJson<PendingCutLogMutationResponse>(
    `${basePath(args.scope)}/${args.cutLogId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  )
}

export async function deletePendingCutLogRequest(args: {
  scope: CutLogScopeUrl
  cutLogId: string
  expectedUpdatedAt: string
}) {
  const body = withMutationMeta({} as Record<string, unknown>, args.expectedUpdatedAt)
  return requestJson<DeletePendingCutLogResponse>(
    `${basePath(args.scope)}/${args.cutLogId}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  )
}

export async function voidCutLogRequest(args: {
  scope: CutLogScopeUrl
  cutLogId: string
}) {
  return requestJson<PendingCutLogMutationResponse>(
    `${basePath(args.scope)}/${args.cutLogId}/void`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta({})),
    },
  )
}

/**
 * Finalize — resource-level URL on BOTH sides. The WO finalize URL was
 * normalized in this sweep (collection-level `/cut-logs/finalize`
 * deleted) so the request shape is symmetric across WO + inv.
 */
export async function finalizeCutLogRequest(args: {
  scope: CutLogScopeUrl
  cutLogId: string
}) {
  return requestJson<FinalizeCutLogResponse>(
    `${basePath(args.scope)}/${args.cutLogId}/finalize`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta({})),
    },
  )
}
