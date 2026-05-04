"use client"

import { useEffect, useMemo, useRef } from "react"
import {
  buildRecordSectionDraftKey,
  clearRecordSectionDraft,
  readRecordSectionDraft,
  writeRecordSectionDraft,
} from "./utils/record-section-drafts"
import {
  useRecordSectionController,
  type RecordSectionReconcileInfo,
  type RecordSectionSaveResult,
} from "./use-record-section-controller"

export type {
  RecordSectionReconcileInfo,
  RecordSectionSaveResult,
} from "./use-record-section-controller"

export type RecordScopedSectionControllerPolicy = {
  addRowPlacement?: "top" | "bottom"
  childRows?: "none" | "inline"
}

export function useRecordScopedSectionController<TServer, TLocal>({
  currentUserId,
  recordId,
  sectionKey,
  serverValue,
  serverRevisionKey,
  createLocalValue,
  cloneLocalValue,
  isEqual,
  validateBeforeSave,
  onSave,
  onReconcile,
  persistDraft = Boolean(currentUserId && cloneLocalValue),
  policy,
}: {
  currentUserId?: string
  recordId: string
  sectionKey: string
  serverValue: TServer
  serverRevisionKey: string
  createLocalValue: (serverValue: TServer) => TLocal
  cloneLocalValue?: (value: TLocal) => TLocal
  isEqual?: (left: TLocal, right: TLocal) => boolean
  validateBeforeSave?: (localValue: TLocal, serverValue: TServer) => void
  onSave?: (
    localValue: TLocal,
    serverValue: TServer,
    serverRevisionKey: string,
  ) => Promise<RecordSectionSaveResult<TServer>>
  /**
   * Fired when the engine rebuilds local state after a successful save.
   * Receives the `tempIdMap` returned by `onSave`. Use to migrate
   * session-scoped per-row state (picker option caches, UI flags) from
   * optimistic clientIds to the new server-stamped ids.
   */
  onReconcile?: (info: RecordSectionReconcileInfo) => void
  persistDraft?: boolean
  policy?: RecordScopedSectionControllerPolicy
}) {
  const controller = useRecordSectionController<TServer, TLocal>({
    serverValue,
    serverRevisionKey,
    createLocalValue,
    isEqual,
    onSave: async (localValue, currentServerValue, currentServerRevisionKey) => {
      validateBeforeSave?.(localValue, currentServerValue)
      return onSave?.(localValue, currentServerValue, currentServerRevisionKey)
    },
    onReconcile,
  })

  const draftKey = useMemo(() => {
    if (!persistDraft || !currentUserId || !cloneLocalValue) {
      return null
    }

    return buildRecordSectionDraftKey({
      userId: currentUserId,
      recordId,
      section: sectionKey,
    })
  }, [cloneLocalValue, currentUserId, persistDraft, recordId, sectionKey])

  const hasRestoredDraftRef = useRef(false)

  useEffect(() => {
    if (!draftKey || !cloneLocalValue || hasRestoredDraftRef.current) {
      return
    }

    hasRestoredDraftRef.current = true
    const storedDraft = readRecordSectionDraft<TLocal>(draftKey)
    if (storedDraft) {
      controller.setLocalValue(cloneLocalValue(storedDraft))
    }
  }, [cloneLocalValue, controller, draftKey])

  useEffect(() => {
    if (!draftKey) {
      return
    }

    if (controller.isDirty) {
      writeRecordSectionDraft(draftKey, controller.localValue)
      return
    }

    clearRecordSectionDraft(draftKey)
  }, [controller.isDirty, controller.localValue, draftKey])

  return {
    ...controller,
    recordId,
    sectionKey,
    policy: {
      addRowPlacement: policy?.addRowPlacement ?? "top",
      childRows: policy?.childRows ?? "none",
    },
  }
}
