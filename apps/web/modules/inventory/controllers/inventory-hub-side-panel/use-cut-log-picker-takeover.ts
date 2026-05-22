"use client"

import { useCallback, type Dispatch, type SetStateAction } from "react"
import type {
  WorkOrderMaterialItemOption,
  WorkOrderOption,
} from "@builders/domain"
import type { CutLogEditPanelController } from "@/modules/cut-logs"
import type { CutLogPickerKind, HubMode } from "./types"

export type UseCutLogPickerTakeoverArgs = {
  mode: HubMode
  setMode: Dispatch<SetStateAction<HubMode>>
  /** Embedded cut-log panel controller — receives form + label writes on commit. */
  cutLogPanel: CutLogEditPanelController
}

export type CutLogPickerTakeoverSlice = {
  /** Active picker kind, or null when not in picker-takeover. */
  pickerKind: CutLogPickerKind | null
  /**
   * Trigger handler. Enters `picker-takeover` from `section-edit-cut-log`,
   * swaps `pickerKind` while already in takeover, and toggles closed when
   * the active trigger fires again — preserves the trigger-toggle UX from
   * the cut-log relink header.
   */
  openPicker: (kind: CutLogPickerKind) => void
  /** Pops back to `returnTo`. No-op outside picker-takeover. */
  closePicker: () => void
  /** Commits a WO selection to the cut-log form + label, then pops the picker. */
  commitWorkOrderPick: (option: WorkOrderOption | null) => void
  /** Commits a WOMI selection to the cut-log form + label, then pops the picker. */
  commitWorkOrderItemPick: (option: WorkOrderMaterialItemOption | null) => void
}

/**
 * Picker-takeover slice for the cut-log edit body. When the user clicks a
 * relink trigger (WO or WOMI) inside `section-edit-cut-log`, mode flips
 * to `picker-takeover` with a `returnTo` snapshot of the cut-log edit
 * mode. The hub body renders the picker; `closePicker` (and the commit
 * helpers) pop back to `returnTo`.
 *
 * Mirrors `properties/.../use-hub-picker-takeover.ts`. The cut-log
 * variant only has one `returnTo` shape today (`section-edit-cut-log`),
 * but the mode union keeps `returnTo: HubMode` open for future surfaces.
 */
export function useCutLogPickerTakeover({
  mode,
  setMode,
  cutLogPanel,
}: UseCutLogPickerTakeoverArgs): CutLogPickerTakeoverSlice {
  const pickerKind: CutLogPickerKind | null =
    mode.kind === "picker-takeover" ? mode.pickerKind : null

  const openPicker = useCallback(
    (kind: CutLogPickerKind) => {
      setMode((prev) => {
        // Same trigger fired again — close the picker.
        if (prev.kind === "picker-takeover" && prev.pickerKind === kind) {
          return prev.returnTo
        }
        // Different trigger fired while a picker is open — swap kinds,
        // preserve the original returnTo so we still pop back to the
        // section-edit-cut-log we entered from.
        if (prev.kind === "picker-takeover") {
          return { ...prev, pickerKind: kind }
        }
        // Enter takeover from cut-log edit; ignore from any other mode
        // (no triggers reach those surfaces today).
        if (prev.kind === "section-edit-cut-log") {
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
      cutLogPanel.setWorkOrderId(option?.id ?? null)
      cutLogPanel.snapshotWorkOrderOption(option)
      setMode((prev) => (prev.kind === "picker-takeover" ? prev.returnTo : prev))
    },
    [cutLogPanel, setMode],
  )

  const commitWorkOrderItemPick = useCallback(
    (option: WorkOrderMaterialItemOption | null) => {
      cutLogPanel.setWorkOrderItemId(option?.id ?? null)
      cutLogPanel.snapshotWorkOrderItemOption(option)
      setMode((prev) => (prev.kind === "picker-takeover" ? prev.returnTo : prev))
    },
    [cutLogPanel, setMode],
  )

  return {
    pickerKind,
    openPicker,
    closePicker,
    commitWorkOrderPick,
    commitWorkOrderItemPick,
  }
}
