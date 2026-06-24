"use client"

import { useCallback, useMemo, useState } from "react"
import type { RecordPageController, RecordPageSummary } from "./use-record-page-controller"

const EMPTY_SUMMARY: RecordPageSummary = { metrics: [] }

/**
 * Page controller for a record view rendered **embedded inside a section of
 * another record view** (e.g. a Property record view drilled into from the entity
 * record view's properties section).
 *
 * It reuses the host page's unsaved-changes guard + confirm dialog (so there is
 * exactly ONE `beforeunload`/`popstate` listener and ONE dialog in the tree),
 * but keeps its **own** dirty-sections + summary state so the embedded
 * `RecordMultiSectionPanel`'s renderer never clobbers the host page's. `close`/
 * `redirectToBack` run the supplied `onNavigateBack` (flip the section back to
 * its list) instead of a router navigation.
 *
 * Bridge the embedded dirtiness up to the host yourself — pass the embedded
 * panel's `onDirtyChange` to the host so the host section's `controller.isDirty`
 * reflects it (that keeps the host guard aware of unsaved embedded edits).
 */
export function useEmbeddedRecordPageController({
  host,
  onNavigateBack,
}: {
  host: RecordPageController
  onNavigateBack: () => void
}): RecordPageController {
  const [dirtySections, setDirtySectionsState] = useState<string[]>([])
  const [summary, setSummary] = useState<RecordPageSummary>(EMPTY_SUMMARY)

  const setDirtySections = useCallback((value: string[]) => {
    setDirtySectionsState((current) => {
      if (current.length === value.length && current.every((s, i) => s === value[i])) {
        return current
      }
      return value
    })
  }, [])

  const setIsDirty = useCallback(
    (value: boolean) => setDirtySections(value ? ["Record"] : []),
    [setDirtySections],
  )

  return useMemo<RecordPageController>(
    () => ({
      notices: host.notices,
      isDirty: dirtySections.length > 0,
      dirtySections,
      isPrimarySectionOpen: true,
      setIsDirty,
      setDirtySections,
      setPrimarySectionOpen: () => {},
      togglePrimarySectionOpen: () => {},
      summary,
      setSummary,
      closePage: onNavigateBack,
      redirectToBack: onNavigateBack,
      confirmNavigation: host.confirmNavigation,
      dirtyLeaveDialogProps: host.dirtyLeaveDialogProps,
    }),
    [
      host.notices,
      host.confirmNavigation,
      host.dirtyLeaveDialogProps,
      dirtySections,
      setIsDirty,
      setDirtySections,
      summary,
      onNavigateBack,
    ],
  )
}
