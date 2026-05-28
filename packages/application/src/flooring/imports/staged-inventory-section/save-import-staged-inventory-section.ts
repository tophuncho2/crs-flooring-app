import { randomUUID } from "node:crypto"
import {
  Prisma,
  applyImportStagedInventorySectionDiff,
  getImportById,
  getProductById,
  listFilterRowDiffSummariesByImport,
  listStagedInventoryRowDiffSummariesByImport,
  lockImportRow,
  withDatabaseTransaction,
} from "@builders/db"
import {
  assignDraftIds,
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

type StockUnitSnapshot = {
  stockUnitName: string | null
  stockUnitAbbrev: string | null
}

export async function saveImportStagedInventorySectionUseCase(
  input: SaveImportStagedInventorySectionInput,
  client?: Prisma.TransactionClient,
): Promise<SaveImportStagedInventorySectionResult> {
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
      ]),
    )
    const products = await Promise.all(
      distinctProductIds.map(async (productId) => ({
        productId,
        product: await getProductById(productId, c),
      })),
    )
    const snapshotByProductId = new Map<string, StockUnitSnapshot>()
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
      snapshotByProductId.set(entry.productId, {
        stockUnitName: entry.product.stockUnitName ?? null,
        stockUnitAbbrev: entry.product.stockUnitAbbrev ?? null,
      })
    }

    const [existingFilters, existingStagedRows] = await Promise.all([
      listFilterRowDiffSummariesByImport(input.importEntryId, c),
      listStagedInventoryRowDiffSummariesByImport(input.importEntryId, c),
    ])

    const filterIssues = validateStagedInventoryFiltersDiff(input.diff.filters, {
      existing: existingFilters,
      knownProductIds: distinctProductIds,
      stagedRows: { diff: input.diff.rows, existing: existingStagedRows },
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
      filterDiff: input.diff.filters,
      existingFilterRowIds: existingFilters.map((f) => f.id),
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

    const modifiedFiltersById = new Map(
      input.diff.filters.modified.map((m) => [m.id, m]),
    )
    function resolveFilterProductId(filterRowId: string): string | null {
      const modified = modifiedFiltersById.get(filterRowId)
      if (modified) return modified.form.productId
      const existing = existingFilters.find((row) => row.id === filterRowId)
      return existing?.productId ?? null
    }

    const stagedRowAddedInputs = rowsAddedWithIds.map((draft) => {
      const productId = resolveFilterProductId(draft.filterRowId)
      if (!productId) {
        throw new ImportStagedInventorySectionExecutionError({
          code: "SECTION_ROW_DIFF_VALIDATION_FAILED",
          message: "Staged row's parent filter row could not be resolved.",
          status: 500,
          payload: { filterRowId: draft.filterRowId, tempId: draft.tempId },
        })
      }
      const snapshot = snapshotByProductId.get(productId)
      return {
        id: draft.id,
        tempId: draft.tempId,
        input: {
          filterRowId: draft.filterRowId,
          productId,
          warehouseId: parent.warehouseId,
          stockUnitName: snapshot?.stockUnitName ?? null,
          stockUnitAbbrev: snapshot?.stockUnitAbbrev ?? null,
          rollNumber: draft.form.rollNumber || null,
          dyeLot: draft.form.dyeLot || null,
          location: draft.form.location || null,
          startingStock: draft.form.startingStock,
          note: draft.form.note || null,
        },
        _needsExistingFilterSnapshot: !snapshot,
        _filterRowIdForEnrichment: draft.filterRowId,
      }
    })

    const missingFilterRowIds = Array.from(
      new Set(
        stagedRowAddedInputs
          .filter((entry) => entry._needsExistingFilterSnapshot)
          .map((entry) => entry._filterRowIdForEnrichment),
      ),
    )
    if (missingFilterRowIds.length > 0) {
      const productIdByFilterRowId = new Map<string, string>()
      for (const summary of existingFilters) {
        if (missingFilterRowIds.includes(summary.id)) {
          productIdByFilterRowId.set(summary.id, summary.productId)
        }
      }
      const distinctMissingProductIds = Array.from(
        new Set(Array.from(productIdByFilterRowId.values())),
      )
      const missingProducts = await Promise.all(
        distinctMissingProductIds.map(async (productId) => ({
          productId,
          product: await getProductById(productId, c),
        })),
      )
      for (const entry of missingProducts) {
        if (!entry.product) {
          throw new ImportStagedInventorySectionExecutionError({
            code: "SECTION_ROW_VALIDATION_FAILED",
            message: "Existing filter row's product no longer exists.",
            status: 400,
            payload: { productId: entry.productId },
          })
        }
        snapshotByProductId.set(entry.productId, {
          stockUnitName: entry.product.stockUnitName ?? null,
          stockUnitAbbrev: entry.product.stockUnitAbbrev ?? null,
        })
      }
      for (const entry of stagedRowAddedInputs) {
        if (!entry._needsExistingFilterSnapshot) continue
        const snapshot = snapshotByProductId.get(entry.input.productId)
        if (!snapshot) continue
        entry.input.stockUnitName = snapshot.stockUnitName
        entry.input.stockUnitAbbrev = snapshot.stockUnitAbbrev
      }
    }

    return applyImportStagedInventorySectionDiff(c, {
      importEntryId: input.importEntryId,
      filters: {
        added: filtersAddedWithIds.map((draft) => ({
          id: draft.id,
          tempId: draft.tempId,
          input: {
            categoryFilterId: draft.form.categoryFilterId,
            productId: draft.form.productId,
            stockOrdered: draft.form.stockOrdered,
            ...snapshotByProductId.get(draft.form.productId)!,
          },
        })),
        modified: input.diff.filters.modified.map((update) => ({
          id: update.id,
          input: {
            categoryFilterId: update.form.categoryFilterId,
            productId: update.form.productId,
            stockOrdered: update.form.stockOrdered,
            ...snapshotByProductId.get(update.form.productId)!,
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
            rollNumber: update.form.rollNumber || null,
            dyeLot: update.form.dyeLot || null,
            location: update.form.location || null,
            startingStock: update.form.startingStock,
            note: update.form.note || null,
          },
        })),
        deleted: input.diff.rows.deleted.map((d) => ({ id: d.id })),
      },
    })
  })
}
