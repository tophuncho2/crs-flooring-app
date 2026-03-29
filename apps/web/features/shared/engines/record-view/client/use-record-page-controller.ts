"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useRecordCloseGuard } from "./use-record-close-guard"
import { useRecordNotices, type RecordNotices } from "./use-record-notices"

type SummaryLine = {
  quantity: string
  unitPrice: string
}

type RecordPageSummary = {
  materialItems: SummaryLine[]
  serviceItems: SummaryLine[]
}

const EMPTY_SUMMARY: RecordPageSummary = {
  materialItems: [],
  serviceItems: [],
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
      setDirtySections,
      setPrimarySectionOpen,
      togglePrimarySectionOpen,
      summary,
      setSummary,
      closePage,
      redirectToBack,
      confirmNavigation: guard.confirmNavigation,
    }),
    [
      closePage,
      dirtySections,
      guard.confirmNavigation,
      isPrimarySectionOpen,
      notices,
      redirectToBack,
      setIsDirty,
      summary,
      togglePrimarySectionOpen,
    ],
  )
}
