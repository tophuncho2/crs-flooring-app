"use client"

import { useState } from "react"

export type RecordNotices = {
  message: string
  error: string
  setMessage: (value: string) => void
  setError: (value: string) => void
  clearNotices: () => void
  showSuccess: (value: string) => void
  showError: (value: string) => void
}

export function useRecordNotices() {
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  function clearNotices() {
    setMessage("")
    setError("")
  }

  function showSuccess(value: string) {
    setMessage(value)
    setError("")
  }

  function showError(value: string) {
    setError(value)
    setMessage("")
  }

  return {
    message,
    error,
    setMessage,
    setError,
    clearNotices,
    showSuccess,
    showError,
  } satisfies RecordNotices
}
