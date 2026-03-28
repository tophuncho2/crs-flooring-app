"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

type MaybeUpdater<T> = T | ((previous: T) => T)

function defaultIsEqual<T>(left: T, right: T) {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function useRecordSectionController<TServer, TLocal>({
  serverValue,
  createLocalValue,
  isEqual,
  onSave,
}: {
  serverValue: TServer
  createLocalValue: (serverValue: TServer) => TLocal
  isEqual?: (left: TLocal, right: TLocal) => boolean
  onSave?: (localValue: TLocal, serverValue: TServer) => Promise<TServer>
}) {
  const compare = isEqual ?? defaultIsEqual
  const [baselineServerValue, setBaselineServerValue] = useState(serverValue)
  const [localValue, setLocalValueState] = useState<TLocal>(() => createLocalValue(serverValue))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasConflict, setHasConflict] = useState(false)
  const [pendingServerValue, setPendingServerValue] = useState<TServer | null>(null)
  const baselineServerValueRef = useRef(baselineServerValue)
  const localValueRef = useRef(localValue)

  useEffect(() => {
    baselineServerValueRef.current = baselineServerValue
  }, [baselineServerValue])

  useEffect(() => {
    localValueRef.current = localValue
  }, [localValue])

  const baselineLocalValue = useMemo(
    () => createLocalValue(baselineServerValue),
    [baselineServerValue, createLocalValue],
  )
  const isDirty = useMemo(() => !compare(localValue, baselineLocalValue), [baselineLocalValue, compare, localValue])

  useEffect(() => {
    const baselineChanged = !Object.is(serverValue, baselineServerValueRef.current)
    if (!baselineChanged) {
      return
    }

    if (!compare(localValueRef.current, createLocalValue(baselineServerValueRef.current))) {
      setPendingServerValue(serverValue)
      setHasConflict(true)
      return
    }

    setBaselineServerValue(serverValue)
    setLocalValueState(createLocalValue(serverValue))
    setPendingServerValue(null)
    setHasConflict(false)
    setError(null)
  }, [compare, createLocalValue, serverValue])

  const setLocalValue = useCallback((value: MaybeUpdater<TLocal>) => {
    setLocalValueState((previous) => (typeof value === "function" ? (value as (previous: TLocal) => TLocal)(previous) : value))
  }, [])

  const replaceFromServer = useCallback(
    (nextServerValue: TServer) => {
      setBaselineServerValue(nextServerValue)
      setLocalValueState(createLocalValue(nextServerValue))
      setPendingServerValue(null)
      setHasConflict(false)
      setError(null)
    },
    [createLocalValue],
  )

  const discard = useCallback(() => {
    const nextServerValue = pendingServerValue ?? baselineServerValueRef.current
    replaceFromServer(nextServerValue)
  }, [pendingServerValue, replaceFromServer])

  const save = useCallback(async () => {
    if (!onSave) {
      return false
    }

    setSaving(true)
    setError(null)

    try {
      const nextServerValue = await onSave(localValueRef.current, baselineServerValueRef.current)
      replaceFromServer(nextServerValue)
      return true
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save section")
      return false
    } finally {
      setSaving(false)
    }
  }, [onSave, replaceFromServer])

  return {
    localValue,
    setLocalValue,
    isDirty,
    isSaving: saving,
    error,
    setError,
    hasConflict,
    pendingServerValue,
    replaceFromServer,
    discard,
    save,
  }
}
