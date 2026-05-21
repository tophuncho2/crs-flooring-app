"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { requestJson } from "@builders/lib"
import {
  clearCachedRecordDetail,
  getCachedRecordDetail,
  setCachedRecordDetail,
} from "./utils/record-detail-cache"
import { hasRecordDraftChanges } from "@/hooks/record/use-record-dirty-state"

type CachedRecord = {
  id: string
  updatedAt: string
}

export function useRecordDetailController<TRecord extends CachedRecord, TDraft>({
  scope,
  id,
  initialRecord,
  toDraft,
  url,
  payloadKey,
  manageDraft = true,
}: {
  scope: string
  id: string
  initialRecord: TRecord
  toDraft?: (record: TRecord) => TDraft
  url: string
  payloadKey: string
  manageDraft?: boolean
}) {
  if (manageDraft && !toDraft) {
    throw new Error("useRecordDetailController requires toDraft when manageDraft is enabled")
  }

  const cachedRecord = getCachedRecordDetail<TRecord>(scope, id, initialRecord.updatedAt)
  const seededRecord = cachedRecord ?? initialRecord
  const [record, setRecord] = useState<TRecord | null>(seededRecord)
  const [draft, setDraft] = useState<TDraft | null>(manageDraft && toDraft ? toDraft(seededRecord) : null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const syncRecord = useCallback(
    (nextRecord: TRecord, options?: { syncDraft?: boolean }) => {
      setRecord(nextRecord)
      if (manageDraft && toDraft && options?.syncDraft !== false) {
        setDraft(toDraft(nextRecord))
      }
      setCachedRecordDetail(scope, nextRecord.id, nextRecord.updatedAt, nextRecord)
    },
    [manageDraft, scope, toDraft],
  )

  const publishRecord = useCallback((nextRecord: TRecord) => {
    syncRecord(nextRecord)
  }, [syncRecord])

  // Merge a partial server snapshot into the cached record without touching the
  // draft. Use for narrow reconciliations (e.g. refreshing derived cells after
  // a child-section mutation) where a full refetch would be wasteful and the
  // patched fields are not part of the section's editable form.
  const patchRecord = useCallback((partial: Partial<TRecord>) => {
    setRecord((previous) => {
      if (!previous) return previous
      const next = { ...previous, ...partial } as TRecord
      setCachedRecordDetail(scope, next.id, next.updatedAt, next)
      return next
    })
  }, [scope])

  const refreshRecord = useCallback(async () => {
    const payload = await requestJson<Record<string, TRecord>>(url)
    const nextRecord = payload[payloadKey]

    if (!nextRecord) {
      throw new Error(`Expected ${payloadKey} in response payload`)
    }

    syncRecord(nextRecord)
    return nextRecord
  }, [payloadKey, syncRecord, url])

  useEffect(() => {
    const nextCachedRecord = getCachedRecordDetail<TRecord>(scope, id, initialRecord.updatedAt)
    const nextSeed = nextCachedRecord ?? initialRecord
    setRecord(nextSeed)
    setDraft(manageDraft && toDraft ? toDraft(nextSeed) : null)
    setLoading(false)
    setError("")
    setCachedRecordDetail(scope, nextSeed.id, nextSeed.updatedAt, nextSeed)
  }, [id, initialRecord.id, initialRecord.updatedAt, manageDraft, scope, toDraft])

  const clearRecordCache = useCallback(() => {
    clearCachedRecordDetail(scope, id)
  }, [id, scope])

  const isDirty = useMemo(
    () => (manageDraft && toDraft ? hasRecordDraftChanges(record, draft, toDraft) : false),
    [draft, manageDraft, record, toDraft],
  )

  return {
    cachedRecord,
    record,
    setRecord,
    draft,
    setDraft,
    loading,
    error,
    setError,
    publishRecord,
    patchRecord,
    syncRecord,
    refreshRecord,
    clearRecordCache,
    isDirty,
  }
}
