"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { useRecordNotices } from "../use-record-notices"
import { useUnsavedChangesGuard } from "./use-unsaved-changes-guard"

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

export function useRecordPageController({
  backHref,
  dirtyMessage,
}: {
  backHref: string
  dirtyMessage: string
}) {
  const router = useRouter()
  const notices = useRecordNotices()
  const [isDirty, setIsDirty] = useState(false)
  const [summary, setSummary] = useState<RecordPageSummary>(EMPTY_SUMMARY)
  const guard = useUnsavedChangesGuard({
    isDirty,
    message: dirtyMessage,
  })

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
    isDirty,
    setIsDirty,
    summary,
    setSummary,
    closePage,
    redirectToBack,
    confirmNavigation: guard.confirmNavigation,
  }
}
