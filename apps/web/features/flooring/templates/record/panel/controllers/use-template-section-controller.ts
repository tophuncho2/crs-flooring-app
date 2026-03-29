"use client"

import { useEffect, useMemo, useRef } from "react"
import {
  buildRecordSectionDraftKey,
  clearRecordSectionDraft,
  readRecordSectionDraft,
  writeRecordSectionDraft,
  useRecordSectionController,
  type RecordSectionSaveResult,
} from "@/features/shared/engines/record-view"

export function useTemplateSectionController<TServer, TLocal>({
  currentUserId,
  templateId,
  section,
  serverValue,
  serverRevisionKey,
  createLocalValue,
  cloneLocalValue,
  isEqual,
  onSave,
}: {
  currentUserId: string
  templateId: string
  section: "primary" | "material" | "service" | "sales"
  serverValue: TServer
  serverRevisionKey: string
  createLocalValue: (serverValue: TServer) => TLocal
  cloneLocalValue: (value: TLocal) => TLocal
  isEqual?: (left: TLocal, right: TLocal) => boolean
  onSave?: (
    localValue: TLocal,
    serverValue: TServer,
    serverRevisionKey: string,
  ) => Promise<RecordSectionSaveResult<TServer>>
}) {
  const controller = useRecordSectionController<TServer, TLocal>({
    serverValue,
    serverRevisionKey,
    createLocalValue,
    isEqual,
    onSave,
  })

  const draftKey = useMemo(
    () => buildRecordSectionDraftKey({ userId: currentUserId, recordId: templateId, section }),
    [currentUserId, section, templateId],
  )
  const hasRestoredDraftRef = useRef(false)
  const { isDirty, localValue, setLocalValue } = controller

  useEffect(() => {
    if (hasRestoredDraftRef.current) {
      return
    }

    hasRestoredDraftRef.current = true
    const storedDraft = readRecordSectionDraft<TLocal>(draftKey)
    if (storedDraft) {
      setLocalValue(cloneLocalValue(storedDraft))
    }
  }, [cloneLocalValue, draftKey, setLocalValue])

  useEffect(() => {
    if (isDirty) {
      writeRecordSectionDraft(draftKey, localValue)
      return
    }

    clearRecordSectionDraft(draftKey)
  }, [draftKey, isDirty, localValue])

  return controller
}
