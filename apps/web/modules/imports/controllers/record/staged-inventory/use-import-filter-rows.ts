"use client"

import { useCallback, useMemo } from "react"
import {
  createLocalRecordRowId,
  createRecordSectionError,
  isLocalOnlyRecordRow,
  useRecordScopedSectionController,
} from "@/engines/record-view"
import type {
  ImportDetail,
  ImportStagedInventorySectionDiff,
  ProductOption,
  StagedInventoryFilterRow,
  StagedInventoryFilterRowDelete,
  StagedInventoryFilterRowDraft,
  StagedInventoryFilterRowUpdate,
  StagedInventoryRow,
  StagedInventoryRowDelete,
  StagedInventoryRowDraft,
  StagedInventoryRowUpdate,
  UnitOfMeasureOption,
} from "@builders/domain"
import {
  createImportFilterRowDraft,
  createImportStagedRowDraft,
  createSectionRevisionKey,
  duplicateImportStagedRowDraft,
  toImportSectionLocalState,
  validateImportSection,
  type ImportFilterRowDraft,
  type ImportReconcileResponse,
  type ImportSectionLocalState,
  type ImportStagedRowDraft,
  type StagedRowProductSeed,
} from "@/modules/imports/controllers/record/drafts"
import { useSaveImportStagedInventorySectionMutation } from "./mutations/use-save-import-staged-inventory-section-mutation"

type SectionServerValue = {
  filterRows: StagedInventoryFilterRow[]
  stagedRows: StagedInventoryRow[]
}

function toFilterDiffForm(draft: ImportFilterRowDraft) {
  return {
    categoryFilterId: draft.categoryFilterId,
    productId: draft.productId,
    unitId: draft.unitId,
    stockOrdered: draft.stockOrdered,
  }
}

function toRowDiffForm(draft: ImportStagedRowDraft) {
  return {
    unitId: draft.unitId,
    rollNumber: draft.rollNumber,
    startingStock: draft.startingStock,
    cost: draft.cost,
    freight: draft.freight,
    dyeLot: draft.dyeLot,
    location: draft.location,
    note: draft.note,
  }
}

function filterFormIsDirty(
  draft: ImportFilterRowDraft,
  server: StagedInventoryFilterRow,
): boolean {
  return (
    draft.categoryFilterId !== server.categoryFilterId ||
    draft.productId !== server.productId ||
    draft.unitId !== server.unitId ||
    draft.stockOrdered !== server.stockOrdered
  )
}

function rowFormIsDirty(
  draft: ImportStagedRowDraft,
  server: StagedInventoryRow,
): boolean {
  return (
    draft.unitId !== server.unitId ||
    draft.rollNumber !== server.rollNumber ||
    draft.startingStock !== server.startingStock ||
    draft.cost !== server.cost ||
    draft.freight !== server.freight ||
    draft.dyeLot !== server.dyeLot ||
    draft.location !== server.location ||
    draft.note !== server.note
  )
}

/**
 * Build the combined section diff from the two flat draft lists vs. the server
 * snapshot. Planned Imports (filters) and Staged Inventory rows are independent
 * after the de-link — staged rows carry their own productId and attach to the
 * import directly, so an added staged row needs no parent to exist first.
 */
