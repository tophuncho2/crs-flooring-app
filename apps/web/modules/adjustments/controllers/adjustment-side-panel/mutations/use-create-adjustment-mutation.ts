"use client"

import type { Dispatch, SetStateAction } from "react"
import {
  normalizeRecordSectionError,
  type RecordSectionError,
} from "@/types/record/section-error"
import type { InventoryAdjustmentRow } from "@builders/domain"
import { useMutation } from "@tanstack/react-query"
import {
  createManualAdjustmentRequest,
  createPendingAdjustmentRequest,
  type AdjustmentScopeUrl,
} from "@/modules/adjustments/data/mutations"
import { buildEditForm } from "../form"
import type {
  AdjustmentEditForm,
  AdjustmentEditPanelOpenSpec,
  AdjustmentPanelPatch,
} from "../types"

type Deps = {
  scope: AdjustmentScopeUrl
  publish: (patch: AdjustmentPanelPatch) => void
  setForm: Dispatch<SetStateAction<AdjustmentEditForm>>
  setBaseline: Dispatch<SetStateAction<AdjustmentEditForm>>
  setOpen: Dispatch<SetStateAction<AdjustmentEditPanelOpenSpec | null>>
  setError: Dispatch<SetStateAction<RecordSectionError | null>>
  /**
   * Optional override for post-create routing. When provided, the
   * mutation publishes the patch, fires `onCreated`, and closes the
   * create panel — instead of the default in-place create→edit flip.
   * The WO material-items section uses this to hand the new row off to
   * the inventory hub's adjustment edit panel; the inventory hub uses it
   * to pop back to the adjustments list. `workOrderItemId` is null for the
   * manual (inventory-hub) variant.
   */
  onCreated?: (adjustment: InventoryAdjustmentRow, workOrderItemId: string | null) => void
}

/**
 * Discriminated create input:
 *  - `variant: "cut"` — WO-linked DEDUCTION created under a WOMI (work-orders
 *    record view). Requires a work-order scope.
 *  - `variant: "manual"` — free-form INCREASE/DEDUCTION created from the
 *    inventory hub. Requires an inventory scope; never WO-linked, never waste.
 */
export type CreateAdjustmentInput =
  | { variant: "cut"; workOrderItemId: string; form: AdjustmentEditForm }
  | { variant: "manual"; inventoryId: string; form: AdjustmentEditForm }

/**
 * Create-pending mutation, scope-aware over the two create variants.
 *
 * Default success behavior: transition the panel from create → edit on
 * the newly-created row so the operator can finalize or tweak without
 * reopening. The parent WO label (`workOrderNumber`) and warehouse label
 * (`warehouseName`) are carried forward from the WO create-mode open spec
 * so the panel's read-only cells stay populated without a reopen.
 * `productName` rides along on the response (snapshot column), so it
 * doesn't need a carry-forward.
 *
 * Override behavior: when `onCreated` is provided, the mutation skips
 * the in-place flip, fires `onCreated`, and closes this panel — leaving
 * the consumer to route the newly-created row wherever it likes.
 */
export function useCreateAdjustmentMutation({
  scope,
  publish,
  setForm,
  setBaseline,
  setOpen,
  setError,
  onCreated,
}: Deps) {
  return useMutation({
    mutationFn: (input: CreateAdjustmentInput) => {
      if (input.variant === "manual") {
        // Runtime guard surfaces misuse as a clear error.
        if (scope.kind !== "inventory") {
          throw new Error(
            "createManualAdjustmentRequest requires an inventory scope.",
          )
        }
        return createManualAdjustmentRequest({
          inventoryId: input.inventoryId,
          adjustmentType: input.form.adjustmentType,
          quantity: input.form.quantity,
          isWaste: input.form.isWaste,
          notes: input.form.notes,
        })
      }
      if (scope.kind !== "work-order") {
        throw new Error(
          "createPendingAdjustmentRequest requires a work-order scope; canCreate must only be true on WO callers.",
        )
      }
      return createPendingAdjustmentRequest({
        workOrderId: scope.workOrderId,
        workOrderItemId: input.workOrderItemId,
        inventoryId: input.form.inventoryId,
        quantity: input.form.quantity,
        isWaste: input.form.isWaste,
        notes: input.form.notes,
      })
    },
    onSuccess: (response, variables) => {
      const workOrderItemId =
        variables.variant === "cut" ? variables.workOrderItemId : null
      publish({
        kind: "upsert",
        workOrderItemId,
        adjustment: response.adjustment,
      })
      if (onCreated) {
        onCreated(response.adjustment, workOrderItemId)
        setOpen(null)
        return
      }
      const next = buildEditForm(response.adjustment)
      setForm(next)
      setBaseline(next)
      setOpen((prev) => ({
        mode: "edit",
        workOrderItemId,
        adjustment: {
          ...response.adjustment,
          workOrderNumber:
            prev?.mode === "create" && prev.variant === "cut"
              ? (prev.workOrderNumber ?? null)
              : null,
          warehouseName:
            prev?.mode === "create" && prev.variant === "cut"
              ? (prev.warehouseName ?? null)
              : null,
        },
      }))
    },
    onError: (err: unknown) => {
      setError(normalizeRecordSectionError(err, { defaultMessage: "Failed to save adjustment" }))
    },
  })
}
