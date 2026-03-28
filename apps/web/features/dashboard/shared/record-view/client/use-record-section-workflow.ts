"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePendingWorkflowPolling } from "@/features/dashboard/shared/record-view/client/use-pending-workflow-polling"

export type RecordSectionWorkflowPhase =
  | "idle"
  | "requested"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "superseded"

export function normalizeRecordSectionWorkflowPhase(status: string | null | undefined): RecordSectionWorkflowPhase {
  const normalized = status?.trim().toUpperCase()
  if (normalized === "REQUESTED") return "requested"
  if (normalized === "QUEUED") return "queued"
  if (normalized === "PROCESSING") return "processing"
  if (normalized === "COMPLETED") return "completed"
  if (normalized === "FAILED") return "failed"
  if (normalized === "SUPERSEDED") return "superseded"
  return "idle"
}

export function formatRecordSectionWorkflowPhase(phase: RecordSectionWorkflowPhase) {
  return phase === "idle" ? "Idle" : phase.replaceAll("_", " ").replace(/^\w/, (value) => value.toUpperCase())
}

export function isPendingRecordSectionWorkflowPhase(phase: RecordSectionWorkflowPhase) {
  return phase === "requested" || phase === "queued" || phase === "processing"
}

export function isTerminalRecordSectionWorkflowPhase(phase: RecordSectionWorkflowPhase) {
  return phase === "completed" || phase === "failed" || phase === "superseded"
}

export function useRecordSectionWorkflow<TValue>({
  value: seedValue,
  getSyncKey,
  readStatus,
  refresh,
  getTerminalKey,
  onTerminal,
}: {
  value: TValue
  getSyncKey: (value: TValue) => string
  readStatus: (value: TValue) => string | null | undefined
  refresh: () => Promise<TValue | null>
  getTerminalKey?: (value: TValue) => string | null
  onTerminal?: (value: TValue) => void | Promise<void>
}) {
  const [value, setValue] = useState(seedValue)
  const [error, setError] = useState<string | null>(null)
  const getSyncKeyRef = useRef(getSyncKey)
  const readStatusRef = useRef(readStatus)
  const syncKey = getSyncKey(seedValue)

  useEffect(() => {
    getSyncKeyRef.current = getSyncKey
  }, [getSyncKey])

  useEffect(() => {
    readStatusRef.current = readStatus
  }, [readStatus])

  useEffect(() => {
    setValue((current) => (getSyncKeyRef.current(current) === syncKey ? current : seedValue))
  }, [seedValue, syncKey])

  const phase = useMemo(() => normalizeRecordSectionWorkflowPhase(readStatusRef.current(value)), [value])

  const refreshValue = useCallback(async () => {
    try {
      const nextValue = await refresh()
      if (nextValue) {
        setValue(nextValue)
        setError(null)
      }
      return nextValue
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Failed to refresh workflow state")
      return null
    }
  }, [refresh])

  usePendingWorkflowPolling({
    isPending: isPendingRecordSectionWorkflowPhase(phase),
    refresh: refreshValue,
    getTerminalKey: (nextValue) => {
      if (!isTerminalRecordSectionWorkflowPhase(normalizeRecordSectionWorkflowPhase(readStatusRef.current(nextValue)))) {
        return null
      }

      return getTerminalKey?.(nextValue) ?? getSyncKeyRef.current(nextValue)
    },
    onTerminal,
  })

  return {
    value,
    setValue,
    error,
    setError,
    phase,
    isPending: isPendingRecordSectionWorkflowPhase(phase),
    isTerminal: isTerminalRecordSectionWorkflowPhase(phase),
    refresh: refreshValue,
  }
}
