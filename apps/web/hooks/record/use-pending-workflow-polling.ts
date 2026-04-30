"use client"

import { useEffect, useRef } from "react"

export function usePendingWorkflowPolling<T>(input: {
  isPending: boolean
  refresh: () => Promise<T | null>
  getTerminalKey?: (value: T) => string | null
  onTerminal?: (value: T) => void | Promise<void>
  intervalMs?: number
}) {
  const seenTerminalKeyRef = useRef<string | null>(null)
  const refreshRef = useRef(input.refresh)
  const getTerminalKeyRef = useRef(input.getTerminalKey)
  const onTerminalRef = useRef(input.onTerminal)

  useEffect(() => {
    refreshRef.current = input.refresh
  }, [input.refresh])

  useEffect(() => {
    getTerminalKeyRef.current = input.getTerminalKey
  }, [input.getTerminalKey])

  useEffect(() => {
    onTerminalRef.current = input.onTerminal
  }, [input.onTerminal])

  useEffect(() => {
    if (!input.isPending) {
      seenTerminalKeyRef.current = null
    }
  }, [input.isPending])

  useEffect(() => {
    if (!input.isPending) {
      return undefined
    }

    const interval = window.setInterval(() => {
      void refreshRef.current().then(async (value) => {
        if (!value || !onTerminalRef.current) {
          return
        }

        const terminalKey = getTerminalKeyRef.current?.(value) ?? null
        if (!terminalKey || terminalKey === seenTerminalKeyRef.current) {
          return
        }

        seenTerminalKeyRef.current = terminalKey
        await onTerminalRef.current(value)
      })
    }, input.intervalMs ?? 3000)

    return () => {
      window.clearInterval(interval)
    }
  }, [input.intervalMs, input.isPending])
}
