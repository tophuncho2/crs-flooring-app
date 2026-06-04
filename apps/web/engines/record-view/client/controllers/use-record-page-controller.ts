"use client"

import { useCallback, useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useRecordCloseGuard } from "../hooks/use-record-close-guard"
import type { UnsavedChangesDialogProps } from "@/modules/shared/engines/common/navigation/use-unsaved-changes-guard"
import { useRecordNotices, type RecordNotices } from "../hooks/use-record-notices"

export type RecordPageSummaryMetric = {
  key?: string
  label: string
  value: ReactNode
}

export type RecordPageSummary = {
  metrics?: RecordPageSummaryMetric[]
  payload?: unknown
}

const EMPTY_SUMMARY: RecordPageSummary = {
  metrics: [],
}

function areSummaryMetricsEqual(
  left: RecordPageSummaryMetric[] | undefined,
  right: RecordPageSummaryMetric[] | undefined,
) {
  const leftMetrics = left ?? []
  const rightMetrics = right ?? []

  if (leftMetrics.length !== rightMetrics.length) {
    return false
  }

  return leftMetrics.every((metric, index) => {
    const candidate = rightMetrics[index]
    return (
      metric.key === candidate?.key &&
      metric.label === candidate?.label &&
      metric.value === candidate?.value
    )
  })
}

function areRecordPageSummariesEqual(left: RecordPageSummary, right: RecordPageSummary) {
  return areSummaryMetricsEqual(left.metrics, right.metrics) && left.payload === right.payload
}

export type RecordPageController = {
  notices: RecordNotices
  isDirty: boolean
  dirtySections: string[]
  isPrimarySectionOpen: boolean
  setIsDirty: (value: boolean) => void
  setDirtySections: (value: string[]) => void
  setPrimarySectionOpen: (value: boolean) => void
  togglePrimarySectionOpen: () => void
  summary: RecordPageSummary
  setSummary: (value: RecordPageSummary) => void
  closePage: () => void
  redirectToBack: () => void
  confirmNavigation: (action: () => void) => void
  dirtyLeaveDialogProps: UnsavedChangesDialogProps
}

export function useRecordPageController({
  backHref,
  dirtyMessage,
}: {
  backHref: string
  dirtyMessage: string
}): RecordPageController {
  const router = useRouter()
  const notices = useRecordNotices()
  const [dirtySections, setDirtySections] = useState<string[]>([])
  const [isPrimarySectionOpen, setPrimarySectionOpen] = useState(true)
  const [summary, setSummary] = useState<RecordPageSummary>(EMPTY_SUMMARY)
  const guard = useRecordCloseGuard({
    isDirty: dirtySections.length > 0,
    message:
      dirtySections.length > 0
        ? `${dirtyMessage}\n\nUnsaved sections: ${dirtySections.join(", ")}.`
        : dirtyMessage,
  })

  const setIsDirty = useCallback((value: boolean) => {
    setDirtySections((current) => {
      const next = value ? ["Record"] : []

      if (current.length === next.length && current.every((section, index) => section === next[index])) {
        return current
      }

      return next
    })
  }, [])

  const updateDirtySections = useCallback((value: string[]) => {
    setDirtySections((current) => {
      if (current.length === value.length && current.every((section, index) => section === value[index])) {
        return current
      }

      return value
    })
  }, [])

  const updateSummary = useCallback((value: RecordPageSummary) => {
    setSummary((current) => {
      if (areRecordPageSummariesEqual(current, value)) {
        return current
      }

      return value
    })
  }, [])

  const closePage = useCallback(() => {
    guard.confirmNavigation(() => {
      router.push(backHref, { scroll: false })
    })
  }, [backHref, guard, router])

  const redirectToBack = useCallback(() => {
    setIsDirty(false)
    router.push(backHref, { scroll: false })
  }, [backHref, router])

  const togglePrimarySectionOpen = useCallback(() => {
    setPrimarySectionOpen((current) => !current)
  }, [])

  return useMemo(
    () => ({
      notices,
      isDirty: dirtySections.length > 0,
      dirtySections,
      isPrimarySectionOpen,
      setIsDirty,
      setDirtySections: updateDirtySections,
      setPrimarySectionOpen,
      togglePrimarySectionOpen,
      summary,
      setSummary: updateSummary,
      closePage,
      redirectToBack,
      confirmNavigation: guard.confirmNavigation,
      dirtyLeaveDialogProps: guard.dialogProps,
    }),
    [
      closePage,
      dirtySections,
      guard.confirmNavigation,
      guard.dialogProps,
      isPrimarySectionOpen,
      notices,
      redirectToBack,
      setIsDirty,
      updateSummary,
      updateDirtySections,
      summary,
      togglePrimarySectionOpen,
    ],
  )
}
