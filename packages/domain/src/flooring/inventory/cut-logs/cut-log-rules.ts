import {
  canDeleteCutLog,
  CUT_LOG_PENDING_USER_EDITABLE_FIELDS,
  getCutLogFinalizabilityBlocker,
  isCutLogPendingEditable,
} from "./editability.js"
import { CutLogDomainError } from "./errors.js"
import type { CutLogRow, FlooringCutLogStatus } from "./types.js"

const ARITHMETIC_TOLERANCE = 0.005

/**
 * Human label for the cut-log status enum. UI consumes this directly; the
 * underlying enum (PENDING / QUEUED / FINAL / VOID) is the canonical value.
 */
export function formatCutLogStatus(
  status: FlooringCutLogStatus,
): "Pending Cut" | "Queued" | "Final Cut" | "Voided" {
  if (status === "QUEUED") return "Queued"
  if (status === "FINAL") return "Final Cut"
  if (status === "VOID") return "Voided"
  return "Pending Cut"
}

/**
 * Invariant: `before − cut === after` (within a small floating-point
 * tolerance). The finalize worker computes `before` / `after` from the
 * inventory's running balance at finalize time; this rule lets every layer
 * sanity-check the result.
 */
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

/**
 * Pending cut logs can be deleted in any order (no most-recent-first
 * constraint). Finalized cut logs cannot be deleted at all (they can only
 * be voided). Throws when delete isn't permitted; otherwise no-op.
 */
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

// --- Linkage symmetry ---

/**
 * A cut log may be unlinked (both ids null) OR fully linked to a work order
 * + its material item (both ids set). Mixed state is not permitted because
 * the cut log is conceptually child-scoped to a material item, which itself
 * is scoped to a work order. Domain-rule only — no DB CHECK constraint.
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
 * When a cut log is voided, the value columns clear so the row reads as a
 * void marker. The void worker applies this patch atomically alongside the
 * `totalCutSum` adjustment on the parent inventory row.
 *
 * Erased: `cut` (→ "0" because the column is NOT NULL),
 * `coverageCut`, `cost`, `freight`. Sets `void = true` and `status = VOID`.
 *
 * Preserved (audit / historical record):
 *   - `before` / `after` — the inventory state at the moment of finalize
 *     (or zero placeholder for never-finalized voids; not touched here)
 *   - `cutLogNumber` — global display id
 *   - `isFinal` / `finalCutSequence` — if the row was finalized before void,
 *     those facts stand (gaps in the per-inventory ordinal are fine)
 *   - `isWaste`, `notes` — user-supplied tag and free text
 *   - `workOrderId` / `workOrderItemId` — links remain editable for the
 *     life of the row via the separate sync use case
 */
export type VoidedCutLogPatch = {
  cut: "0"
  coverageCut: null
  cost: null
  freight: null
  void: true
  status: "VOID"
}

export function buildVoidedCutLogPatch(): VoidedCutLogPatch {
  return {
    cut: "0",
    coverageCut: null,
    cost: null,
    freight: null,
    void: true,
    status: "VOID",
  }
}

// --- Void / status consistency ---

/**
 * The `void` boolean and the `status` enum are correlated: `void === true`
 * if and only if `status === "VOID"`. They're stored as two columns
 * (boolean for filtering, enum for state-machine clarity) but must agree.
 */
export function assertCutLogVoidStatusConsistency(input: {
  void: boolean
  status: FlooringCutLogStatus
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
 * A cut log can only be finalized from PENDING (not voided, not already
 * finalized, not currently mid-flight in another worker job, with a positive
 * cut value), AND only when the section's draft state is clean. The
 * application use case computes `isDirty` from the controller's diff state
 * before invoking the finalize path; the row-state portion is delegated to
 * `getCutLogFinalizabilityBlocker`.
 */
export function assertCutLogReadyToFinalize(input: {
  row: Pick<CutLogRow, "status" | "isFinal" | "void" | "cut">
  isDirty: boolean
}): void {
  if (input.isDirty) {
    throw new CutLogDomainError("CUT_LOG_FINALIZE_DIRTY_BLOCKED", { isDirty: true })
  }
  const blocker = getCutLogFinalizabilityBlocker(input.row)
  if (blocker !== null) {
    throw new CutLogDomainError("CUT_LOG_BATCH_INELIGIBLE", { reason: blocker })
  }
}

// --- Pending-save user-input gate ---

/**
 * Guards the pending-save worker's per-row write. The caller passes the keys
 * it intends to write; this rejects any key outside the user-editable list,
 * AND rejects writes against rows that aren't pending-editable (queued,
 * finalized, voided).
 */
export function assertCutLogPendingSaveInputAllowed(input: {
  row: Pick<CutLogRow, "status" | "isFinal" | "void">
  keys: ReadonlyArray<string>
}): void {
  if (!isCutLogPendingEditable(input.row)) {
    throw new CutLogDomainError("CUT_LOG_PENDING_INPUT_NOT_ALLOWED", {
      status: input.row.status,
      isFinal: input.row.isFinal,
      void: input.row.void,
    })
  }
  for (const key of input.keys) {
    if (!(CUT_LOG_PENDING_USER_EDITABLE_FIELDS as readonly string[]).includes(key)) {
      throw new CutLogDomainError("CUT_LOG_PENDING_INPUT_NOT_ALLOWED", {
        status: input.row.status,
        offendingKey: key,
      })
    }
  }
}
