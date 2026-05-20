"use client"

import { useMemo, useState } from "react"
import type { RecordSectionSubHeaderAction } from "@/components/sections/structure/record-section-sub-header"
import { CutsOnlyPreviewPanel } from "./cuts-only-preview-panel"

/**
 * Co-locates the primary-section action entry (rendered next to Discard
 * via the `actions` prop) with the cuts-only-preview panel mount. Drop
 * the returned `action` into the primary section's actions array (left
 * of the Files action) and mount `panel` as a sibling.
 */
export function useCutsOnlyPreviewTrigger(workOrderId: string) {
  const [open, setOpen] = useState(false)

  const action: RecordSectionSubHeaderAction = useMemo(
    () => ({
      key: "open-cuts",
      label: "Cuts only",
      tone: "neutral",
      onClick: () => setOpen(true),
    }),
    [],
  )

  const panel = (
    <CutsOnlyPreviewPanel
      open={open}
      onClose={() => setOpen(false)}
      workOrderId={workOrderId}
    />
  )

  return { action, panel }
}
