"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  normalizeRecordSectionError,
  type RecordSectionError,
} from "@/types/record/section-error"

type MaybeUpdater<T> = T | ((previous: T) => T)
type PendingServerState<T> = {
  value: T
  revisionKey: string
}

/**
 * Carried forward from a successful save into the next reconciliation. Lets
 * sections that hold session-scoped per-row metadata (picker option caches,
 * UI-only flags, etc.) migrate keys from a row's optimistic clientId to the
 * server-stamped id. Empty when the save did not produce any new ids.
 */
export type RecordSectionReconcileInfo = {
  tempIdMap: Record<string, string>
}

export type RecordSectionSaveResult<T> =
  | void
  | T
  | {
      serverValue: T
      serverRevisionKey?: string
      noticeMessage?: string
      /**
       * Optional id reconciliation map produced by the save. Engine forwards
       * to `onReconcile` so consumers can migrate session-scoped state from
       * the optimistic clientIds to the server-stamped ids in lockstep with
       * the local-value rebuild.
       */
      tempIdMap?: Record<string, string>
    }

function defaultIsEqual<T>(left: T, right: T) {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function useRecordSectionController<TServer, TLocal>({
  serverValue,
  serverRevisionKey,
  createLocalValue,
  isEqual,
  onSave,
  onReconcile,
}: {
  serverValue: TServer
  serverRevisionKey: string
  createLocalValue: (serverValue: TServer) => TLocal
  isEqual?: (left: TLocal, right: TLocal) => boolean
  onSave?: (
    localValue: TLocal,
    serverValue: TServer,
    serverRevisionKey: string,
  ) => Promise<RecordSectionSaveResult<TServer>>
  /**
   * Fires synchronously when the engine rebuilds local state from a save
   * response (NOT for external `replaceFromServer` calls or conflict syncs).
   * Receives the `tempIdMap` returned by the consumer's `onSave`. Use this to
   * migrate session-scoped per-row state from optimistic clientIds to the
   * server-stamped ids before the next render.
   */
  onReconcile?: (info: RecordSectionReconcileInfo) => void
}) {
  const compare = isEqual ?? defaultIsEqual
  const [baselineServerValue, setBaselineServerValue] = useState(serverValue)
  const [baselineRevisionKey, setBaselineRevisionKey] = useState(serverRevisionKey)
  const [localValue, setLocalValueState] = useState<TLocal>(() => createLocalValue(serverValue))
  const [saving, setSaving] = useState(false)
  const [error, setErrorState] = useState<RecordSectionError | null>(null)
  const [noticeMessage, setNoticeMessage] = useState("")
  const [noticeError, setNoticeError] = useState("")
  const [hasConflict, setHasConflict] = useState(false)
  const [pendingServerState, setPendingServerState] = useState<PendingServerState<TServer> | null>(null)
  const baselineServerValueRef = useRef(baselineServerValue)
  const baselineRevisionKeyRef = useRef(baselineRevisionKey)
  const localValueRef = useRef(localValue)
  const pendingServerStateRef = useRef<PendingServerState<TServer> | null>(null)
  const savingRef = useRef(false)
  const awaitingAuthoritativeSyncRef = useRef(false)

  useEffect(() => {
    baselineServerValueRef.current = baselineServerValue
  }, [baselineServerValue])

  useEffect(() => {
    baselineRevisionKeyRef.current = baselineRevisionKey
  }, [baselineRevisionKey])

  useEffect(() => {
    localValueRef.current = localValue
  }, [localValue])

  useEffect(() => {
    pendingServerStateRef.current = pendingServerState
  }, [pendingServerState])

  const baselineLocalValue = useMemo(
    () => createLocalValue(baselineServerValue),
    [baselineServerValue, createLocalValue],
  )
  const isDirty = useMemo(() => !compare(localValue, baselineLocalValue), [baselineLocalValue, compare, localValue])

  useEffect(() => {
    if (serverRevisionKey === baselineRevisionKeyRef.current) {
      return
    }

    if (savingRef.current) {
      setPendingServerState({
        value: serverValue,
        revisionKey: serverRevisionKey,
      })
      return
    }

    if (awaitingAuthoritativeSyncRef.current) {
      awaitingAuthoritativeSyncRef.current = false
      setBaselineServerValue(serverValue)
      setBaselineRevisionKey(serverRevisionKey)
      setLocalValueState(createLocalValue(serverValue))
      setPendingServerState(null)
      setHasConflict(false)
      setError(null)
      return
    }

    if (!compare(localValueRef.current, createLocalValue(baselineServerValueRef.current))) {
      setPendingServerState({
        value: serverValue,
        revisionKey: serverRevisionKey,
      })
      setHasConflict(true)
      return
    }

    setBaselineServerValue(serverValue)
    setBaselineRevisionKey(serverRevisionKey)
    setLocalValueState(createLocalValue(serverValue))
    setPendingServerState(null)
    setHasConflict(false)
    setError(null)
  }, [compare, createLocalValue, serverRevisionKey, serverValue])

  const setLocalValue = useCallback((value: MaybeUpdater<TLocal>) => {
    setLocalValueState((previous) => {
      const nextValue =
        typeof value === "function" ? (value as (previous: TLocal) => TLocal)(previous) : value
      localValueRef.current = nextValue
      return nextValue
    })
    setNoticeMessage("")
    setNoticeError("")
  }, [])

  const setError = useCallback((value: RecordSectionError | string | Error | null) => {
    setErrorState(value ? normalizeRecordSectionError(value) : null)
  }, [])

  const clearNotices = useCallback(() => {
    setNoticeMessage("")
    setNoticeError("")
  }, [])

  const showSuccess = useCallback((value: string) => {
    setNoticeMessage(value)
    setNoticeError("")
  }, [])

  const showError = useCallback((value: string) => {
    setNoticeError(value)
    setNoticeMessage("")
  }, [])

  const onReconcileRef = useRef(onReconcile)
  useEffect(() => {
    onReconcileRef.current = onReconcile
  }, [onReconcile])

  const replaceFromServer = useCallback(
    (
      nextServerValue: TServer,
      nextServerRevisionKey: string = serverRevisionKey,
      reconcileInfo?: RecordSectionReconcileInfo,
    ) => {
      awaitingAuthoritativeSyncRef.current = false
      setBaselineServerValue(nextServerValue)
      setBaselineRevisionKey(nextServerRevisionKey)
      setLocalValueState(createLocalValue(nextServerValue))
      setPendingServerState(null)
      setHasConflict(false)
      setError(null)
      if (reconcileInfo) {
        onReconcileRef.current?.(reconcileInfo)
      }
    },
    [createLocalValue, serverRevisionKey],
  )

  const discard = useCallback(() => {
    clearNotices()
    const nextPendingServerState = pendingServerStateRef.current
    if (nextPendingServerState) {
      replaceFromServer(nextPendingServerState.value, nextPendingServerState.revisionKey)
      return
    }

    replaceFromServer(baselineServerValueRef.current, baselineRevisionKeyRef.current)
  }, [clearNotices, replaceFromServer])

  const save = useCallback(async () => {
    if (!onSave || savingRef.current) {
      return false
    }

    setSaving(true)
    savingRef.current = true
    setError(null)
    clearNotices()

    try {
      const saveResult = await onSave(
        localValueRef.current,
        baselineServerValueRef.current,
        baselineRevisionKeyRef.current,
      )

      if (saveResult && typeof saveResult === "object" && "serverValue" in saveResult) {
        replaceFromServer(
          saveResult.serverValue,
          saveResult.serverRevisionKey ?? baselineRevisionKeyRef.current,
          { tempIdMap: saveResult.tempIdMap ?? {} },
        )
        if (saveResult.noticeMessage) {
          showSuccess(saveResult.noticeMessage)
        }
        return true
      }

      if (saveResult !== undefined) {
        replaceFromServer(saveResult, baselineRevisionKeyRef.current)
        return true
      }

      const nextPendingServerState = pendingServerStateRef.current
      if (nextPendingServerState && nextPendingServerState.revisionKey !== baselineRevisionKeyRef.current) {
        replaceFromServer(nextPendingServerState.value, nextPendingServerState.revisionKey)
        return true
      }

      awaitingAuthoritativeSyncRef.current = true
      return true
    } catch (saveError) {
      awaitingAuthoritativeSyncRef.current = false
      setErrorState(
        normalizeRecordSectionError(saveError, {
          defaultMessage: "Failed to save section",
        }),
      )
      return false
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }, [clearNotices, onSave, replaceFromServer, showSuccess])

  return {
    localValue,
    setLocalValue,
    isDirty,
    isSaving: saving,
    error,
    setError,
    noticeMessage,
    noticeError,
    clearNotices,
    showSuccess,
    showError,
    hasConflict,
    pendingServerValue: pendingServerState?.value ?? null,
    pendingServerRevisionKey: pendingServerState?.revisionKey ?? null,
    replaceFromServer,
    discard,
    save,
  }
}
