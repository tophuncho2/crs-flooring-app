import { canRelinkCutLog } from "../editability.js"
import { assertCutLogDeleteAllowed } from "./cut-log-rules.js"
import { CutLogDomainError } from "../errors.js"
import type { CutLogRow } from "../types.js"

export function assertCutLogPendingMutationAllowed(
  row: Pick<CutLogRow, "status" | "isFinal" | "void">,
): void {
  assertCutLogDeleteAllowed(row)
}

export function assertCutLogLinkMutationAllowed(
  row: Pick<CutLogRow, "status" | "void">,
): void {
  if (!canRelinkCutLog(row)) {
    throw new CutLogDomainError("CUT_LOG_LINK_NOT_ALLOWED", {
      status: row.status,
      void: row.void,
    })
  }
}

export function assertCutLogExpectedUpdatedAtMatches(input: {
  rowUpdatedAt: string
  expected: string
}): void {
  if (input.rowUpdatedAt !== input.expected) {
    throw new CutLogDomainError("CUT_LOG_STALE_UPDATED_AT", {
      expected: input.expected,
      actual: input.rowUpdatedAt,
    })
  }
}
