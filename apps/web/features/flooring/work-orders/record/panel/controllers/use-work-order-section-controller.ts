"use client"

import { useEffect, useMemo, useRef } from "react"
import {
  buildRecordSectionDraftKey,
  clearRecordSectionDraft,
  readRecordSectionDraft,
  writeRecordSectionDraft,
  useRecordSectionController,
} from "@/features/shared/engines/record-view"

export function useWorkOrderSectionController<TServer, TLocal>({
  currentUserId,
  workOrderId,
  section,
  serverValue,
  serverRevisionKey,
  createLocalValue,
  cloneLocalValue,
  isEqual,
  onSave,
}: {
  currentUserId: string
  workOrderId: string
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
  ) => Promise<
    | void
    | TServer
    | {
        serverValue: TServer
        serverRevisionKey?: string
      }
  >
}) {
  const controller = useRecordSectionController<TServer, TLocal>({
    serverValue,
    serverRevisionKey,
    createLocalValue,
    isEqual,
    onSave,
  })

  const draftKey = useMemo(
    () => buildRecordSectionDraftKey({ userId: currentUserId, recordId: workOrderId, section }),
    [currentUserId, section, workOrderId],
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
