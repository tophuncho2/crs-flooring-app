import { canDeleteCutLog } from "../editability.js"
import { CutLogDomainError } from "../errors.js"
import type { CutLogRow, FlooringCutLogStatus } from "../types.js"

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
 * When a cut log is voided, value columns clear, the WO/WOMI link drops,
 * and the parent-inventory `location` mirror clears, leaving the row as a
 * fully-detached terminal marker. The void use case applies this patch
 * atomically alongside the `totalCutSum` adjustment on the parent inventory.
 *
 * Erased:
 *   - `cut` (→ "0" because the column is NOT NULL)
 *   - `coverageCut` (→ null)
 *   - `workOrderId` / `workOrderItemId` (→ null) — cut log is unlinked
 *     from its WO + WOMI on void; symmetry preserved (both move together)
 *   - `location` (→ null) — denormalized mirror is no longer meaningful
 *     for a voided row
 * Sets `void = true` and `status = VOID`.
 *
 * Preserved (audit / historical record):
 *   - `before` / `after` — the inventory state at the moment of finalize
 *     (or zero placeholder for never-finalized voids; not touched here)
 *   - `cutLogNumber` — global display id
 *   - `isFinal` / `finalCutSequence` — if the row was finalized before void,
 *     those facts stand (gaps in the per-inventory ordinal are fine)
 *   - `isWaste`, `notes` — user-supplied tag and free text
 *   - `inventoryItem` + the 5 inventory-identity snapshot primitives —
 *     frozen at create, never mutated by any transition (including void)
 */
export type VoidedCutLogPatch = {
  cut: "0"
  coverageCut: null
  void: true
  status: "VOID"
  workOrderId: null
  workOrderItemId: null
  location: null
}

export function buildVoidedCutLogPatch(): VoidedCutLogPatch {
  return {
    cut: "0",
    coverageCut: null,
    void: true,
    status: "VOID",
    workOrderId: null,
    workOrderItemId: null,
    location: null,
  }
}

