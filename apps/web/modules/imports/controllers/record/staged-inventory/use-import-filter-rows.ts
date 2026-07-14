"use client"

import { useCallback, useMemo } from "react"
import {
  applyUnitSeed,
  buildConversionSeed,
  buildRowDiff,
  createLocalRecordRowId,
  createRecordSectionError,
  isLocalOnlyRecordRow,
  useRecordScopedSectionController,
} from "@/engines/record-view"
import type {
  ConversionFormulaOption,
  FlooringStagedRowStatus,
  ImportDetail,
  ImportStagedInventorySectionDiff,
  ProductOption,
  StagedInventoryFilterRow,
  StagedInventoryRow,
  UnitOfMeasureOption,
} from "@builders/domain"
import {
  buildServerStatusMap,
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
    productId: draft.productId,
    unitId: draft.unitId,
    stockOrdered: draft.stockOrdered,
    coverageUnitId: draft.coverageUnitId,
    coveragePerUnit: draft.coveragePerUnit,
    conversionFormulaId: draft.conversionFormulaId,
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
    coverageUnitId: draft.coverageUnitId,
    coveragePerUnit: draft.coveragePerUnit,
    conversionFormulaId: draft.conversionFormulaId,
  }
}

function filterFormIsDirty(
  draft: ImportFilterRowDraft,
  server: StagedInventoryFilterRow,
): boolean {
  return (
    draft.productId !== server.productId ||
    draft.unitId !== server.unitId ||
    draft.stockOrdered !== server.stockOrdered ||
    draft.coverageUnitId !== server.coverageUnitId ||
    draft.coveragePerUnit !== server.coveragePerUnit ||
    draft.conversionFormulaId !== server.conversionFormulaId
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
    draft.note !== server.note ||
    draft.coverageUnitId !== server.coverageUnitId ||
    draft.coveragePerUnit !== server.coveragePerUnit ||
    draft.conversionFormulaId !== server.conversionFormulaId
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
  // Live staged-row status per saved row id, from the poll-updated rows — NOT
  // the baseline snapshot, which freezes at mark-for-import time (QUEUED) and
  // never rebases on the worker's QUEUED→IMPORTED flip (status flips don't
  // change the section revision key). Reading live status here is what lets a
  // just-imported row's edit save without a browser refresh.
  liveStagedStatusById: Map<string, FlooringStagedRowStatus>,
): ImportStagedInventorySectionDiff {
  // A non-local draft whose server row vanished (shouldn't happen mid-session —
  // the engine rebases on revisionKey changes) is treated as added so the
  // server reconciles: onMissingServerRow "add". Filter drafts prepend
  // (newest-first) so reverseAdded stamps createdAt oldest→newest; staged rows
  // append at the bottom, so no reverse there.
  const filters = buildRowDiff({
    locals: state.filters,
    serverRows: serverValue.filterRows,
    getLocalId: (draft) => draft.clientId,
    isLocalOnly: isLocalOnlyRecordRow,
    differs: filterFormIsDirty,
    toAdded: (draft) => ({ tempId: draft.clientId, form: toFilterDiffForm(draft) }),
    toModified: (draft, server) => ({ id: server.id, form: toFilterDiffForm(draft) }),
    reverseAdded: true,
    onMissingServerRow: "add",
  })

  // Rows are editable/deletable in any state except QUEUED (the worker owns
  // QUEUED rows mid-import). IMPORTED rows are editable history now that the
  // inventory->staged FK is severed, so the eligibility gate only keeps QUEUED
  // rows out of both modified and deleted — read from the live status map, not
  // the frozen baseline snapshot, so a QUEUED→IMPORTED flip is honored.
  const rows = buildRowDiff({
    locals: state.stagedRows,
    serverRows: serverValue.stagedRows,
    getLocalId: (draft) => draft.clientId,
    isLocalOnly: isLocalOnlyRecordRow,
    differs: rowFormIsDirty,
    toAdded: (draft) => ({
      tempId: draft.clientId,
      productId: draft.productId,
      form: toRowDiffForm(draft),
    }),
    toModified: (draft, server) => ({ id: server.id, form: toRowDiffForm(draft) }),
    onMissingServerRow: "add",
    isServerRowEligible: (server) =>
      (liveStagedStatusById.get(server.id) ?? server.status) !== "QUEUED",
  })

  return { filters, rows }
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

      // Live status from the poll-updated `stagedRows` prop (this onSave closure
      // is recreated each render, so it captures the freshest array). Lets the
      // eligibility gate see a row's real IMPORTED status even though the
      // baseline `currentServer` still snapshots it as QUEUED.
      const liveStagedStatusById = buildServerStatusMap(stagedRows)
      const diff = buildSectionDiff(localValue, currentServer, liveStagedStatusById)
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
    <K extends keyof Pick<ImportFilterRowDraft, "productId" | "unitId" | "stockOrdered" | "coveragePerUnit">>(
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
            ? applyUnitSeed(
                row,
                option && {
                  unitId: option.id,
                  unitName: option.name,
                  unitAbbrev: option.abbreviation,
                },
                { nameKey: "unitName", abbrevKey: "unitAbbrev" },
              )
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
          // Re-seed the unit FK from the picked product (UoM epic 2B) — mirrors
          // the material-item product-change re-snapshot.
          const unitSeeded = applyUnitSeed(
            row,
            option && {
              unitId: option.unitId,
              unitName: option.unitName,
              unitAbbrev: option.unitAbbrev,
            },
            { nameKey: "unitName", abbrevKey: "unitAbbrev" },
          )
          // Also re-seed the conversion trio from the picked product (all three
          // stay editable). Cleared to "" when the product is deselected.
          const seeded = buildConversionSeed(unitSeeded, option)
          return { ...seeded, productName: option?.name ?? "" }
        }),
      }))
    },
    [section],
  )

  const setFilterCoverageUnit = useCallback(
    (clientId: string, option: UnitOfMeasureOption | null) => {
      section.setLocalValue((prev) => ({
        ...prev,
        filters: prev.filters.map((row) =>
          row.clientId === clientId
            ? {
                ...row,
                coverageUnitId: option?.id ?? "",
                coverageUnitName: option?.name ?? "",
                coverageUnitAbbrev: option?.abbreviation ?? "",
              }
            : row,
        ),
      }))
      if (section.error) section.setError(null)
    },
    [section],
  )

  const setFilterFormula = useCallback(
    (clientId: string, option: ConversionFormulaOption | null) => {
      section.setLocalValue((prev) => ({
        ...prev,
        filters: prev.filters.map((row) =>
          row.clientId === clientId
            ? {
                ...row,
                conversionFormulaId: option?.id ?? "",
                conversionFormulaName: option?.name ?? "",
              }
            : row,
        ),
      }))
      if (section.error) section.setError(null)
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
        // Any row except QUEUED can seed a duplicate (the copy is always a fresh
        // DRAFT); QUEUED rows are locked mid-import.
        if (!source || source.status === "QUEUED") return prev
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
      | "unitId"
      | "rollNumber"
      | "startingStock"
      | "cost"
      | "freight"
      | "dyeLot"
      | "location"
      | "note"
      | "coveragePerUnit"
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

  const setStagedRowCoverageUnit = useCallback(
    (clientId: string, option: UnitOfMeasureOption | null) => {
      section.setLocalValue((prev) => ({
        ...prev,
        stagedRows: prev.stagedRows.map((s) =>
          s.clientId === clientId
            ? {
                ...s,
                coverageUnitId: option?.id ?? "",
                coverageUnitName: option?.name ?? "",
                coverageUnitAbbrev: option?.abbreviation ?? "",
              }
            : s,
        ),
      }))
      if (section.error) section.setError(null)
    },
    [section],
  )

  const setStagedRowFormula = useCallback(
    (clientId: string, option: ConversionFormulaOption | null) => {
      section.setLocalValue((prev) => ({
        ...prev,
        stagedRows: prev.stagedRows.map((s) =>
          s.clientId === clientId
            ? {
                ...s,
                conversionFormulaId: option?.id ?? "",
                conversionFormulaName: option?.name ?? "",
              }
            : s,
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
        // Refresh the display name too — the grid picker's trigger label derives
        // solely from `unitName` (via `selectedLabel`), so leaving it stale
        // reverts the label to the product's default unit.
        stagedRows: prev.stagedRows.map((s) =>
          s.clientId === clientId
            ? applyUnitSeed(
                s,
                option && {
                  unitId: option.id,
                  unitName: option.name,
                  unitAbbrev: option.abbreviation,
                },
                { nameKey: "unitName", abbrevKey: "unitAbbrev" },
              )
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
    setFilterCoverageUnit,
    setFilterFormula,
    addStagedRowDraft,
    duplicateStagedRowDraft,
    removeStagedRowDraft,
    setStagedRowField,
    setStagedRowUnit,
    setStagedRowCoverageUnit,
    setStagedRowFormula,
  }
}
