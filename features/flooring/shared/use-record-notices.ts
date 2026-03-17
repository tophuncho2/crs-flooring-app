"use client"

import { useState } from "react"

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
  }
}
