"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import type { RecordDetailClientScaffoldContext } from "./record-detail-client-scaffold"
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
  const initialValueRef = useRef<TLocal | null>(null)

  if (initialValueRef.current === null) {
    initialValueRef.current = createInitialValue()
  }

  const primarySection = useRecordScopedSectionController<TLocal, TLocal>({
    recordId: "create",
    sectionKey: "primary",
    serverValue: initialValueRef.current,
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
