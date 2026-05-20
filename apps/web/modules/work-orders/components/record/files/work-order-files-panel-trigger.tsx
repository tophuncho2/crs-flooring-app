"use client"

import { useMemo, useState } from "react"
import type { RecordSectionSubHeaderAction } from "@/components/sections/structure/record-section-sub-header"
import { WorkOrderFilesPanel } from "./work-order-files-panel"

/**
 * Co-locates the primary-section action entry (rendered next to Discard
 * via the `actions` prop) with the side-panel mount. Returns both so
 * the parent can spread the action into the primary section's `actions`
 * array and mount the panel as a sibling.
 */
export function useWorkOrderFilesPanelTrigger(workOrderId: string) {
  const [open, setOpen] = useState(false)

  const action: RecordSectionSubHeaderAction = useMemo(
    () => ({
      key: "open-files",
      label: "Files",
      tone: "neutral",
      onClick: () => setOpen(true),
    }),
    [],
  )

  const panel = (
    <WorkOrderFilesPanel
      open={open}
      onClose={() => setOpen(false)}
      workOrderId={workOrderId}
    />
  )

  return { action, panel }
}
