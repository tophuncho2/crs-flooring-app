"use client"

import { useCallback, useState } from "react"
import type { InventoryCutLogRow } from "@builders/domain"

export type InventoryCutLogViewPanelOpenSpec = {
  cutLog: InventoryCutLogRow
}

export type InventoryCutLogViewPanelController = {
  open: InventoryCutLogViewPanelOpenSpec | null
  openPanel: (cutLog: InventoryCutLogRow) => void
  close: () => void
}

/**
 * Right-anchored side panel state for inventory cut logs. View-only — cut-log
 * mutations live exclusively under the work-orders module (per sweep 4a/4b),
 * so this hook owns just open/close. The panel projects the selected
 * `InventoryCutLogRow` straight from the SSR-loaded inventory snapshot
 * (which carries server-resolved `workOrderNumber` + product label); no
 * fetching, form state, or dirty tracking.
 */
export function useInventoryCutLogViewPanel(): InventoryCutLogViewPanelController {
  const [open, setOpen] = useState<InventoryCutLogViewPanelOpenSpec | null>(null)

  const openPanel = useCallback((cutLog: InventoryCutLogRow) => {
    setOpen({ cutLog })
  }, [])

  const close = useCallback(() => {
    setOpen(null)
  }, [])

  return { open, openPanel, close }
}
