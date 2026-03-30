"use client"

import { useRecordEntryNavigation } from "@/features/shared/engines/common/record-entry"

export function useCanonicalDetailNavigation(basePath: string) {
  const navigation = useRecordEntryNavigation(basePath)

  return {
    returnTo: navigation.returnTo,
    buildHref: navigation.buildDetailHref,
    openRecord: navigation.openRecord,
  }
}
