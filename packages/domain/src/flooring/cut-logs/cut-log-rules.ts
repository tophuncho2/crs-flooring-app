import { CutLogDomainError } from "./errors.js"
import { CUT_LOG_STATUS_VALUES, type CutLogRow, type CutLogStatus } from "./types.js"

const ARITHMETIC_TOLERANCE = 0.005

export function isCutLogStatus(value: unknown): value is CutLogStatus {
  return typeof value === "string" && (CUT_LOG_STATUS_VALUES as readonly string[]).includes(value)
}

export function formatCutLogStatus(status: CutLogStatus): "Pending Cut" | "Final Cut" {
  return status === "FINAL" ? "Final Cut" : "Pending Cut"
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

export function assertCanAddCutLog(inventory: { isImported: boolean }): void {
  if (!inventory.isImported) {
    throw new CutLogDomainError("CUT_LOG_INVENTORY_NOT_IMPORTED")
  }
}

export function isCutLogMostRecent(
  cutLog: Pick<CutLogRow, "id" | "createdAt">,
  siblingsSameInventory: ReadonlyArray<Pick<CutLogRow, "id" | "createdAt">>,
): boolean {
  if (siblingsSameInventory.length === 0) return false
  const newest = siblingsSameInventory.reduce((a, b) => (a.createdAt >= b.createdAt ? a : b))
  return newest.id === cutLog.id
}

export function assertCutLogDeleteAllowed(
  cutLog: Pick<CutLogRow, "id" | "createdAt">,
  siblingsSameInventory: ReadonlyArray<Pick<CutLogRow, "id" | "createdAt">>,
): void {
  if (!isCutLogMostRecent(cutLog, siblingsSameInventory)) {
    throw new CutLogDomainError("CUT_LOG_DELETE_NOT_MOST_RECENT", { cutLogId: cutLog.id })
  }
}
