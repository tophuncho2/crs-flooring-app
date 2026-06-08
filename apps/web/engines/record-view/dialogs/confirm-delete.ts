"use client"

export function confirmRecordDelete(message: string) {
  if (typeof window === "undefined") {
    return false
  }

  return window.confirm(message)
}

export function buildDeleteConfirmationMessage(label: string) {
  return `Delete this ${label}? This cannot be undone.`
}
