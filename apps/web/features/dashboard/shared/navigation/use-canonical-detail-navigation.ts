"use client"

import { useCallback, useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { buildCanonicalDetailHref, buildCurrentPath } from "@/features/dashboard/shared/navigation/detail-routes"

export function useCanonicalDetailNavigation(basePath: string) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const returnTo = useMemo(
    () => buildCurrentPath(pathname, searchParams),
    [pathname, searchParams],
  )

  const buildHref = useCallback(
    (recordId: string) => buildCanonicalDetailHref(basePath, recordId, returnTo),
    [basePath, returnTo],
  )

  const openRecord = useCallback(
    (recordId: string) => {
      router.push(buildHref(recordId), { scroll: false })
    },
    [buildHref, router],
  )

  return {
    returnTo,
    buildHref,
    openRecord,
  }
}
