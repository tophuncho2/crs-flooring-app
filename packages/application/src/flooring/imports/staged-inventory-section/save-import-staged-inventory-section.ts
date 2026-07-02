import { randomUUID } from "node:crypto"
import {
  Prisma,
  applyImportStagedInventorySectionDiff,
  getImportById,
  getProductById,
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

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    await lockImportRow(c, input.importEntryId)

    const parent = await getImportById(input.importEntryId, c)
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
    const products = await Promise.all(
      distinctProductIds.map(async (productId) => ({
        productId,
        product: await getProductById(productId, c),
      })),
    )
    // Product → its own unit FK (UoM epic 2B). Seeds a row's `unitId` on add /
    // product-change; the form's own `unitId` (kept correct client-side, and
    // re-seeded there on product-change) takes precedence, with this as the
    // fallback when the form left it blank.
    const unitIdByProductId = new Map<string, string>()
    for (const entry of products) {
      if (!entry.product) {
        throw new ImportStagedInventorySectionExecutionError({
          code: "SECTION_FILTER_VALIDATION_FAILED",
          message: "Selected product was not found.",
          status: 400,
          field: "productId",
          payload: { productId: entry.productId },
        })
      }
      unitIdByProductId.set(entry.productId, entry.product.unitId)
    }

    const [existingFilters, existingStagedRows] = await Promise.all([
      listFilterRowDiffSummariesByImport(input.importEntryId, c),
      listStagedInventoryRowDiffSummariesByImport(input.importEntryId, c),
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
    // the unit FK is the form's own `unitId`, falling back to the product's unit
    // (already fetched into unitIdByProductId above) when the form left it blank.
    const stagedRowAddedInputs = rowsAddedWithIds.map((draft) => {
      return {
        id: draft.id,
        tempId: draft.tempId,
        input: {
          productId: draft.productId,
          warehouseId: parent.warehouseId,
          unitId: draft.form.unitId.trim() || unitIdByProductId.get(draft.productId) || null,
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
            unitId: draft.form.unitId.trim() || unitIdByProductId.get(draft.form.productId) || null,
            stockOrdered: draft.form.stockOrdered,
          },
        })),
        modified: input.diff.filters.modified.map((update) => ({
          id: update.id,
          input: {
            categoryFilterId: update.form.categoryFilterId,
            productId: update.form.productId,
            unitId: update.form.unitId.trim() || unitIdByProductId.get(update.form.productId) || null,
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
  })
}
