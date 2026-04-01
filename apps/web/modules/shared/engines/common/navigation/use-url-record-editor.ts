"use client"

import { useMemo, useState } from "react"
import { useUrlRecordPanel } from "./url-record-panel"

const CREATE_DRAFT_RECORD_ID = "__create__"

export function useUrlRecordEditor<Row extends { id: string }, Draft>({
  rows,
  paramKey,
  createDraft,
}: {
  rows: Row[]
  paramKey: string
  createDraft: (row: Row) => Draft
}) {
  const { activeRecordId, openRecord: openRecordById, closeRecord } = useUrlRecordPanel(paramKey)
  const [draftState, setDraftState] = useState<{ recordId: string; value: Draft } | null>(null)

  const activeRecord = useMemo(
    () => rows.find((row) => row.id === activeRecordId) ?? null,
    [activeRecordId, rows],
  )

  const draft = activeRecord
    ? draftState?.recordId === activeRecord.id
      ? draftState.value
      : createDraft(activeRecord)
    : draftState?.recordId === CREATE_DRAFT_RECORD_ID
      ? draftState.value
      : null

  function setDraft(next: Draft | ((current: Draft | null) => Draft | null)) {
    const currentDraft = draft
    const resolved =
      typeof next === "function"
        ? (next as (current: Draft | null) => Draft | null)(currentDraft)
        : next

    if (resolved === null) {
      setDraftState(null)
      return
    }

    setDraftState({
      recordId: activeRecordId ?? CREATE_DRAFT_RECORD_ID,
      value: resolved,
    })
  }

  function openRecord(row: Row) {
    setDraftState({
      recordId: row.id,
      value: createDraft(row),
    })
    openRecordById(row.id)
  }

  function closeEditor() {
    setDraftState(null)
    closeRecord()
  }

  return {
    activeRecordId,
    activeRecord,
    draft,
    setDraft,
    openRecord,
    closeRecord: closeEditor,
  }
}
