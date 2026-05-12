import { canVoidCutLog } from "../editability.js"
import type { CutLogRow } from "../types.js"

/**
 * Single-row void readiness — voids are always one-at-a-time per the intent
 * doc, never a batch. The application use case calls this BEFORE
 * transitioning the row to QUEUED and writing the outbox event.
 *
 * Returns null if the row is voidable; otherwise returns a single reason
 * code. The reason taxonomy is intentionally narrower than finalize's
 * (only four reasons) because void's preconditions are the inverse of
 * "already terminal in the wrong direction."
 */

export type CutLogVoidBlockerReason =
  | "ALREADY_VOID"
  | "ALREADY_QUEUED"
  | "NOT_PENDING_OR_FINAL"

export function getCutLogVoidBlocker(
  row: Pick<CutLogRow, "status" | "isFinal" | "void">,
): CutLogVoidBlockerReason | null {
  if (row.void) return "ALREADY_VOID"
  if (row.status === "QUEUED") return "ALREADY_QUEUED"
  if (!(row.isFinal || row.status === "PENDING")) return "NOT_PENDING_OR_FINAL"
  return null
}

/**
 * Convenience predicate — `getCutLogVoidBlocker(row) === null`. Matches
 * `canVoidCutLog` from `editability.ts` (delegated, kept colocated with the
 * other lifecycle predicates) and provides a single entry point with the
 * reason taxonomy.
 */
export function isCutLogVoidable(
  row: Pick<CutLogRow, "status" | "isFinal" | "void">,
): boolean {
  return canVoidCutLog(row)
}

export function buildCutLogVoidNotAllowedMessage(reason: CutLogVoidBlockerReason): string {
  switch (reason) {
    case "ALREADY_VOID":
      return "Cut log is already voided."
    case "ALREADY_QUEUED":
      return "Cut log has a worker job in flight; try again once it settles."
    case "NOT_PENDING_OR_FINAL":
      return "Only pending or finalized cut logs can be voided."
  }
}

export type CutLogVoidValidationIssue = {
  cutLogId: string
  reason: CutLogVoidBlockerReason
}

/**
 * Validate a single void request. Pure — returns null on pass, an issue on
 * fail. The application use case decides whether to surface the message or
 * throw a `CutLogDomainError("CUT_LOG_VOID_NOT_ALLOWED")`.
 */
export function validateCutLogVoidRequest(
  row: Pick<CutLogRow, "id" | "status" | "isFinal" | "void">,
): CutLogVoidValidationIssue | null {
  const reason = getCutLogVoidBlocker(row)
  if (reason === null) return null
  return { cutLogId: row.id, reason }
}
