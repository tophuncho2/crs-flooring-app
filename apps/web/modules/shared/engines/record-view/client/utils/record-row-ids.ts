"use client"

export function createLocalRecordRowId(scope: string) {
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`

  return `temp:${scope}:${randomId}`
}

export function isLocalOnlyRecordRow(id: string) {
  return id.startsWith("temp:")
}
