import { randomUUID } from "node:crypto"
import {
  Prisma,
  applyImportStagedInventorySectionDiff,
  db,
  getImportById,
  getProductById,
  getUnitOfMeasureById,
  listFilterRowDiffSummariesByImport,
  listStagedInventoryRowDiffSummariesByImport,
  lockImportRow,
  stampImportActor,
  withDatabaseTransaction,
} from "@builders/db"
import {
  assignDraftIds,
  normalizeMoneyAmount,
  describeStagedInventoryFilterDiffIssues,
  describeStagedInventoryFilterValidationIssues,
  describeStagedInventoryRowDiffIssues,
  describeStagedInventoryValidationIssues,
  validateStagedInventoryFilterForm,
  validateStagedInventoryFiltersDiff,
  validateStagedInventoryForm,
  validateStagedInventoryRowsDiff,
} from "@builders/domain"
import { guardProductsExist } from "../../../shared/guard-products-exist.js"
import { guardUnitsExist } from "../../../shared/guard-units-exist.js"
import { ImportStagedInventorySectionExecutionError } from "./errors.js"
import type {
  SaveImportStagedInventorySectionInput,
  SaveImportStagedInventorySectionResult,
} from "./types.js"

/**
 * Cost/freight are optional money figures. Empty string → null; otherwise
 * normalized to the canonical Decimal(12,2) string at this boundary (money
 * standard). Forms are pre-validated by `validateStagedInventoryForm`.
 */
function toStagedMoneyOrNull(value: string): string | null {
  return value.trim() === "" ? null : normalizeMoneyAmount(value)
}

