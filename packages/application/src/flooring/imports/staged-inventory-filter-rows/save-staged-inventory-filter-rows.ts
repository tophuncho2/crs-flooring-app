import { randomUUID } from "node:crypto"
import {
  Prisma,
  applyStagedInventoryFiltersDiff,
  getImportById,
  getProductById,
  listFilterRowDiffSummariesByImport,
  withDatabaseTransaction,
} from "@builders/db"
import {
  assignDraftIds,
  describeStagedInventoryFilterDiffIssues,
  describeStagedInventoryFilterValidationIssues,
  validateStagedInventoryFilterForm,
  validateStagedInventoryFiltersDiff,
} from "@builders/domain"
import { StagedInventoryFilterExecutionError } from "./errors.js"
import type {
  SaveStagedInventoryFiltersInput,
  SaveStagedInventoryFiltersResult,
} from "./types.js"

type StockUnitSnapshot = {
  stockUnitName: string | null
  stockUnitAbbrev: string | null
}

/**
 * Diff-save use case for the filter-rows section. Mirrors WOMI's
 * `saveWorkOrderMaterialItemsSectionUseCase`:
 *  1. Lock parent import FOR UPDATE.
 *  2. Per-row form validation (added + modified).
 *  3. Batch-fetch every distinct product referenced; build the
 *     stockUnit snapshot map. Missing product → 400.
 *  4. Pre-read existing filter row summaries for diff validation.
 *  5. Domain `validateStagedInventoryFiltersDiff` — duplicate product,
 *     locked-with-children, delete-blocked-by-children, unknown
 *     product.
 *  6. Assign UUIDs to drafts via the shared `assignDraftIds`.
 *  7. Hand off to `applyStagedInventoryFiltersDiff`. The data layer
 *     applies in dependency order (delete → tempIdMap → createMany →
 *     updates → reload) and returns the post-state.
 */
export async function saveStagedInventoryFiltersSectionUseCase(
  input: SaveStagedInventoryFiltersInput,
  client?: Prisma.TransactionClient,
): Promise<SaveStagedInventoryFiltersResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    await c.$queryRaw(
      Prisma.sql`SELECT "id" FROM "flooring_import_entry" WHERE "id" = ${input.importEntryId} FOR UPDATE`,
    )

    const parent = await getImportById(input.importEntryId, c)
    if (!parent) {
      throw new StagedInventoryFilterExecutionError({
        code: "FILTER_PARENT_NOT_FOUND",
        message: "Import not found.",
        status: 404,
      })
    }

    // Per-row form validation.
    for (const draft of input.diff.added) {
      const issues = validateStagedInventoryFilterForm(draft.form)
      if (issues.length > 0) {
        throw new StagedInventoryFilterExecutionError({
          code: "FILTER_VALIDATION_FAILED",
          message: describeStagedInventoryFilterValidationIssues(issues),
          status: 400,
          payload: { refKind: "tempId", ref: draft.tempId, issues },
        })
      }
    }
    for (const update of input.diff.modified) {
      const issues = validateStagedInventoryFilterForm(update.form)
      if (issues.length > 0) {
        throw new StagedInventoryFilterExecutionError({
          code: "FILTER_VALIDATION_FAILED",
          message: describeStagedInventoryFilterValidationIssues(issues),
          status: 400,
          payload: { refKind: "id", ref: update.id, issues },
        })
      }
    }

    // Batch-fetch distinct products + build snapshot map.
    const distinctProductIds = Array.from(
      new Set([
        ...input.diff.added.map((d) => d.form.productId),
        ...input.diff.modified.map((m) => m.form.productId),
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
        throw new StagedInventoryFilterExecutionError({
          code: "FILTER_VALIDATION_FAILED",
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

    // Domain diff validation.
    const existing = await listFilterRowDiffSummariesByImport(input.importEntryId, c)
    const issues = validateStagedInventoryFiltersDiff(input.diff, {
      existing,
      knownProductIds: distinctProductIds,
    })
    if (issues.length > 0) {
      throw new StagedInventoryFilterExecutionError({
        code: "FILTER_DIFF_VALIDATION_FAILED",
        message: describeStagedInventoryFilterDiffIssues(issues),
        status: 400,
        payload: { issues },
      })
    }

    const addedWithIds = assignDraftIds(input.diff.added, randomUUID)

    return applyStagedInventoryFiltersDiff(c, {
      importEntryId: input.importEntryId,
      added: addedWithIds.map((draft) => ({
        id: draft.id,
        tempId: draft.tempId,
        input: {
          categoryFilterId: draft.form.categoryFilterId,
          productId: draft.form.productId,
          stockOrdered: draft.form.stockOrdered,
          ...snapshotByProductId.get(draft.form.productId)!,
        },
      })),
      modified: input.diff.modified.map((update) => ({
        id: update.id,
        input: {
          categoryFilterId: update.form.categoryFilterId,
          productId: update.form.productId,
          stockOrdered: update.form.stockOrdered,
          ...snapshotByProductId.get(update.form.productId)!,
        },
      })),
      deleted: input.diff.deleted.map((d) => ({ id: d.id })),
    })
  })
}
