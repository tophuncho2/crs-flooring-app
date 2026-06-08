"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { requestJson } from "@builders/lib"
import {
  clearCachedRecordDetail,
  getCachedRecordDetail,
  setCachedRecordDetail,
} from "./utils/record-detail-cache"
import { hasRecordDraftChanges } from "../hooks/use-record-dirty-state"

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
  reconcile,
}: {
  scope: string
  id: string
  initialRecord: TRecord
  toDraft?: (record: TRecord) => TDraft
  url: string
  payloadKey: string
  manageDraft?: boolean
  /**
   * Optional write-through sink for the canonical record. Whenever a fresh
   * server record lands (save publish, refresh, or patch) it's handed here so a
   * consumer can mirror it into an external store — e.g.
   * `queryClient.setQueryData([...DETAIL_KEY, id], record)` — keeping a
   * separately-rendered reference header in sync without a refetch or a full
   * page reload. Held in a ref so callers may pass an unmemoized closure.
   */
  reconcile?: (record: TRecord) => void
}) {
  if (manageDraft && !toDraft) {
    throw new Error("useRecordDetailController requires toDraft when manageDraft is enabled")
  }

  const reconcileRef = useRef(reconcile)
  useEffect(() => {
    reconcileRef.current = reconcile
  }, [reconcile])

  const cachedRecord = getCachedRecordDetail<TRecord>(scope, id, initialRecord.updatedAt)
  const seededRecord = cachedRecord ?? initialRecord
  const [record, setRecord] = useState<TRecord | null>(seededRecord)
  const [draft, setDraft] = useState<TDraft | null>(manageDraft && toDraft ? toDraft(seededRecord) : null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // The single reconciliation seam every fresh server record flows through:
  // update local state, persist to the updatedAt-keyed detail cache, and
  // write-through to the optional external sink.
  const commit = useCallback(
    (nextRecord: TRecord) => {
      setRecord(nextRecord)
      setCachedRecordDetail(scope, nextRecord.id, nextRecord.updatedAt, nextRecord)
      reconcileRef.current?.(nextRecord)
    },
    [scope],
  )

  const syncRecord = useCallback(
    (nextRecord: TRecord, options?: { syncDraft?: boolean }) => {
      commit(nextRecord)
      if (manageDraft && toDraft && options?.syncDraft !== false) {
        setDraft(toDraft(nextRecord))
      }
    },
    [commit, manageDraft, toDraft],
  )

  const publishRecord = useCallback((nextRecord: TRecord) => {
    syncRecord(nextRecord)
  }, [syncRecord])

  // Merge a partial server snapshot into the cached record without touching the
  // draft. Use for narrow reconciliations (e.g. refreshing derived cells after
  // a child-section mutation) where a full refetch would be wasteful and the
  // patched fields are not part of the section's editable form.
  const patchRecord = useCallback((partial: Partial<TRecord>) => {
    if (!record) return
    commit({ ...record, ...partial } as TRecord)
  }, [commit, record])

  const refreshRecord = useCallback(async () => {
    const payload = await requestJson<Record<string, TRecord>>(url)
    const nextRecord = payload[payloadKey]

    if (!nextRecord) {
      throw new Error(`Expected ${payloadKey} in response payload`)
    }

    syncRecord(nextRecord)
    return nextRecord
  }, [payloadKey, syncRecord, url])

  // Re-seed local state when the record *identity* changes (a true record swap)
  // — derived during render so the swap lands before paint instead of after a
  // post-commit effect. Deliberately keyed on id/recordId only, NOT updatedAt:
  // same-record updates are owned by the explicit publish/patch/refresh path
  // (which routes through `commit`), so a fresh `initialRecord` snapshot for the
  // same record must not re-trigger a reseed — that would clobber a preserved
  // draft and, when the reconcile sink feeds the seed query, loop.
  const [reseed, setReseed] = useState({
    id,
    recordId: initialRecord.id,
  })
  if (reseed.id !== id || reseed.recordId !== initialRecord.id) {
    setReseed({ id, recordId: initialRecord.id })
    const nextCachedRecord = getCachedRecordDetail<TRecord>(scope, id, initialRecord.updatedAt)
    const nextSeed = nextCachedRecord ?? initialRecord
    setRecord(nextSeed)
    setDraft(manageDraft && toDraft ? toDraft(nextSeed) : null)
    setLoading(false)
    setError("")
  }

  // Persist the active seed into the detail cache. External-store write (not
  // React state, so it's allowed in an effect); runs on mount and whenever the
  // record identity changes, mirroring the previous combined effect.
  useEffect(() => {
    const nextCachedRecord = getCachedRecordDetail<TRecord>(scope, id, initialRecord.updatedAt)
    const nextSeed = nextCachedRecord ?? initialRecord
    setCachedRecordDetail(scope, nextSeed.id, nextSeed.updatedAt, nextSeed)
  }, [id, initialRecord, scope])

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
