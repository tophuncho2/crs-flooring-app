"use client"

import { useEffect } from "react"
import type { InventoryAdjustmentRow } from "@builders/domain"
import type { AdjustmentScopeUrl } from "@/modules/adjustments/data/mutations"
import { useAdjustmentEditController } from "./use-adjustment-edit-controller"
import type { AdjustmentCreateSeed, AdjustmentPickerConfig } from "./types"

/**
 * The shared adjustment **create** core every location's modal shell composes.
 * Owns the headless `useAdjustmentEditController` (in create capability) plus the
 * seed→open effect, so each shell stays thin: it injects the four pieces that
 * actually vary — `scope`, `seed`, `pickerConfig`, `onCreated` — and renders the
 * returned controller through {@link AdjustmentRecordFields}.
 *
 * The effect is keyed on the `seed` reference: pass `null` to keep the panel
 * closed (nothing picked yet), or a memoized seed object to (re)open create from
 * it. Memoize the seed on its true inputs only (e.g. the picked inventory) so
 * typing in the form never re-seeds it out from under the user.
 */
export function useAdjustmentCreateForm({
  scope,
  seed,
  pickerConfig,
  onCreated,
}: {
  scope: AdjustmentScopeUrl
  /** Memoized create seed, or null while nothing is selected (panel stays closed). */
  seed: AdjustmentCreateSeed | null
  pickerConfig: AdjustmentPickerConfig
  /**
   * Fired after a successful create with the new row — the shell closes the modal,
   * reconciles, and can route/prompt to the created adjustment.
   */
  onCreated: (adjustment: InventoryAdjustmentRow) => void
}) {
  const controller = useAdjustmentEditController({
    scope,
    canCreate: true,
    // Create shells reconcile by reloading/invalidating in `onCreated`, so the
    // in-place publish patch is unused here.
    publish: () => {},
    onCreated,
  })

  // Re-seed only when the seed reference changes. A null seed closes the panel.
  useEffect(() => {
    if (!seed) {
      controller.close()
      return
    }
    controller.openPanel({ mode: "create", pickerConfig, seed })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed])

  return controller
}
