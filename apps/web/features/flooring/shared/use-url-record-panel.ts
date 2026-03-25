"use client"

import { useCallback } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

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
