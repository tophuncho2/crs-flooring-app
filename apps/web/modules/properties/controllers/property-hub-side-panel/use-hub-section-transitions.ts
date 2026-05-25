"use client"

import { useCallback, type Dispatch, type SetStateAction } from "react"
import {
  toManagementCompanyForm,
  type ManagementCompanyDetail,
  type PropertyListRow,
} from "@builders/domain"
import type { HubMcEditSlice } from "./use-hub-mc-edit"
import type { HubPropertyEditSlice } from "./use-hub-property-edit"
import type { HubMode } from "./types"
import type { RecordSectionError } from "@/types/record/section-error"

export type UseHubSectionTransitionsArgs = {
  contextMcId: string | null
  /** Fetched MC detail for the current context (from the coordinator's detail query). */
  mcDetail: ManagementCompanyDetail | null | undefined
  setMode: Dispatch<SetStateAction<HubMode>>
  setError: (value: RecordSectionError | null) => void
  mcEdit: HubMcEditSlice
  propertyEdit: HubPropertyEditSlice
  resetAll: () => void
  /** Re-uses the public opener for the propertyEdit transition (kept aligned with row-click entry). */
  openForPropertyEdit: (row: PropertyListRow) => void
}

export type HubSectionTransitionsSlice = {
  /** Switch from view-mode into mc-edit, seeded from the loaded detail or empty. */
  enterMcEditFromContext: () => void
  /** Switch from view-mode into property-edit for a given property row. */
  enterPropertyEditFromContext: (row: PropertyListRow) => void
  /** Leave an edit section back to view (or close if the hub has no parent MC). */
  exitToView: () => void
}

/**
 * Transitions that fire from inside the panel (vs. external openers that
 * fire from list rows). Each one changes `mode` and may reset / hydrate
 * the section slices accordingly. Save-on-success transitions still live
 * in the coordinator's `save` dispatch — these are user-driven nav.
 */
export function useHubSectionTransitions({
  contextMcId,
  mcDetail,
  setMode,
  setError,
  mcEdit,
  propertyEdit,
  resetAll,
  openForPropertyEdit,
}: UseHubSectionTransitionsArgs): HubSectionTransitionsSlice {
  const enterMcEditFromContext = useCallback(() => {
    if (contextMcId === null) return
    if (mcDetail) {
      mcEdit.hydrateFromRow(toManagementCompanyForm(mcDetail), mcDetail.updatedAt)
    } else {
      mcEdit.reset()
    }
    setError(null)
    setMode({ kind: "section-edit-mc", mcId: contextMcId })
  }, [contextMcId, mcDetail, mcEdit, setError, setMode])

  const enterPropertyEditFromContext = useCallback(
    (row: PropertyListRow) => {
      openForPropertyEdit(row)
    },
    [openForPropertyEdit],
  )

  const exitToView = useCallback(() => {
    if (contextMcId === null) {
      setMode({ kind: "closed" })
      resetAll()
      return
    }
    mcEdit.reset()
    propertyEdit.reset()
    setError(null)
    setMode((prev) => {
      const tab = prev.kind === "view" ? prev.tab : "properties"
      return { kind: "view", mcId: contextMcId, tab }
    })
  }, [contextMcId, mcEdit, propertyEdit, resetAll, setError, setMode])

  return {
    enterMcEditFromContext,
    enterPropertyEditFromContext,
    exitToView,
  }
}
