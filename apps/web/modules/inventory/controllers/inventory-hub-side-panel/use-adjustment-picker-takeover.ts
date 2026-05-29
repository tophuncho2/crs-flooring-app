"use client"

import { useCallback, type Dispatch, type SetStateAction } from "react"
import type { WorkOrderOption } from "@builders/domain"
import type { AdjustmentEditPanelController } from "@/modules/adjustments"
import type { AdjustmentPickerKind, HubMode } from "./types"

export type UseAdjustmentPickerTakeoverArgs = {
  mode: HubMode
  setMode: Dispatch<SetStateAction<HubMode>>
  /** Embedded adjustment panel controller — receives form + label writes on commit. */
  adjustmentPanel: AdjustmentEditPanelController
}

export type AdjustmentPickerTakeoverSlice = {
  /** Active picker kind, or null when not in picker-takeover. */
  pickerKind: AdjustmentPickerKind | null
  /**
   * Trigger handler. Enters `picker-takeover` from `section-edit-adjustment`,
   * swaps `pickerKind` while already in takeover, and toggles closed when
   * the active trigger fires again — preserves the trigger-toggle UX from
   * the adjustment relink header.
   */
  openPicker: (kind: AdjustmentPickerKind) => void
  /** Pops back to `returnTo`. No-op outside picker-takeover. */
  closePicker: () => void
  /**
   * Commits a WO selection: sets the adjustment form + label and auto-links the
   * matching material item, then pops the picker. The material item is no
   * longer user-picked (it's deterministic per WO + product).
   */
  commitWorkOrderPick: (option: WorkOrderOption | null) => void
}

/**
 * Picker-takeover slice for the adjustment edit body. When the user clicks a
 * relink trigger (WO or WOMI) inside `section-edit-adjustment`, mode flips
 * to `picker-takeover` with a `returnTo` snapshot of the adjustment edit
 * mode. The hub body renders the picker; `closePicker` (and the commit
 * helpers) pop back to `returnTo`.
 *
 * Mirrors `properties/.../use-hub-picker-takeover.ts`. The adjustment
 * variant only has one `returnTo` shape today (`section-edit-adjustment`),
 * but the mode union keeps `returnTo: HubMode` open for future surfaces.
 */
export function useAdjustmentPickerTakeover({
  mode,
  setMode,
  adjustmentPanel,
}: UseAdjustmentPickerTakeoverArgs): AdjustmentPickerTakeoverSlice {
  const pickerKind: AdjustmentPickerKind | null =
    mode.kind === "picker-takeover" ? mode.pickerKind : null

  const openPicker = useCallback(
    (kind: AdjustmentPickerKind) => {
      setMode((prev) => {
        // Same trigger fired again — close the picker.
        if (prev.kind === "picker-takeover" && prev.pickerKind === kind) {
          return prev.returnTo
        }
        // Different trigger fired while a picker is open — swap kinds,
        // preserve the original returnTo so we still pop back to the
        // section-edit-adjustment we entered from.
        if (prev.kind === "picker-takeover") {
          return { ...prev, pickerKind: kind }
        }
        // Enter takeover from adjustment edit; ignore from any other mode
        // (no triggers reach those surfaces today).
        if (prev.kind === "section-edit-adjustment") {
          return { kind: "picker-takeover", returnTo: prev, pickerKind: kind }
        }
        return prev
      })
    },
    [setMode],
  )

  const closePicker = useCallback(() => {
    setMode((prev) => (prev.kind === "picker-takeover" ? prev.returnTo : prev))
  }, [setMode])

  const commitWorkOrderPick = useCallback(
    (option: WorkOrderOption | null) => {
      void adjustmentPanel.selectWorkOrderOption(option)
      setMode((prev) => (prev.kind === "picker-takeover" ? prev.returnTo : prev))
    },
    [adjustmentPanel, setMode],
  )

  return {
    pickerKind,
    openPicker,
    closePicker,
    commitWorkOrderPick,
  }
}
