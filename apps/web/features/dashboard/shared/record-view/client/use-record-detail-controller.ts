"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { requestJson } from "@builders/lib"
import {
  clearCachedRecordDetail,
  getCachedRecordDetail,
  setCachedRecordDetail,
} from "@/features/dashboard/shared/record-view/client/record-detail-cache"
import { hasRecordDraftChanges } from "@/features/dashboard/shared/record-view/client/use-record-dirty-state"

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
}: {
  scope: string
  id: string
  initialRecord: TRecord
  toDraft: (record: TRecord) => TDraft
  url: string
  payloadKey: string
}) {
  const cachedRecord = getCachedRecordDetail<TRecord>(scope, id, initialRecord.updatedAt)
  const seededRecord = cachedRecord ?? initialRecord
  const [record, setRecord] = useState<TRecord | null>(seededRecord)
  const [draft, setDraft] = useState<TDraft | null>(toDraft(seededRecord))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const syncRecord = useCallback(
    (nextRecord: TRecord, options?: { syncDraft?: boolean }) => {
      setRecord(nextRecord)
      if (options?.syncDraft !== false) {
        setDraft(toDraft(nextRecord))
      }
      setCachedRecordDetail(scope, nextRecord.id, nextRecord.updatedAt, nextRecord)
    },
    [scope, toDraft],
  )

  const publishRecord = useCallback((nextRecord: TRecord) => {
    syncRecord(nextRecord)
  }, [syncRecord])

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
    const nextSeed = cachedRecord ?? initialRecord
    setRecord(nextSeed)
    setDraft(toDraft(nextSeed))
    setLoading(false)
    setError("")
    setCachedRecordDetail(scope, nextSeed.id, nextSeed.updatedAt, nextSeed)
  }, [cachedRecord, id, initialRecord, scope, toDraft])

  const clearRecordCache = useCallback(() => {
    clearCachedRecordDetail(scope, id)
  }, [id, scope])

  const isDirty = useMemo(() => hasRecordDraftChanges(record, draft, toDraft), [draft, record, toDraft])

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
    syncRecord,
    refreshRecord,
    clearRecordCache,
    isDirty,
  }
}
