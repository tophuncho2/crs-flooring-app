import { CUT_LOG_PENDING_USER_EDITABLE_FIELDS } from "./editability.js"
import { CutLogDomainError } from "./errors.js"
import type { CutLogRow, CutLogStatus } from "./types.js"

const ARITHMETIC_TOLERANCE = 0.005

export function formatCutLogStatus(status: CutLogStatus): "Pending Cut" | "Final Cut" | "Voided" {
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

// --- Status transitions (user-initiated) ---

/**
 * User-initiated transitions: PENDING→FINAL, PENDING→VOID, FINAL→VOID.
 * Workers may make any transition during bulk operations; this rule applies
 * only to the user-driven path (single-row, one-at-a-time).
 */
export type CutLogUserTransition =
  | { from: "PENDING"; to: "FINAL" }
  | { from: "PENDING"; to: "VOID" }
  | { from: "FINAL"; to: "VOID" }

export function isCutLogUserTransitionAllowed(
  from: CutLogStatus,
  to: CutLogStatus,
): boolean {
  if (from === "PENDING" && to === "FINAL") return true
  if (from === "PENDING" && to === "VOID") return true
  if (from === "FINAL" && to === "VOID") return true
  return false
}

export function assertCutLogUserTransition(from: CutLogStatus, to: CutLogStatus): void {
  if (!isCutLogUserTransitionAllowed(from, to)) {
    throw new CutLogDomainError("CUT_LOG_INVALID_TRANSITION", { from, to })
  }
}

// --- Linkage symmetry ---

/**
 * A cut log may be unlinked (both ids null) OR fully linked to a work order +
 * its material item (both ids set). Mixed state is not permitted because the
 * cut log is conceptually child-scoped to a material item, which itself is
 * scoped to a work order.
 */
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

// --- Void-clear patch ---

/**
 * When a cut log is voided, every numeric / linkage field clears so the row
 * reads as an audit-only stub. Only `notes` and the `void` checkbox survive.
 *
 * The data layer applies this patch atomically alongside the totalCutSum
 * adjustment on the parent inventory row.
 */
export type VoidedCutLogPatch = {
  cut: "0"
  coverageCut: null
  before: "0"
  after: "0"
  cost: null
  freight: null
  isWaste: false
  workOrderId: null
  workOrderItemId: null
  void: true
  status: "VOID"
}

export function buildVoidedCutLogPatch(): VoidedCutLogPatch {
  return {
    cut: "0",
    coverageCut: null,
    before: "0",
    after: "0",
    cost: null,
    freight: null,
    isWaste: false,
    workOrderId: null,
    workOrderItemId: null,
    void: true,
    status: "VOID",
  }
}

// --- Void / status consistency ---

/**
 * The `void` boolean and the `status` enum are correlated: void === true if
 * and only if status === "VOID". They're stored as two columns (boolean for
 * filtering, string for state-machine clarity) but must agree.
 */
export function assertCutLogVoidStatusConsistency(input: {
  void: boolean
  status: CutLogStatus
}): void {
  const isVoid = input.void
  const isVoidedStatus = input.status === "VOID"
  if (isVoid !== isVoidedStatus) {
    throw new CutLogDomainError("CUT_LOG_VOID_STATUS_MISMATCH", {
      void: input.void,
      status: input.status,
    })
  }
}

// --- Finalization readiness ---

/**
 * A cut log can only be finalized from PENDING and only when its draft state
 * is clean (no unsaved edits). The application use case computes `isDirty`
 * by comparing the current draft to the persisted record before invoking
 * the finalize path.
 */
export function assertCutLogReadyToFinalize(input: {
  status: CutLogStatus
  isDirty: boolean
}): void {
  if (input.status !== "PENDING" || input.isDirty) {
    throw new CutLogDomainError("CUT_LOG_FINALIZE_DIRTY_BLOCKED", {
      status: input.status,
      isDirty: input.isDirty,
    })
  }
}

// --- Pending-save user-input gate ---

/**
 * Guards the pending-save path. The caller passes the keys it intends to
 * write; this rejects any key outside the user-editable list and rejects
 * writes against non-PENDING rows.
 */
export function assertCutLogPendingSaveInputAllowed(input: {
  status: CutLogStatus
  keys: ReadonlyArray<string>
}): void {
  if (input.status !== "PENDING") {
    throw new CutLogDomainError("CUT_LOG_PENDING_INPUT_NOT_ALLOWED", {
      status: input.status,
    })
  }
  for (const key of input.keys) {
    if (!(CUT_LOG_PENDING_USER_EDITABLE_FIELDS as readonly string[]).includes(key)) {
      throw new CutLogDomainError("CUT_LOG_PENDING_INPUT_NOT_ALLOWED", {
        status: input.status,
        offendingKey: key,
      })
    }
  }
}
