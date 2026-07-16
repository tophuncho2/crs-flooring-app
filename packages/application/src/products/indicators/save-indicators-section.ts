import {
  Prisma,
  db,
  deleteIndicatorRecordById,
  getIndicatorScopeById,
  listIndicatorsForProduct,
  lockIndicatorRow,
  updateIndicatorRecord,
  withDatabaseTransaction,
  type InventoryIndicatorRecord,
  type UpdateIndicatorRowPatch,
} from "@builders/db"
import {
  describeIndicatorFormIssues,
  INVENTORY_INDICATOR_SECTION_MAX_PAGE_SIZE,
  normalizeMoneyAmount,
  validateIndicatorUpdateForm,
} from "@builders/domain"
import { assertActorEmail } from "../../shared/assert-actor-email.js"
import { InventoryIndicatorExecutionError } from "./errors.js"
import type {
  SaveIndicatorsSectionInput,
  SaveIndicatorsSectionResult,
} from "./types.js"

/**
 * Atomic diff-save for the product record-view's Inventory Indicators section —
 * the sibling of `saveWorkOrderMaterialItemsSectionUseCase`. Applies every edit +
 * delete of one product's indicators in a single transaction, then returns the
 * product's fresh indicator rows for the client to reconcile.
 *
 * There is no `added` — the identity triple is create-only, so new indicators go
 * through the create modal's own POST. OCC is enforced at the route against the
 * parent product's `updatedAt` (matching the WO/templates pattern); this use case
 * writes only the child indicator rows.
 */
export async function saveIndicatorsSectionUseCase(
  input: SaveIndicatorsSectionInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<SaveIndicatorsSectionResult> {
  assertActorEmail(actorEmail, "saveIndicatorsSectionUseCase")

  // Validate every edit's form up front (domain rule), before opening the txn.
  for (const modified of input.diff.modified) {
    const issues = validateIndicatorUpdateForm(modified.form)
    if (issues.length > 0) {
      throw new InventoryIndicatorExecutionError({
        code: "INVENTORY_INDICATOR_VALIDATION_FAILED",
        message: describeIndicatorFormIssues(issues),
        status: 400,
        payload: { issues, indicatorId: modified.id },
      })
    }
  }

  // The tx holds only the lean scope reads (relation-free `{ id, productId }`,
  // safe on the pinned connection) + the locks + writes. The fresh 3-relation
  // list is read on the POOL after commit — a relation-rich read on the tx
  // connection fires concurrent sub-queries and blows the tx timeout.
  await withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    // Deletes first — a row removed this save can't also be in `modified`.
    for (const { id } of input.diff.deleted) {
      const existing = await getIndicatorScopeById(id, c)
      // Already gone → idempotent no-op (a concurrent delete). A row that belongs
      // to another product is a scope violation.
      if (!existing) continue
      if (existing.productId !== input.productId) {
        throw scopeMismatch(existing.id)
      }
      await lockIndicatorRow(c, existing.id)
      await deleteIndicatorRecordById(c, { id: existing.id })
    }

    for (const modified of input.diff.modified) {
      const existing = await getIndicatorScopeById(modified.id, c)
      if (!existing) {
        throw new InventoryIndicatorExecutionError({
          code: "INVENTORY_INDICATOR_NOT_FOUND",
          message: "Inventory indicator not found",
          status: 404,
          payload: { indicatorId: modified.id },
        })
      }
      if (existing.productId !== input.productId) {
        throw scopeMismatch(existing.id)
      }
      await lockIndicatorRow(c, existing.id)

      // Money-standard normalize at the write boundary ("" clears → null column).
      const patch: UpdateIndicatorRowPatch = {
        updatedBy: actorEmail,
        lowStockThreshold: modified.form.lowStockThreshold.trim()
          ? normalizeMoneyAmount(modified.form.lowStockThreshold)
          : "",
        internalNotes: modified.form.internalNotes,
        isActive: modified.form.isActive,
      }
      await updateIndicatorRecord(c, { id: existing.id, patch })
    }
  })

  // Enrich the product's fresh indicator rows on the POOL after commit. When a
  // caller-managed tx is composed in, read on that client so it sees its own
  // uncommitted writes; otherwise the default pool.
  const reader = client ?? db
  const { rows } = await listIndicatorsForProduct(
    { productId: input.productId, skip: 0, take: INVENTORY_INDICATOR_SECTION_MAX_PAGE_SIZE },
    reader,
  )
  return { rows }
}

function scopeMismatch(indicatorId: string): InventoryIndicatorExecutionError {
  return new InventoryIndicatorExecutionError({
    code: "INVENTORY_INDICATOR_SCOPE_MISMATCH",
    message: "Inventory indicator does not belong to this product",
    status: 404,
    payload: { indicatorId },
  })
}

// Re-exported for consumers that want the row type alongside the result.
export type { InventoryIndicatorRecord }
