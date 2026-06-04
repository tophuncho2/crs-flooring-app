"use client"

export function buildRecordSectionDraftKey(input: {
  userId: string
  recordId: string
  section: string
}) {
  return ["record-draft", input.userId, input.recordId, input.section].join(":")
}

export function readRecordSectionDraft<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null
  }

  const value = window.sessionStorage.getItem(key)
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as T
  } catch {
    window.sessionStorage.removeItem(key)
    return null
  }
}

export function writeRecordSectionDraft(key: string, value: unknown) {
  if (typeof window === "undefined") {
    return
  }

  window.sessionStorage.setItem(key, JSON.stringify(value))
}

export function clearRecordSectionDraft(key: string) {
  if (typeof window === "undefined") {
    return
  }

  window.sessionStorage.removeItem(key)
}
