import { canDeleteCutLog } from "../editability.js"
import { CutLogDomainError } from "../errors.js"
import type { CutLogRow, FlooringCutLogStatus } from "../types.js"

const ARITHMETIC_TOLERANCE = 0.005

export function formatCutLogStatus(
  status: FlooringCutLogStatus,
): "Pending Cut" | "Queued" | "Final Cut" | "Voided" {
  if (status === "QUEUED") return "Queued"
  if (status === "FINAL") return "Final Cut"
  if (status === "VOID") return "Voided"
  return "Pending Cut"
}

export function assertBeforeCutAfterInvariant(input: {
  before: string
  cut: string
  after: string
}): void {
  const before = Number(input.before)
  const cut = Number(input.cut)
  const after = Number(input.after)
  if (!Number.isFinite(before) || !Number.isFinite(cut) || !Number.isFinite(after)) {
    throw new CutLogDomainError("CUT_LOG_ARITHMETIC_MISMATCH", {
      before: input.before,
      cut: input.cut,
      after: input.after,
    })
  }
  if (Math.abs(before - cut - after) > ARITHMETIC_TOLERANCE) {
    throw new CutLogDomainError("CUT_LOG_ARITHMETIC_MISMATCH", {
      before,
      cut,
      after,
      expectedAfter: before - cut,
    })
  }
}

export function assertCutLogDeleteAllowed(
  row: Pick<CutLogRow, "status" | "isFinal" | "void">,
): void {
  if (!canDeleteCutLog(row)) {
    throw new CutLogDomainError("CUT_LOG_PENDING_INPUT_NOT_ALLOWED", {
      status: row.status,
      isFinal: row.isFinal,
      void: row.void,
    })
  }
}

export function assertCutLogLinkageSymmetry(input: {
  workOrderId: string | null
  workOrderItemId: string | null
}): void {
  const orderSet = input.workOrderId !== null && input.workOrderId !== ""
  const itemSet = input.workOrderItemId !== null && input.workOrderItemId !== ""
  if (orderSet !== itemSet) {
    throw new CutLogDomainError("CUT_LOG_LINKAGE_ASYMMETRY", {
      workOrderId: input.workOrderId,
      workOrderItemId: input.workOrderItemId,
    })
  }
}
