import type { ReactNode } from "react"

export type RecordRowStatusTone = "neutral" | "warning" | "error" | "success" | "processing"

export type RecordResolvedRowStatus = {
  key: string
  label: ReactNode
  tone: RecordRowStatusTone
}

const GENERIC_RECORD_ROW_STATUSES = {
  unsaved: {
    key: "unsaved",
    label: "Unsaved",
    tone: "warning",
  },
  needsReview: {
    key: "needs-review",
    label: "Needs Review",
    tone: "error",
  },
  ready: {
    key: "ready",
    label: "Ready",
    tone: "neutral",
  },
} satisfies Record<string, RecordResolvedRowStatus>

export function getGenericRecordRowStatus(
  kind: keyof typeof GENERIC_RECORD_ROW_STATUSES,
): RecordResolvedRowStatus {
  return GENERIC_RECORD_ROW_STATUSES[kind]
}

export function getRecordAllocationStateStatus(
  allocationState: string | null | undefined,
): RecordResolvedRowStatus | null {
  if (!allocationState) {
    return null
  }

  switch (allocationState) {
    case "NOT_STARTED":
      return {
        key: "allocation-not-started",
        label: "Not Started",
        tone: "neutral",
      }
    case "PARTIALLY_ALLOCATED":
      return {
        key: "allocation-partial",
        label: "Partially Allocated",
        tone: "warning",
      }
    case "FULLY_ALLOCATED":
      return {
        key: "allocation-ready",
        label: "Ready",
        tone: "success",
      }
    case "SHORTAGE":
      return {
        key: "allocation-shortage",
        label: "Shortage",
        tone: "error",
      }
    default:
      return {
        key: allocationState.toLowerCase(),
        label: allocationState.replaceAll("_", " "),
        tone: "neutral",
      }
  }
}

export function resolveRecordRowStatus(input: {
  hasErrors?: boolean
  isUnsaved?: boolean
  override?: RecordResolvedRowStatus | null
  fallback?: RecordResolvedRowStatus
}): RecordResolvedRowStatus {
  if (input.hasErrors) {
    return getGenericRecordRowStatus("needsReview")
  }

  if (input.isUnsaved) {
    return getGenericRecordRowStatus("unsaved")
  }

  if (input.override) {
    return input.override
  }

  return input.fallback ?? getGenericRecordRowStatus("ready")
}
