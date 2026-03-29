"use client"

import { useState } from "react"

type CachedRecord = {
  id: string
  updatedAt: string
}

export function hasRecordDraftChanges<TRecord extends CachedRecord, TDraft>(
  record: TRecord | null,
  draft: TDraft | null,
  toDraft: (record: TRecord) => TDraft,
) {
  if (!record || !draft) {
    return false
  }

  return JSON.stringify(draft) !== JSON.stringify(toDraft(record))
}

export function useRecordDirtyState(initialValue = false) {
  const [isDirty, setIsDirty] = useState(initialValue)

  return {
    isDirty,
    setIsDirty,
  }
}
