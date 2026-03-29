"use client"

export function confirmRecordAction(message: string) {
  if (typeof window === "undefined") {
    return false
  }

  return window.confirm(message)
}

export function buildRecordActionConfirmationMessage(input: {
  title: string
  summary?: string
  warning?: string
}) {
  return [input.title, input.summary, input.warning].filter(Boolean).join("\n\n")
}
