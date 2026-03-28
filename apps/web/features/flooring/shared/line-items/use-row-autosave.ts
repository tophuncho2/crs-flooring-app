"use client"

import { useCallback, useEffect, useMemo, useRef, type FocusEvent } from "react"

type FocusLeaveProps = {
  onFocusCapture: () => void
  onBlurCapture: (event: FocusEvent<HTMLElement>) => void
}

export function useRowAutosave<TValue>({
  rowId,
  value,
  serialize,
  canAutosave = true,
  onSave,
}: {
  rowId: string
  value: TValue
  serialize: (value: TValue) => string
  canAutosave?: boolean
  onSave: (value: TValue) => Promise<boolean> | boolean
}) {
  const snapshot = useMemo(() => serialize(value), [serialize, value])
  const committedSnapshotRef = useRef<string>(snapshot)
  const currentRowIdRef = useRef(rowId)
  const isFocusedRef = useRef(false)
  const isSavingRef = useRef(false)

  useEffect(() => {
    if (currentRowIdRef.current !== rowId) {
      currentRowIdRef.current = rowId
      committedSnapshotRef.current = snapshot
      isFocusedRef.current = false
      isSavingRef.current = false
      return
    }

    if (!isFocusedRef.current && !isSavingRef.current) {
      committedSnapshotRef.current = snapshot
    }
  }, [rowId, snapshot])

  const saveIfNeeded = useCallback(async () => {
    if (!canAutosave || isSavingRef.current) {
      return false
    }

    const nextSnapshot = serialize(value)
    if (nextSnapshot === committedSnapshotRef.current) {
      return false
    }

    isSavingRef.current = true
    const didSave = await onSave(value)
    isSavingRef.current = false

    if (didSave) {
      committedSnapshotRef.current = nextSnapshot
    }

    return didSave
  }, [canAutosave, onSave, serialize, value])

  const focusLeaveProps = useMemo<FocusLeaveProps>(
    () => ({
      onFocusCapture: () => {
        isFocusedRef.current = true
      },
      onBlurCapture: (event) => {
        const nextFocused = event.relatedTarget as Node | null
        if (nextFocused && event.currentTarget.contains(nextFocused)) {
          return
        }

        isFocusedRef.current = false
        void saveIfNeeded()
      },
    }),
    [saveIfNeeded],
  )

  return {
    focusLeaveProps,
    saveIfNeeded,
    isDirty: snapshot !== committedSnapshotRef.current,
  }
}
