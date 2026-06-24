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
} from "@builders/domain"
import {
  createImportFilterRowDraft,
  createImportStagedRowDraft,
  createSectionRevisionKey,
  duplicateImportStagedRowDraft,
  toImportFilterRowDrafts,
  validateImportFilterRowDrafts,
  type ImportFilterRowDraft,
  type ImportReconcileResponse,
  type ImportStagedRowDraft,
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
    stockOrdered: draft.stockOrdered,
  }
}

function toRowDiffForm(draft: ImportStagedRowDraft) {
  return {
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
    draft.stockOrdered !== server.stockOrdered
  )
}

function rowFormIsDirty(
  draft: ImportStagedRowDraft,
  server: StagedInventoryRow,
): boolean {
  return (
    draft.rollNumber !== server.rollNumber ||
    draft.startingStock !== server.startingStock ||
    draft.cost !== server.cost ||
    draft.freight !== server.freight ||
    draft.dyeLot !== server.dyeLot ||
    draft.location !== server.location ||
    draft.note !== server.note
  )
}

function buildSectionDiff(
  drafts: ImportFilterRowDraft[],
  serverValue: SectionServerValue,
): ImportStagedInventorySectionDiff {
  const filterServerById = new Map(serverValue.filterRows.map((row) => [row.id, row]))
  const stagedServerById = new Map(serverValue.stagedRows.map((row) => [row.id, row]))

  const liveFilterIds = new Set(
    drafts.filter((draft) => !isLocalOnlyRecordRow(draft.clientId)).map((d) => d.clientId),
  )

  const filtersAdded: StagedInventoryFilterRowDraft[] = []
  const filtersModified: StagedInventoryFilterRowUpdate[] = []
  const filtersDeleted: StagedInventoryFilterRowDelete[] = []
  const rowsAdded: StagedInventoryRowDraft[] = []
  const rowsModified: StagedInventoryRowUpdate[] = []
  const rowsDeleted: StagedInventoryRowDelete[] = []
  const liveStagedRowIds = new Set<string>()

  for (const draft of drafts) {
    if (isLocalOnlyRecordRow(draft.clientId)) {
      // New filter draft — children aren't allowed (unsaved-parent rule),
      // so its `stagedRows` list is always empty by the controller's
      // add/duplicate guards. We still skip its rows defensively.
      filtersAdded.push({ tempId: draft.clientId, form: toFilterDiffForm(draft) })
      continue
    }
    const existingFilter = filterServerById.get(draft.clientId)
    if (!existingFilter) {
      // Server snapshot lost the filter row (shouldn't happen mid-session
      // — engine rebases on revisionKey changes). Treat as added so the
      // server reconciles.
      filtersAdded.push({ tempId: draft.clientId, form: toFilterDiffForm(draft) })
      continue
    }
    if (filterFormIsDirty(draft, existingFilter)) {
      filtersModified.push({ id: existingFilter.id, form: toFilterDiffForm(draft) })
    }

    // Walk this filter's staged drafts.
    for (const stagedDraft of draft.stagedRows) {
      if (isLocalOnlyRecordRow(stagedDraft.clientId)) {
        rowsAdded.push({
          tempId: stagedDraft.clientId,
          filterRowId: existingFilter.id,
          form: toRowDiffForm(stagedDraft),
        })
        continue
      }
      liveStagedRowIds.add(stagedDraft.clientId)
      const existingRow = stagedServerById.get(stagedDraft.clientId)
      if (!existingRow) {
        // Defensive — same as filter case above.
        rowsAdded.push({
          tempId: stagedDraft.clientId,
          filterRowId: existingFilter.id,
          form: toRowDiffForm(stagedDraft),
        })
        continue
      }
      // Only DRAFT rows are editable — server enforces; we skip diff
      // contributions for non-DRAFT rows.
      if (existingRow.status !== "DRAFT") continue
      if (rowFormIsDirty(stagedDraft, existingRow)) {
        rowsModified.push({ id: existingRow.id, form: toRowDiffForm(stagedDraft) })
      }
    }
  }

  // Newest drafts iterate prepend-first; reverse for stable createdAt
  // ordering on the server.
  filtersAdded.reverse()
  rowsAdded.reverse()

  // Filter rows present on the server but absent from drafts → delete.
  for (const serverRow of serverValue.filterRows) {
    if (!liveFilterIds.has(serverRow.id)) {
      filtersDeleted.push({ id: serverRow.id })
    }
  }

  // Staged rows present on the server but absent from any draft's
  // stagedRows list → delete. Skip non-DRAFT rows (worker owns them).
  for (const serverRow of serverValue.stagedRows) {
    if (serverRow.status !== "DRAFT") continue
    if (liveStagedRowIds.has(serverRow.id)) continue
    // Also skip if the parent filter row itself is being deleted —
    // the server's filter-delete handles the cascade via the
    // accompanying row delete entries already collected above; the
    // filter-diff validator and the combined apply both honor this.
    rowsDeleted.push({ id: serverRow.id })
  }

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
 * Combined section slice. Owns the engine's section controller for the
 * nested filter+staged-row drafts, the combined diff save mutation (via
 * `onSave`), and the local-only add/duplicate/remove ops for staged
 * rows. Pure orchestration + state — no UI assumptions.
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
    ImportFilterRowDraft[]
  >({
    recordId: record.id,
    sectionKey: "staged-inventory",
    serverValue,
    serverRevisionKey: createSectionRevisionKey(record, serverValue),
    createLocalValue: toImportFilterRowDrafts,
    persistDraft: false,
    policy: {
      addRowPlacement: "top",
      childRows: "inline",
    },
    onSave: async (localValue, currentServer) => {
      const validationError = validateImportFilterRowDrafts(localValue)
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

  const addFilterRow = useCallback(() => {
    section.setLocalValue((prev) => [
      createImportFilterRowDraft(createLocalRecordRowId("import-filter-row")),
      ...prev,
    ])
    if (section.error) section.setError(null)
  }, [section])

  const removeFilterRow = useCallback(
    (clientId: string) => {
      section.setLocalValue((prev) => prev.filter((row) => row.clientId !== clientId))
      if (section.error) section.setError(null)
    },
    [section],
  )

  const setFilterField = useCallback(
    <K extends keyof Pick<ImportFilterRowDraft, "productId" | "stockOrdered">>(
      clientId: string,
      field: K,
      value: ImportFilterRowDraft[K],
    ) => {
      section.setLocalValue((prev) =>
        prev.map((row) => (row.clientId === clientId ? { ...row, [field]: value } : row)),
      )
      if (section.error) section.setError(null)
    },
    [section],
  )

  const setFilterCategoryFilter = useCallback(
    (clientId: string, categoryId: string | null) => {
      section.setLocalValue((prev) =>
        prev.map((row) =>
          row.clientId === clientId ? { ...row, categoryFilterId: categoryId } : row,
        ),
      )
      if (section.error) section.setError(null)
    },
    [section],
  )

  const setFilterProductSnapshot = useCallback(
    (clientId: string, option: ProductOption | null) => {
      section.setLocalValue((prev) =>
        prev.map((row) => {
          if (row.clientId !== clientId) return row
          if (option === null) {
            return { ...row, productName: "", stockUnitName: "", stockUnitAbbrev: "" }
          }
          return {
            ...row,
            productName: option.name,
            stockUnitName: option.stockUnitName ?? "",
            stockUnitAbbrev: option.stockUnitAbbrev,
          }
        }),
      )
    },
    [section],
  )

  // --- Staged-row local ops (no API calls — all part of the section diff) ---

  const addStagedRowDraft = useCallback(
    (filterClientId: string) => {
      // Unsaved-parent rule: refuse to add a child under a local-only
      // filter draft. The component layer also gates this, but we
      // keep a backstop here.
      if (isLocalOnlyRecordRow(filterClientId)) return
      section.setLocalValue((prev) =>
        prev.map((row) => {
          if (row.clientId !== filterClientId) return row
          return {
            ...row,
            stagedRows: [...row.stagedRows, createImportStagedRowDraft(row)],
          }
        }),
      )
      if (section.error) section.setError(null)
    },
    [section],
  )

  const duplicateStagedRowDraft = useCallback(
    (filterClientId: string, sourceClientId: string) => {
      if (isLocalOnlyRecordRow(filterClientId)) return
      section.setLocalValue((prev) =>
        prev.map((row) => {
          if (row.clientId !== filterClientId) return row
          const source = row.stagedRows.find((s) => s.clientId === sourceClientId)
          if (!source) return row
          // Only DRAFT rows can seed a duplicate.
          if (source.status !== "DRAFT") return row
          return {
            ...row,
            stagedRows: [...row.stagedRows, duplicateImportStagedRowDraft(source)],
          }
        }),
      )
      if (section.error) section.setError(null)
    },
    [section],
  )

  const removeStagedRowDraft = useCallback(
    (filterClientId: string, rowClientId: string) => {
      section.setLocalValue((prev) =>
        prev.map((row) => {
          if (row.clientId !== filterClientId) return row
          return {
            ...row,
            stagedRows: row.stagedRows.filter((s) => s.clientId !== rowClientId),
          }
        }),
      )
      if (section.error) section.setError(null)
    },
    [section],
  )

  const setStagedRowField = useCallback(
    <K extends keyof Pick<
      ImportStagedRowDraft,
      "rollNumber" | "startingStock" | "cost" | "freight" | "dyeLot" | "location" | "note"
    >>(
      filterClientId: string,
      rowClientId: string,
      field: K,
      value: ImportStagedRowDraft[K],
    ) => {
      section.setLocalValue((prev) =>
        prev.map((row) => {
          if (row.clientId !== filterClientId) return row
          return {
            ...row,
            stagedRows: row.stagedRows.map((s) =>
              s.clientId === rowClientId ? { ...s, [field]: value } : s,
            ),
          }
        }),
      )
      if (section.error) section.setError(null)
    },
    [section],
  )

  return {
    section,
    addFilterRow,
    removeFilterRow,
    setFilterField,
    setFilterCategoryFilter,
    setFilterProductSnapshot,
    addStagedRowDraft,
    duplicateStagedRowDraft,
    removeStagedRowDraft,
    setStagedRowField,
  }
}
