"use client"

import type { Dispatch, SetStateAction } from "react"
import {
  normalizeRecordSectionError,
  type RecordSectionError,
} from "@/types/record/section-error"
import type { InventoryAdjustmentRow } from "@builders/domain"
import { useMutation } from "@tanstack/react-query"
import { createAdjustmentRequest } from "@/modules/adjustments/data/mutations"
import { buildEditForm, EDIT_PICKER_CONFIG } from "../form"
import type {
  AdjustmentEditForm,
  AdjustmentEditOpenSpec,
  AdjustmentEditPatch,
} from "../types"

type Deps = {
  publish: (patch: AdjustmentEditPatch) => void
  setForm: Dispatch<SetStateAction<AdjustmentEditForm>>
  setBaseline: Dispatch<SetStateAction<AdjustmentEditForm>>
  setOpen: Dispatch<SetStateAction<AdjustmentEditOpenSpec | null>>
  setError: Dispatch<SetStateAction<RecordSectionError | null>>
  /**
   * Optional override for post-create routing. When provided, the
   * mutation publishes the patch, fires `onCreated`, and closes the
   * create panel — instead of the default in-place create→edit flip.
   * The WO material-items section uses this to refresh its Adjustments grid;
   * the inventory hub uses it to pop back to the adjustments list.
   */
  onCreated?: (adjustment: InventoryAdjustmentRow) => void
}

/**
 * Single create input — the form carries everything (inventory + optional WO
 * link + warehouse filter + direction + amount). The request always posts to
 * the inventory route.
 */
export type CreateAdjustmentInput = { form: AdjustmentEditForm }

/**
 * Create mutation. The form is the single source of input; the request
 * always targets the inventory route (the form knows the chosen inventory id).
 *
 * Default success behavior: flip the panel create → edit on the new row.
 * Override behavior: when `onCreated` is provided (both surfaces do), the
 * mutation publishes the patch, fires `onCreated`, and closes — leaving the
 * consumer to route the new row (the WO section hands off to the hub; the hub
 * pops back to its adjustments list).
 */
export function useCreateAdjustmentMutation({
  publish,
  setForm,
  setBaseline,
  setOpen,
  setError,
  onCreated,
}: Deps) {
  return useMutation({
    mutationFn: (input: CreateAdjustmentInput) =>
      createAdjustmentRequest({
        inventoryId: input.form.inventoryId,
        adjustmentType: input.form.adjustmentType,
        quantity: input.form.quantity,
        isWaste: input.form.isWaste,
        internalNotes: input.form.internalNotes,
        color: input.form.color,
        location: input.form.location,
        area: input.form.area,
        warehouseId: input.form.warehouseId,
        workOrderId: input.form.workOrderId,
      }),
    onSuccess: (response) => {
      publish({
        kind: "upsert",
        adjustment: response.adjustment,
      })
      if (onCreated) {
        onCreated(response.adjustment)
        setOpen(null)
        return
      }
      const next = buildEditForm(response.adjustment)
      setForm(next)
      setBaseline(next)
      setOpen({
        mode: "edit",
        pickerConfig: EDIT_PICKER_CONFIG,
        adjustment: response.adjustment,
      })
    },
    onError: (err: unknown) => {
      setError(normalizeRecordSectionError(err, { defaultMessage: "Failed to save adjustment" }))
    },
  })
}
