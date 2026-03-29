"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  normalizeRecordSectionError,
  type RecordSectionError,
} from "../contracts"
import { usePendingWorkflowPolling } from "./use-pending-workflow-polling"

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
  getPollingIntervalMs,
}: {
  value: TValue
  getSyncKey: (value: TValue) => string
  readStatus: (value: TValue) => string | null | undefined
  refresh: () => Promise<TValue | null>
  getTerminalKey?: (value: TValue) => string | null
  onTerminal?: (value: TValue) => void | Promise<void>
  getPollingIntervalMs?: (value: TValue) => number | undefined
}) {
  const [value, setValue] = useState(seedValue)
  const [error, setErrorState] = useState<RecordSectionError | null>(null)
  const getSyncKeyRef = useRef(getSyncKey)
  const readStatusRef = useRef(readStatus)
  const getPollingIntervalMsRef = useRef(getPollingIntervalMs)
  const syncKey = getSyncKey(seedValue)

  useEffect(() => {
    getSyncKeyRef.current = getSyncKey
  }, [getSyncKey])

  useEffect(() => {
    readStatusRef.current = readStatus
  }, [readStatus])

  useEffect(() => {
    getPollingIntervalMsRef.current = getPollingIntervalMs
  }, [getPollingIntervalMs])

  useEffect(() => {
    setValue((current) => (getSyncKeyRef.current(current) === syncKey ? current : seedValue))
  }, [seedValue, syncKey])

  const phase = useMemo(() => normalizeRecordSectionWorkflowPhase(readStatusRef.current(value)), [value])
  const pollingIntervalMs = useMemo(() => getPollingIntervalMsRef.current?.(value), [value])

  const setError = useCallback((nextError: RecordSectionError | string | Error | null) => {
    setErrorState(nextError ? normalizeRecordSectionError(nextError, { defaultKind: "workflow" }) : null)
  }, [])

  const refreshValue = useCallback(async () => {
    try {
      const nextValue = await refresh()
      if (nextValue) {
        setValue(nextValue)
        setErrorState(null)
      }
      return nextValue
    } catch (refreshError) {
      setErrorState(
        normalizeRecordSectionError(refreshError, {
          defaultKind: "workflow",
          defaultMessage: "Failed to refresh workflow state",
        }),
      )
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
    intervalMs: pollingIntervalMs,
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
