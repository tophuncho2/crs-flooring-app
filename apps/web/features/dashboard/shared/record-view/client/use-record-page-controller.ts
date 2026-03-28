"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { useRecordCloseGuard } from "@/features/dashboard/shared/record-view/client/use-record-close-guard"
import { useRecordNotices, type RecordNotices } from "@/features/dashboard/shared/record-view/client/use-record-notices"

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
  setIsDirty: (value: boolean) => void
  setDirtySections: (value: string[]) => void
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
  const [summary, setSummary] = useState<RecordPageSummary>(EMPTY_SUMMARY)
  const guard = useRecordCloseGuard({
    isDirty: dirtySections.length > 0,
    message:
      dirtySections.length > 0
        ? `${dirtyMessage}\n\nUnsaved sections: ${dirtySections.join(", ")}.`
        : dirtyMessage,
  })

  const setIsDirty = useCallback((value: boolean) => {
    setDirtySections(value ? ["Record"] : [])
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

  return {
    notices,
    isDirty: dirtySections.length > 0,
    dirtySections,
    setIsDirty,
    setDirtySections,
    summary,
    setSummary,
    closePage,
    redirectToBack,
    confirmNavigation: guard.confirmNavigation,
  }
}
