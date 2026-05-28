import type { CutLogRow, FlooringCutLogStatus } from "./types.js"

export function isCutLogPendingEditable(
  row: Pick<CutLogRow, "status" | "isFinal" | "void">,
): boolean {
  return row.status === "PENDING" && !row.isFinal && !row.void
}

export function isCutLogQueued(row: Pick<CutLogRow, "status">): boolean {
  return row.status === "QUEUED"
}

export function isCutLogFinalized(row: Pick<CutLogRow, "isFinal">): boolean {
  return row.isFinal === true
}

export function isCutLogVoided(row: Pick<CutLogRow, "void">): boolean {
  return row.void === true
}

export function canDeleteCutLog(
  row: Pick<CutLogRow, "status" | "isFinal" | "void">,
): boolean {
  return isCutLogPendingEditable(row)
}

export function canRelinkCutLog(
  row: Pick<CutLogRow, "status" | "void">,
): boolean {
  if (row.void) return false
  if (row.status === "QUEUED") return false
  return true
}

export function buildCutLogNotPendingMessage(
  row: Pick<CutLogRow, "status" | "isFinal" | "void">,
): string {
  if (row.void) return "Cut log has been voided and is no longer editable."
  if (row.isFinal) return "Cut log has been finalized and is no longer editable as a draft."
  if (row.status === "QUEUED")
    return "Cut log has a worker job in flight; try again once it settles."
  return "Cut log is editable."
}

export type CutLogFinalizabilityReason =
  | "NOT_PENDING_STATUS"
  | "ALREADY_QUEUED"
  | "ALREADY_FINAL"
  | "ALREADY_VOID"
  | "ZERO_OR_NEGATIVE_CUT"

export function getCutLogFinalizabilityBlocker(
  row: Pick<CutLogRow, "status" | "isFinal" | "void" | "cut">,
): CutLogFinalizabilityReason | null {
  if (row.status === "QUEUED") return "ALREADY_QUEUED"
  if (row.void) return "ALREADY_VOID"
  if (row.isFinal) return "ALREADY_FINAL"
  if (row.status !== "PENDING") return "NOT_PENDING_STATUS"
  const parsed = Number((row.cut ?? "").toString())
  if (!Number.isFinite(parsed) || parsed <= 0) return "ZERO_OR_NEGATIVE_CUT"
  return null
}

export function canFinalizeCutLog(
  row: Pick<CutLogRow, "status" | "isFinal" | "void" | "cut">,
): boolean {
  return getCutLogFinalizabilityBlocker(row) === null
}

export type { FlooringCutLogStatus }