function buildSectionDiff(
  state: ImportSectionLocalState,
  serverValue: SectionServerValue,
): ImportStagedInventorySectionDiff {
  const filterServerById = new Map(serverValue.filterRows.map((row) => [row.id, row]))
  const stagedServerById = new Map(serverValue.stagedRows.map((row) => [row.id, row]))

  const liveFilterIds = new Set(
    state.filters.filter((d) => !isLocalOnlyRecordRow(d.clientId)).map((d) => d.clientId),
  )
  const liveStagedIds = new Set(
    state.stagedRows.filter((d) => !isLocalOnlyRecordRow(d.clientId)).map((d) => d.clientId),
  )

  const filtersAdded: StagedInventoryFilterRowDraft[] = []
  const filtersModified: StagedInventoryFilterRowUpdate[] = []
  const filtersDeleted: StagedInventoryFilterRowDelete[] = []
  const rowsAdded: StagedInventoryRowDraft[] = []
  const rowsModified: StagedInventoryRowUpdate[] = []
  const rowsDeleted: StagedInventoryRowDelete[] = []

  // --- Planned imports (filter rows) ---
  for (const draft of state.filters) {
    if (isLocalOnlyRecordRow(draft.clientId)) {
      filtersAdded.push({ tempId: draft.clientId, form: toFilterDiffForm(draft) })
      continue
    }
    const existingFilter = filterServerById.get(draft.clientId)
    if (!existingFilter) {
      // Server snapshot lost the filter row (shouldn't happen mid-session —
      // engine rebases on revisionKey changes). Treat as added so the server
      // reconciles.
      filtersAdded.push({ tempId: draft.clientId, form: toFilterDiffForm(draft) })
      continue
    }
    if (filterFormIsDirty(draft, existingFilter)) {
      filtersModified.push({ id: existingFilter.id, form: toFilterDiffForm(draft) })
    }
  }
  for (const serverRow of serverValue.filterRows) {
    if (!liveFilterIds.has(serverRow.id)) filtersDeleted.push({ id: serverRow.id })
  }

  // --- Staged inventory rows ---
  for (const draft of state.stagedRows) {
    if (isLocalOnlyRecordRow(draft.clientId)) {
      rowsAdded.push({
        tempId: draft.clientId,
        productId: draft.productId,
        form: toRowDiffForm(draft),
      })
      continue
    }
    const existingRow = stagedServerById.get(draft.clientId)
    if (!existingRow) {
      rowsAdded.push({
        tempId: draft.clientId,
        productId: draft.productId,
        form: toRowDiffForm(draft),
      })
      continue
    }
    // Only DRAFT rows are editable — server enforces; skip diff contributions
    // for non-DRAFT (QUEUED/IMPORTED) rows the worker owns.
    if (existingRow.status !== "DRAFT") continue
    if (rowFormIsDirty(draft, existingRow)) {
      rowsModified.push({ id: existingRow.id, form: toRowDiffForm(draft) })
    }
  }
  for (const serverRow of serverValue.stagedRows) {
    if (serverRow.status !== "DRAFT") continue
    if (!liveStagedIds.has(serverRow.id)) rowsDeleted.push({ id: serverRow.id })
  }

  // New filter drafts prepend (newest-first); reverse so the server stamps
  // createdAt oldest→newest in submission order.
  filtersAdded.reverse()

  return {
    filters: { added: filtersAdded, modified: filtersModified, deleted: filtersDeleted },
    rows: { added: rowsAdded, modified: rowsModified, deleted: rowsDeleted },
  }
}

function byCreatedAtDesc(
  a: StagedInventoryFilterRow,
  b: StagedInventoryFilterRow,
): number {
  return b.createdAt.localeCompare(a.createdAt)
}

/**
 * Combined section slice. Owns the engine's section controller for the two flat
 * draft lists (planned imports + staged rows), the combined diff save mutation
 * (via `onSave`), and the local-only add/duplicate/remove ops. Pure
 * orchestration + state — no UI assumptions.
 */
