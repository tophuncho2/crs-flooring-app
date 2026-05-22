"use client"

import { useCallback, useMemo } from "react"
import { useUrlRecordEditor } from "./use-url-record-editor"
import { useUnsavedChangesGuard } from "./use-unsaved-changes-guard"

function areDraftsEqual<T>(left: T | null, right: T | null) {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function useGuardedUrlRecordEditor<Row extends { id: string }, Draft>({
  rows,
  paramKey,
  createDraft,
  message,
}: {
  rows: Row[]
  paramKey: string
  createDraft: (row: Row) => Draft
  message?: string
}) {
  const editor = useUrlRecordEditor({
    rows,
    paramKey,
    createDraft,
  })

  const baselineDraft = useMemo(
    () => (editor.activeRecord ? createDraft(editor.activeRecord) : null),
    [createDraft, editor.activeRecord],
  )

  const isDirty = editor.activeRecord ? !areDraftsEqual(editor.draft, baselineDraft) : false
  const guard = useUnsavedChangesGuard({ isDirty, message })

  const openRecord = useCallback(
    (row: Row) => {
      if (editor.activeRecordId === row.id) {
        return
      }

      guard.confirmNavigation(() => editor.openRecord(row))
    },
    [editor, guard],
  )

  const closeRecord = useCallback(() => {
    guard.confirmNavigation(() => editor.closeRecord())
  }, [editor, guard])

  return {
    ...editor,
    openRecord,
    closeRecord,
    isDirty,
    confirmNavigation: guard.confirmNavigation,
  }
}
