"use client"

import { useCallback } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useUnsavedChangesGuard } from "./use-unsaved-changes-guard"

export function useUrlRecordPanel(paramKey: string) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const activeRecordId = searchParams.get(paramKey)

  const updateParam = useCallback(
    (value: string | null) => {
      const nextParams = new URLSearchParams(searchParams.toString())
      if (value) {
        nextParams.set(paramKey, value)
      } else {
        nextParams.delete(paramKey)
      }

      const query = nextParams.toString()
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [paramKey, pathname, router, searchParams],
  )

  const openRecord = useCallback((recordId: string) => updateParam(recordId), [updateParam])
  const closeRecord = useCallback(() => updateParam(null), [updateParam])

  return {
    activeRecordId,
    openRecord,
    closeRecord,
  }
}

export function useGuardedUrlRecordPanel(
  paramKey: string,
  options: {
    isDirty: boolean
    message?: string
  },
) {
  const panel = useUrlRecordPanel(paramKey)
  const guard = useUnsavedChangesGuard(options)

  const openRecord = useCallback(
    (recordId: string) => {
      if (panel.activeRecordId === recordId) {
        return true
      }

      return guard.confirmNavigation(() => panel.openRecord(recordId))
    },
    [guard, panel],
  )

  const closeRecord = useCallback(() => guard.confirmNavigation(() => panel.closeRecord()), [guard, panel])

  return {
    ...panel,
    openRecord,
    closeRecord,
    confirmNavigation: guard.confirmNavigation,
    isDirty: guard.isDirty,
  }
}