export async function saveImportStagedInventorySectionUseCase(
  input: SaveImportStagedInventorySectionInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<SaveImportStagedInventorySectionResult> {
  if (!actorEmail || !actorEmail.trim()) {
    throw new Error("saveImportStagedInventorySectionUseCase requires a non-empty actorEmail")
  }

  // Read-only validation work runs BEFORE the transaction, on the pooled client
  // (`db`) unless this use case is composed inside a caller's transaction. These
  // reads (parent fetch, per-product fetch, the two diff-summary reads) used to
  // serialize on the single interactive-transaction connection and, with 2B's
  // added `unit` joins, pushed the transaction past its timeout. Out here they
  // run on the pool; the transaction below holds only the lock + the writes.
  const reader = client ?? db

  const parent = await getImportById(input.importEntryId, reader)
  if (!parent) {
    throw new ImportStagedInventorySectionExecutionError({
      code: "SECTION_PARENT_NOT_FOUND",
      message: "Import not found.",
      status: 404,
    })
  }

  for (const draft of input.diff.filters.added) {
    const issues = validateStagedInventoryFilterForm(draft.form)
    if (issues.length > 0) {
      throw new ImportStagedInventorySectionExecutionError({
        code: "SECTION_FILTER_VALIDATION_FAILED",
        message: describeStagedInventoryFilterValidationIssues(issues),
        status: 400,
        payload: { refKind: "tempId", ref: draft.tempId, issues },
      })
    }
  }
  for (const update of input.diff.filters.modified) {
    const issues = validateStagedInventoryFilterForm(update.form)
    if (issues.length > 0) {
      throw new ImportStagedInventorySectionExecutionError({
        code: "SECTION_FILTER_VALIDATION_FAILED",
        message: describeStagedInventoryFilterValidationIssues(issues),
        status: 400,
        payload: { refKind: "id", ref: update.id, issues },
      })
    }
  }

  for (const draft of input.diff.rows.added) {
    const issues = validateStagedInventoryForm(draft.form)
    if (issues.length > 0) {
      throw new ImportStagedInventorySectionExecutionError({
        code: "SECTION_ROW_VALIDATION_FAILED",
        message: describeStagedInventoryValidationIssues(issues),
        status: 400,
        payload: { refKind: "tempId", ref: draft.tempId, issues },
      })
    }
  }
  for (const update of input.diff.rows.modified) {
    const issues = validateStagedInventoryForm(update.form)
    if (issues.length > 0) {
      throw new ImportStagedInventorySectionExecutionError({
        code: "SECTION_ROW_VALIDATION_FAILED",
        message: describeStagedInventoryValidationIssues(issues),
        status: 400,
        payload: { refKind: "id", ref: update.id, issues },
      })
    }
  }

  const distinctProductIds = Array.from(
    new Set([
      ...input.diff.filters.added.map((d) => d.form.productId),
      ...input.diff.filters.modified.map((m) => m.form.productId),
      ...input.diff.rows.added.map((d) => d.productId),
    ]),
  )
  // Validate every product touched by the diff still exists. The unit FK is NOT
  // seeded here — it's a user-managed, per-row value the client fills on product
  // select; the server persists only what the form sends (UoM epic 2B).
  await guardProductsExist(
    distinctProductIds,
    (productId) => getProductById(productId, reader),
    (productId) =>
      new ImportStagedInventorySectionExecutionError({
        code: "SECTION_FILTER_VALIDATION_FAILED",
        message: "Selected product was not found.",
        status: 400,
        field: "productId",
        payload: { productId },
      }),
  )

  // The unit FK is nullable/editable on staged rows and filters, so guard only
  // the non-empty ids the diff touches (mirrors the product guard's sources).
  const distinctUnitIds = Array.from(
    new Set(
      [
        ...input.diff.filters.added.map((d) => d.form.unitId),
        ...input.diff.filters.modified.map((m) => m.form.unitId),
        ...input.diff.rows.added.map((d) => d.form.unitId),
      ].filter((unitId) => unitId.trim() !== ""),
    ),
  )
  await guardUnitsExist(
    distinctUnitIds,
    (unitId) => getUnitOfMeasureById(unitId, reader),
    (unitId) =>
      new ImportStagedInventorySectionExecutionError({
        code: "SECTION_UNIT_VALIDATION_FAILED",
        message: "Selected unit was not found.",
        status: 400,
        field: "unitId",
        payload: { unitId },
      }),
  )

  const [existingFilters, existingStagedRows] = await Promise.all([
    listFilterRowDiffSummariesByImport(input.importEntryId, reader),
    listStagedInventoryRowDiffSummariesByImport(input.importEntryId, reader),
  ])

  const filterIssues = validateStagedInventoryFiltersDiff(input.diff.filters, {
    existing: existingFilters,
    knownProductIds: distinctProductIds,
  })
  if (filterIssues.length > 0) {
    throw new ImportStagedInventorySectionExecutionError({
      code: "SECTION_FILTER_DIFF_VALIDATION_FAILED",
      message: describeStagedInventoryFilterDiffIssues(filterIssues),
      status: 400,
      payload: { issues: filterIssues },
    })
  }
  const rowIssues = validateStagedInventoryRowsDiff(input.diff.rows, {
    existing: existingStagedRows,
  })
  if (rowIssues.length > 0) {
    throw new ImportStagedInventorySectionExecutionError({
      code: "SECTION_ROW_DIFF_VALIDATION_FAILED",
      message: describeStagedInventoryRowDiffIssues(rowIssues),
      status: 400,
      payload: { issues: rowIssues },
    })
  }

  const filtersAddedWithIds = assignDraftIds(input.diff.filters.added, randomUUID)
  const rowsAddedWithIds = assignDraftIds(input.diff.rows.added, randomUUID)

  // Staged rows attach directly to the import and carry their own productId;
  // the unit FK is the form's own `unitId` verbatim — the server never re-seeds
  // it from the product (the client seeds on product select; a blank stays null).
  const stagedRowAddedInputs = rowsAddedWithIds.map((draft) => {
    return {
      id: draft.id,
      tempId: draft.tempId,
      input: {
        productId: draft.productId,
        warehouseId: parent.warehouseId,
        unitId: draft.form.unitId.trim() || null,
        rollNumber: draft.form.rollNumber || null,
        dyeLot: draft.form.dyeLot || null,
        location: draft.form.location || null,
        startingStock: draft.form.startingStock,
        cost: toStagedMoneyOrNull(draft.form.cost),
        freight: toStagedMoneyOrNull(draft.form.freight),
        note: draft.form.note || null,
      },
    }
  })

  // The transaction now holds only the lock + the writes. A generous timeout
  // guards the write burst (a large import can carry ~1000 rows) + the final
  // reload against the slow shared dev DB, now that the reads above no longer
  // eat the interactive-transaction budget.
  return withDatabaseTransaction(
    async (tx) => {
      const c = client ?? tx

      await lockImportRow(c, input.importEntryId)

      // Aggregate-root actor: a successful section save (even an empty diff)
      // stamps the parent import's `updatedBy`/`updatedAt`. Runs after all
      // validation so a rejected save leaves the parent untouched (the touch
      // rolls back with the transaction).
      await stampImportActor(c, input.importEntryId, actorEmail)

      return applyImportStagedInventorySectionDiff(c, {
        importEntryId: input.importEntryId,
        filters: {
          added: filtersAddedWithIds.map((draft) => ({
            id: draft.id,
            tempId: draft.tempId,
            input: {
              categoryFilterId: draft.form.categoryFilterId,
              productId: draft.form.productId,
              // Unit FK is the form's own value; never re-seeded from the product.
              unitId: draft.form.unitId.trim() || null,
              stockOrdered: draft.form.stockOrdered,
            },
          })),
          modified: input.diff.filters.modified.map((update) => ({
            id: update.id,
            input: {
              categoryFilterId: update.form.categoryFilterId,
              productId: update.form.productId,
              // The unit is the user's own edit ("" disconnects). No product
              // fallback on modify — the client re-seeds on product change, and
              // re-seeding here would silently defeat an intentional clear
              // (mirrors the staged-row modified path below).
              unitId: update.form.unitId.trim() || null,
              stockOrdered: update.form.stockOrdered,
            },
          })),
          deleted: input.diff.filters.deleted.map((d) => ({ id: d.id })),
        },
        rows: {
          added: stagedRowAddedInputs.map(({ id, tempId, input: rowInput }) => ({
            id,
            tempId,
            input: rowInput,
          })),
          modified: input.diff.rows.modified.map((update) => ({
            id: update.id,
            input: {
              // Product is fixed on a staged row → the unit is the user's own edit
              // ("" disconnects; the importability gate blocks queueing a null unit).
              unitId: update.form.unitId.trim() || null,
              rollNumber: update.form.rollNumber || null,
              dyeLot: update.form.dyeLot || null,
              location: update.form.location || null,
              startingStock: update.form.startingStock,
              cost: toStagedMoneyOrNull(update.form.cost),
              freight: toStagedMoneyOrNull(update.form.freight),
              note: update.form.note || null,
            },
          })),
          deleted: input.diff.rows.deleted.map((d) => ({ id: d.id })),
        },
      })
    },
    { timeout: 15_000, maxWait: 10_000 },
  )
}
