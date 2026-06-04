"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { RecordDetailClientScaffoldContext } from "../scaffolds/record-detail-client-scaffold"
import { useRecordScopedSectionController } from "./use-record-scoped-section-controller"

export function useSingleSectionCreateController<TLocal>({
  page,
  createInitialValue,
  isEqual,
  createRecord,
  manageDirtySections = true,
}: {
  page: RecordDetailClientScaffoldContext
  createInitialValue: () => TLocal
  isEqual?: (left: TLocal, right: TLocal) => boolean
  createRecord: (localValue: TLocal) => Promise<{
    redirectTo: string
    noticeMessage?: string
  }>
  manageDirtySections?: boolean
}) {
  const router = useRouter()
  // Compute the create-form seed once (lazy init); stable for the mount's
  // lifetime, read safely during render without touching a ref.
  const [initialValue] = useState<TLocal>(createInitialValue)

  const primarySection = useRecordScopedSectionController<TLocal, TLocal>({
    recordId: "create",
    sectionKey: "primary",
    serverValue: initialValue,
    serverRevisionKey: "create",
    createLocalValue: (serverValue) => serverValue,
    persistDraft: false,
    isEqual,
    onSave: async (localValue) => {
      const result = await createRecord(localValue)
      page.setDirtySections([])
      router.push(result.redirectTo, { scroll: false })

      return {
        serverValue: localValue,
        serverRevisionKey: "saved",
        noticeMessage: result.noticeMessage,
      }
    },
  })

  useEffect(() => {
    if (!manageDirtySections) {
      return
    }

    page.setDirtySections(primarySection.isDirty ? ["primary"] : [])
  }, [manageDirtySections, page, primarySection.isDirty])

  return {
    page,
    primarySection,
  }
}
