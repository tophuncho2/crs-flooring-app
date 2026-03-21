"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { requestJson } from "./http"
import { clearCachedRecordDetail, getCachedRecordDetail, setCachedRecordDetail } from "./record-detail-cache"

type CachedRecord = {
  id: string
  updatedAt: string
}

function hasDraftChanges<TRecord extends CachedRecord, TDraft>(
  record: TRecord | null,
  draft: TDraft | null,
  toDraft: (record: TRecord) => TDraft,
) {
  if (!record || !draft) {
    return false
  }

  return JSON.stringify(draft) !== JSON.stringify(toDraft(record))
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
  const [record, setRecord] = useState<TRecord | null>(cachedRecord ?? initialRecord)
  const [draft, setDraft] = useState<TDraft | null>(toDraft(cachedRecord ?? initialRecord))
  const [loading, setLoading] = useState(!cachedRecord)
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
    if (cachedRecord) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setError("")

      try {
        const nextRecord = await refreshRecord()
        if (cancelled) return
        setRecord(nextRecord)
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : `Failed to load ${scope}`)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [cachedRecord, refreshRecord, scope])

  const clearRecordCache = useCallback(() => {
    clearCachedRecordDetail(scope, id)
  }, [id, scope])

  const isDirty = useMemo(() => hasDraftChanges(record, draft, toDraft), [draft, record, toDraft])

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
