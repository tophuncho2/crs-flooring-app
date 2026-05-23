import { randomUUID } from "node:crypto"
import {
  Prisma,
  applyImportStagedInventorySectionDiff,
  getImportById,
  getProductById,
  listFilterRowDiffSummariesByImport,
  listStagedInventoryRowDiffSummariesByImport,
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

/**
 * Combined diff-save use case for the imports record-view's
 * "staged inventory" section. Supersedes
 * `saveStagedInventoryFiltersSectionUseCase` — the section now bundles
 * both filter-row and staged-row CRUD into a single atomic save.
 *
 * Flow:
 *  1. Lock parent import FOR UPDATE.
 *  2. Validate every filter-row form (added + modified).
 *  3. Validate every staged-row form (added + modified).
 *  4. Batch-fetch products for filter-row diffs; build stockUnit
 *     snapshot map.
 *  5. Pre-read existing filter-row + staged-row summaries.
 *  6. Run cross-slice diff validators (filters honor post-diff
 *     children; staged-rows reject orphaned-parent + non-DRAFT cases).
 *  7. Assign UUIDs to drafts on both slices.
 *  8. Resolve each staged-row added's snapshot fields from its parent
 *     filter row's POST-DIFF productId + stockUnit (using the same
 *     batch-fetched product map). The unsaved-parent rule means
 *     `filterRowId` always points to a real existing filter row.
 *  9. Hand off to `applyImportStagedInventorySectionDiff`. Data layer
 *     applies in dependency order (delete rows → delete filters →
 *     create filters → update filters → create rows → update rows →
 *     reload) and returns the post-state for both slices + both
 *     tempId maps.
 */
export async function saveImportStagedInventorySectionUseCase(
  input: SaveImportStagedInventorySectionInput,
  client?: Prisma.TransactionClient,
): Promise<SaveImportStagedInventorySectionResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    await c.$queryRaw(
      Prisma.sql`SELECT "id" FROM "flooring_import_entry" WHERE "id" = ${input.importEntryId} FOR UPDATE`,
    )

    const parent = await getImportById(input.importEntryId, c)
    if (!parent) {
      throw new ImportStagedInventorySectionExecutionError({
        code: "SECTION_PARENT_NOT_FOUND",
        message: "Import not found.",
        status: 404,
      })
    }

    // Step 2 — filter-row form validation.
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

    // Step 3 — staged-row form validation.
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

    // Step 4 — batch-fetch products referenced by filter-row diffs +
    // build snapshot map.
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

    // Step 5 — pre-read existing summaries for both slices.
    const [existingFilters, existingStagedRows] = await Promise.all([
      listFilterRowDiffSummariesByImport(input.importEntryId, c),
      listStagedInventoryRowDiffSummariesByImport(input.importEntryId, c),
    ])

    // Step 6 — cross-slice diff validators.
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

    // Step 7 — pre-assign UUIDs to drafts.
    const filtersAddedWithIds = assignDraftIds(input.diff.filters.added, randomUUID)
    const rowsAddedWithIds = assignDraftIds(input.diff.rows.added, randomUUID)

    // Step 8 — resolve staged-row added snapshots from parent filter
    // POST-DIFF state. Build a lookup that returns the productId for
    // any filterRowId, preferring `filters.modified` over `existing`.
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
        // Cleared earlier by the staged-rows diff validator
        // (STAGED_ROW_PARENT_NOT_FOUND); the throw here is just a
        // defensive backstop.
        throw new ImportStagedInventorySectionExecutionError({
          code: "SECTION_ROW_DIFF_VALIDATION_FAILED",
          message: "Staged row's parent filter row could not be resolved.",
          status: 500,
          payload: { filterRowId: draft.filterRowId, tempId: draft.tempId },
        })
      }
      const snapshot = snapshotByProductId.get(productId)
      // If the parent filter row is `existing` (not modified), its
      // snapshot is already in the DB but wasn't in our batch-fetch.
      // Fall back to the existing summary's product — but
      // listFilterRowDiffSummariesByImport doesn't carry stockUnit, so
      // we re-derive from the existing snapshot via the DB read below.
      return {
        id: draft.id,
        tempId: draft.tempId,
        input: {
          filterRowId: draft.filterRowId,
          productId,
          warehouseId: parent.warehouseId,
          // Snapshot may be missing if the parent filter row isn't in
          // the batch-fetched set (i.e. the parent is `existing`, not
          // being added/modified). We handle that by enriching after
          // the loop with a targeted re-read.
          stockUnitName: snapshot?.stockUnitName ?? null,
          stockUnitAbbrev: snapshot?.stockUnitAbbrev ?? null,
          rollNumber: draft.form.rollNumber || null,
          dyeLot: draft.form.dyeLot || null,
          location: draft.form.location || null,
          startingStock: draft.form.startingStock,
          note: draft.form.note || null,
        },
        // Stash for the enrichment pass.
        _needsExistingFilterSnapshot: !snapshot,
        _filterRowIdForEnrichment: draft.filterRowId,
      }
    })

    // For staged-row drafts whose parent filter row isn't being
    // added/modified in this diff, snapshot the parent's persisted
    // productId → re-fetch products only for the missing ones. Keeps
    // the typical path (adding a row under an already-saved unchanged
    // filter) to one batch-fetch.
    const missingFilterRowIds = Array.from(
      new Set(
        stagedRowAddedInputs
          .filter((entry) => entry._needsExistingFilterSnapshot)
          .map((entry) => entry._filterRowIdForEnrichment),
      ),
    )
    if (missingFilterRowIds.length > 0) {
      // The diff summaries list carries productId already; use it as
      // the source of truth for which product to snapshot. The
      // stockUnit fields come from the FlooringProduct row.
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
