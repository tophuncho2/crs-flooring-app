"use client"

import { useCallback } from "react"
import { useGatedBatchSelect } from "@/controllers/record/use-gated-batch-select"
import type { CutLogRow, FlooringCutLogStatus } from "@builders/domain"
import { finalizeWorkOrderCutLogBatchRequest } from "../data/mutations"

const isPendingRow = (row: CutLogRow) =>
  (row.status as FlooringCutLogStatus) === "PENDING"

/**
 * Extracts the finalize-batch selection state that was previously inline in
 * `work-order-material-items-section.tsx` (lines 93–108 of the pre-sweep
 * version). Wraps `useGatedBatchSelect` with the WO-scoped finalize
 * mutation; the only knobs the section needs are the row pool + the gating
 * flags (dirty / busy).
 *
 * No behavior change vs the inline version — this is a refactor for
 * cohesion. The finalize-selection state is its own concern, separable from
 * per-row pending-cut-log mutation state.
 *
 * Future finalize-hardening sweep will add speedy-refresh on completion;
 * not in scope here.
 */
export function useFinalizeCutLogBatchSection({
  workOrderId,
  rows,
  isSectionDirty,
  isSectionBusy,
}: {
  workOrderId: string
  /** Flattened cut-log rows across every WOMI in the section. */
  rows: ReadonlyArray<CutLogRow>
  /** True when any per-WOMI cut-log section is dirty OR the material-items section is dirty. */
  isSectionDirty: boolean
  /** True when any in-flight mutation is running on the section (per-row, material item, finalize, void). */
  isSectionBusy: boolean
}) {
  return useGatedBatchSelect<CutLogRow>({
    rows,
    isEligible: isPendingRow,
    isSectionDirty,
    isSectionBusy,
    performAction: useCallback(
      async (cutLogIds) => {
        await finalizeWorkOrderCutLogBatchRequest({
          workOrderId,
          requestKey: crypto.randomUUID(),
          cutLogIds,
        })
      },
      [workOrderId],
    ),
  })
}

export type FinalizeCutLogBatchSection = ReturnType<typeof useFinalizeCutLogBatchSection>