export function useImportFilterRows({
  record,
  filterRows,
  stagedRows,
  reconcileAfterWrite,
}: {
  record: ImportDetail
  filterRows: StagedInventoryFilterRow[]
  stagedRows: StagedInventoryRow[]
  // Single sync seam owned by the record controller. A section save stamps the
  // parent (aggregate-root actor), so its response must resync the shared
  // record's OCC token + the row arrays here — otherwise the next save 409s.
  reconcileAfterWrite: (response: ImportReconcileResponse) => void
}) {
  const saveSectionMutation = useSaveImportStagedInventorySectionMutation({
    importId: record.id,
  })

  const orderedFilterRows = useMemo(
    () => [...filterRows].sort(byCreatedAtDesc),
    [filterRows],
  )

  const serverValue = useMemo<SectionServerValue>(
    () => ({ filterRows: orderedFilterRows, stagedRows }),
    [orderedFilterRows, stagedRows],
  )

  const section = useRecordScopedSectionController<
    SectionServerValue,
    ImportSectionLocalState
  >({
    recordId: record.id,
    sectionKey: "staged-inventory",
    serverValue,
    serverRevisionKey: createSectionRevisionKey(record, serverValue),
    createLocalValue: toImportSectionLocalState,
    persistDraft: false,
    onSave: async (localValue, currentServer) => {
      const validationError = validateImportSection(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }

      const diff = buildSectionDiff(localValue, currentServer)
      const noChanges =
        diff.filters.added.length === 0 &&
        diff.filters.modified.length === 0 &&
        diff.filters.deleted.length === 0 &&
        diff.rows.added.length === 0 &&
        diff.rows.modified.length === 0 &&
        diff.rows.deleted.length === 0
      if (noChanges) {
        return {
          serverValue: currentServer,
          serverRevisionKey: createSectionRevisionKey(record, currentServer),
          noticeMessage: "No changes to save",
        }
      }

      const response = await saveSectionMutation.mutateAsync({
        diff,
        revisionKey: record.updatedAt,
      })
      const sortedFilters = [...response.filterRows].sort(byCreatedAtDesc)
      // Resync the shared record + row arrays through the one seam — the server
      // stamped the parent's updatedAt/updatedBy on this save, so the OCC token
      // must refresh or the next save 409s.
      reconcileAfterWrite({
        filterRows: sortedFilters,
        stagedRows: response.stagedRows,
        import: response.import,
      })

      const nextServer: SectionServerValue = {
        filterRows: sortedFilters,
        stagedRows: response.stagedRows,
      }
      return {
        serverValue: nextServer,
        serverRevisionKey: createSectionRevisionKey(response.import ?? record, nextServer),
        noticeMessage: "Staged inventory section saved",
      }
    },
  })

  // --- Planned import (filter row) ops ---

  const addFilterRow = useCallback(() => {
    section.setLocalValue((prev) => ({
      ...prev,
      filters: [
        createImportFilterRowDraft(createLocalRecordRowId("import-filter-row")),
        ...prev.filters,
      ],
    }))
    if (section.error) section.setError(null)
  }, [section])

  const removeFilterRow = useCallback(
    (clientId: string) => {
      section.setLocalValue((prev) => ({
        ...prev,
        filters: prev.filters.filter((row) => row.clientId !== clientId),
      }))
      if (section.error) section.setError(null)
    },
    [section],
  )

  const setFilterField = useCallback(
    <K extends keyof Pick<ImportFilterRowDraft, "productId" | "unitId" | "stockOrdered">>(
      clientId: string,
      field: K,
      value: ImportFilterRowDraft[K],
    ) => {
      section.setLocalValue((prev) => ({
        ...prev,
        filters: prev.filters.map((row) =>
          row.clientId === clientId ? { ...row, [field]: value } : row,
        ),
      }))
      if (section.error) section.setError(null)
    },
    [section],
  )

  const setFilterUnit = useCallback(
    (clientId: string, option: UnitOfMeasureOption | null) => {
      section.setLocalValue((prev) => ({
        ...prev,
        filters: prev.filters.map((row) =>
          row.clientId === clientId
            ? {
                ...row,
                unitId: option?.id ?? "",
                stockUnitName: option?.name ?? "",
                stockUnitAbbrev: option?.abbreviation ?? "",
              }
            : row,
        ),
      }))
      if (section.error) section.setError(null)
    },
    [section],
  )

  const setFilterCategoryFilter = useCallback(
    (clientId: string, categoryId: string | null) => {
      section.setLocalValue((prev) => ({
        ...prev,
        filters: prev.filters.map((row) =>
          row.clientId === clientId ? { ...row, categoryFilterId: categoryId } : row,
        ),
      }))
      if (section.error) section.setError(null)
    },
    [section],
  )

  const setFilterProductSnapshot = useCallback(
    (clientId: string, option: ProductOption | null) => {
      section.setLocalValue((prev) => ({
        ...prev,
        filters: prev.filters.map((row) => {
          if (row.clientId !== clientId) return row
          if (option === null) {
            return { ...row, productName: "", unitId: "", stockUnitName: "", stockUnitAbbrev: "" }
          }
          // Re-seed the unit FK from the picked product (UoM epic 2B) — mirrors
          // the material-item product-change re-snapshot.
          return {
            ...row,
            productName: option.name,
            unitId: option.unitId,
            stockUnitName: option.stockUnitName ?? "",
            stockUnitAbbrev: option.stockUnitAbbrev,
          }
        }),
      }))
    },
    [section],
  )

  // --- Staged-row local ops (no API calls — all part of the section diff) ---

  const addStagedRowDraft = useCallback(
    (seed: StagedRowProductSeed) => {
      section.setLocalValue((prev) => ({
        ...prev,
        stagedRows: [...prev.stagedRows, createImportStagedRowDraft(seed)],
      }))
      if (section.error) section.setError(null)
    },
    [section],
  )

  const duplicateStagedRowDraft = useCallback(
    (sourceClientId: string) => {
      section.setLocalValue((prev) => {
        const source = prev.stagedRows.find((s) => s.clientId === sourceClientId)
        // Only DRAFT rows can seed a duplicate.
        if (!source || source.status !== "DRAFT") return prev
        return {
          ...prev,
          stagedRows: [...prev.stagedRows, duplicateImportStagedRowDraft(source)],
        }
      })
      if (section.error) section.setError(null)
    },
    [section],
  )

  const removeStagedRowDraft = useCallback(
    (clientId: string) => {
      section.setLocalValue((prev) => ({
        ...prev,
        stagedRows: prev.stagedRows.filter((s) => s.clientId !== clientId),
      }))
      if (section.error) section.setError(null)
    },
    [section],
  )

  const setStagedRowField = useCallback(
    <K extends keyof Pick<
      ImportStagedRowDraft,
      "unitId" | "rollNumber" | "startingStock" | "cost" | "freight" | "dyeLot" | "location" | "note"
    >>(
      clientId: string,
      field: K,
      value: ImportStagedRowDraft[K],
    ) => {
      section.setLocalValue((prev) => ({
        ...prev,
        stagedRows: prev.stagedRows.map((s) =>
          s.clientId === clientId ? { ...s, [field]: value } : s,
        ),
      }))
      if (section.error) section.setError(null)
    },
    [section],
  )

  const setStagedRowUnit = useCallback(
    (clientId: string, option: UnitOfMeasureOption | null) => {
      section.setLocalValue((prev) => ({
        ...prev,
        stagedRows: prev.stagedRows.map((s) =>
          s.clientId === clientId
            ? {
                ...s,
                unitId: option?.id ?? "",
                // Refresh the display name too — the grid picker's trigger label
                // derives solely from `stockUnitName` (via `selectedLabel`), so
                // leaving it stale reverts the label to the product's default unit.
                stockUnitName: option?.name ?? "",
                stockUnitAbbrev: option?.abbreviation ?? "",
              }
            : s,
        ),
      }))
      if (section.error) section.setError(null)
    },
    [section],
  )

  return {
    section,
    addFilterRow,
    removeFilterRow,
    setFilterField,
    setFilterUnit,
    setFilterCategoryFilter,
    setFilterProductSnapshot,
    addStagedRowDraft,
    duplicateStagedRowDraft,
    removeStagedRowDraft,
    setStagedRowField,
    setStagedRowUnit,
  }
}
