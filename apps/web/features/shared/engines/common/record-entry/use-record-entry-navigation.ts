"use client"

import { useCallback, useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  buildCurrentRecordEntryPath,
  buildRecordCreateHref,
  buildRecordDetailHref,
} from "./routes"

export function useRecordEntryNavigation(basePath: string) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const returnTo = useMemo(
    () => buildCurrentRecordEntryPath(pathname, searchParams),
    [pathname, searchParams],
  )

  const buildDetailHref = useCallback(
    (recordId: string, nextReturnTo?: string | null) =>
      buildRecordDetailHref(basePath, recordId, nextReturnTo ?? returnTo),
    [basePath, returnTo],
  )

  const buildCreateHref = useCallback(
    (params?: Record<string, string | null | undefined>) =>
      buildRecordCreateHref(basePath, { returnTo, params }),
    [basePath, returnTo],
  )

  const openRecord = useCallback(
    (recordId: string, nextReturnTo?: string | null) => {
      router.push(buildDetailHref(recordId, nextReturnTo), { scroll: false })
    },
    [buildDetailHref, router],
  )

  const openCreate = useCallback(
    (params?: Record<string, string | null | undefined>) => {
      router.push(buildCreateHref(params), { scroll: false })
    },
    [buildCreateHref, router],
  )

  return {
    returnTo,
    buildDetailHref,
    buildCreateHref,
    openRecord,
    openCreate,
  }
}
