"use client"

import { useMemo, useState } from "react"

export function useRecordPanelState<Row extends { id: string }, Draft>({
  rows,
  createDraft,
}: {
  rows: Row[]
  createDraft: (row: Row) => Draft
}) {
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null)
  const [activeDraft, setActiveDraft] = useState<Draft | null>(null)

  const activeRecord = useMemo(
    () => rows.find((row) => row.id === activeRecordId) ?? null,
    [rows, activeRecordId],
  )

  function openRecord(row: Row) {
    setActiveRecordId(row.id)
    setActiveDraft(createDraft(row))
  }

  function closeRecord() {
    setActiveRecordId(null)
    setActiveDraft(null)
  }

  return {
    activeRecordId,
    activeRecord,
    activeDraft,
    setActiveDraft,
    setActiveRecordId,
    openRecord,
    closeRecord,
  }
}
