"use client"

import { useCallback, useMemo } from "react"
import {
  createLocalRecordRowId,
  createRecordSectionError,
  isLocalOnlyRecordRow,
  useRecordScopedSectionController,
} from "@/modules/shared/engines/record-view"
import type {
  ImportDetail,
  ProductOption,
  StagedInventoryFilterRow,
  StagedInventoryFilterRowDelete,
  StagedInventoryFilterRowDraft,
  StagedInventoryFilterRowUpdate,
  StagedInventoryFiltersDiff,
  StagedInventoryRow,
} from "@builders/domain"
import {
  createImportFilterRowDraft,
  toImportFilterRowDrafts,
  validateImportFilterRowDrafts,
  type ImportFilterRowDraft,
} from "@/modules/imports/controllers/record/drafts"
import { useSaveFilterRowsMutation } from "./mutations/use-save-filter-rows-mutation"
import { useDuplicateStagedRowMutation } from "./mutations/use-duplicate-staged-row-mutation"
import { useInlineDeleteStagedRowMutation } from "./mutations/use-inline-delete-staged-row-mutation"
import type { StagedInvRowPanelPatch } from "./types"

function createRevisionKey(record: ImportDetail, filterRows: StagedInventoryFilterRow[]) {
  return `${record.updatedAt}:${filterRows.length}`
}

function toDraftForm(draft: ImportFilterRowDraft) {
  return {
    categoryFilterId: draft.categoryFilterId,
    productId: draft.productId,
    stockOrdered: draft.stockOrdered,
  }
}

function formIsDirty(draft: ImportFilterRowDraft, server: StagedInventoryFilterRow): boolean {
  return (
    draft.categoryFilterId !== server.categoryFilterId ||
    draft.productId !== server.productId ||
    draft.stockOrdered !== server.stockOrdered
  )
}

function buildFiltersDiff(
  drafts: ImportFilterRowDraft[],
  serverRows: StagedInventoryFilterRow[],
): StagedInventoryFiltersDiff {
  const serverById = new Map(serverRows.map((row) => [row.id, row]))
  const liveDraftIds = new Set(
    drafts.filter((draft) => !isLocalOnlyRecordRow(draft.clientId)).map((d) => d.clientId),
  )

  const added: StagedInventoryFilterRowDraft[] = []
  const modified: StagedInventoryFilterRowUpdate[] = []
  const deleted: StagedInventoryFilterRowDelete[] = []

  for (const draft of drafts) {
    if (isLocalOnlyRecordRow(draft.clientId)) {
      added.push({ tempId: draft.clientId, form: toDraftForm(draft) })
      continue
    }
    const existing = serverById.get(draft.clientId)
    if (!existing) {
      added.push({ tempId: draft.clientId, form: toDraftForm(draft) })
      continue
    }
    if (formIsDirty(draft, existing)) {
      modified.push({ id: existing.id, form: toDraftForm(draft) })
    }
  }

  // Drafts iterate newest-first (prepend on add). Reverse so the server
  // creates oldest → newest, giving the newest draft the latest createdAt.
  added.reverse()

  for (const serverRow of serverRows) {
    if (!liveDraftIds.has(serverRow.id)) {
      deleted.push({ id: serverRow.id })
    }
  }

  return { added, modified, deleted }
}

function byCreatedAtDesc(
  a: StagedInventoryFilterRow,
  b: StagedInventoryFilterRow,
): number {
  return b.createdAt.localeCompare(a.createdAt)
}

/**
 * Filter-row slice: owns the engine's section controller for the filter-row
 * draft list, the bulk save-filter-rows mutation (via `onSave`), the inline
 * duplicate mutation, and the per-row patch path used by the side panel.
 * Pure orchestration + state — no UI assumptions.
 */
export function useImportFilterRows({
  record,
  filterRows,
  stagedRows,
  publishFilterRows,
  publishStagedRows,
}: {
  record: ImportDetail
  filterRows: StagedInventoryFilterRow[]
  stagedRows: StagedInventoryRow[]
  publishFilterRows: (rows: StagedInventoryFilterRow[]) => void
  publishStagedRows: (rows: StagedInventoryRow[]) => void
}) {
  const saveFilterRowsMutation = useSaveFilterRowsMutation({ importId: record.id })

  const orderedFilterRows = useMemo(
    () => [...filterRows].sort(byCreatedAtDesc),
    [filterRows],
  )

  const section = useRecordScopedSectionController<
    StagedInventoryFilterRow[],
    ImportFilterRowDraft[]
  >({
    recordId: record.id,
    sectionKey: "staged-inventory",
    serverValue: orderedFilterRows,
    serverRevisionKey: createRevisionKey(record, orderedFilterRows),
    createLocalValue: toImportFilterRowDrafts,
    persistDraft: false,
    policy: {
      addRowPlacement: "top",
      childRows: "none",
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

      const diff = buildFiltersDiff(localValue, currentServer)
      if (diff.added.length === 0 && diff.modified.length === 0 && diff.deleted.length === 0) {
        return {
          serverValue: currentServer,
          serverRevisionKey: createRevisionKey(record, currentServer),
          noticeMessage: "No changes to save",
        }
      }

      const response = await saveFilterRowsMutation.mutateAsync({
        diff,
        revisionKey: record.updatedAt,
      })
      const sortedResponse = [...response.filterRows].sort(byCreatedAtDesc)
      publishFilterRows(sortedResponse)

      return {
        serverValue: sortedResponse,
        serverRevisionKey: createRevisionKey(response.import ?? record, sortedResponse),
        noticeMessage: "Filter rows saved",
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

  const applyStagedRowPatch = useCallback(
    (patch: StagedInvRowPanelPatch) => {
      // Splice the refreshed filter row into the server snapshot — the
      // engine's revisionKey ignores totals changes, so the user's
      // in-progress draft isn't rebased.
      publishFilterRows(
        orderedFilterRows.map((row) =>
          row.id === patch.filterRow.id ? patch.filterRow : row,
        ),
      )

      if (patch.kind === "upsert") {
        const exists = stagedRows.some((row) => row.id === patch.row.id)
        publishStagedRows(
          exists
            ? stagedRows.map((row) => (row.id === patch.row.id ? patch.row : row))
            : [...stagedRows, patch.row],
        )
      } else {
        publishStagedRows(stagedRows.filter((row) => row.id !== patch.rowId))
      }
    },
    [orderedFilterRows, stagedRows, publishFilterRows, publishStagedRows],
  )

  const duplicateMutation = useDuplicateStagedRowMutation({
    importId: record.id,
    applyStagedRowPatch,
  })

  const duplicateStagedRow = useCallback(
    (source: StagedInventoryRow) => {
      if (source.status !== "DRAFT") return
      duplicateMutation.mutate({ source })
    },
    [duplicateMutation],
  )

  const deleteMutation = useInlineDeleteStagedRowMutation({
    importId: record.id,
    applyStagedRowPatch,
  })

  const deleteStagedRow = useCallback(
    async (row: StagedInventoryRow) => {
      if (row.status !== "DRAFT") return
      await deleteMutation.mutateAsync({ row })
    },
    [deleteMutation],
  )

  const stagedRowsByFilterId = useMemo(() => {
    const map = new Map<string, StagedInventoryRow[]>()
    for (const row of stagedRows) {
      const list = map.get(row.filterRowId) ?? []
      list.push(row)
      map.set(row.filterRowId, list)
    }
    return map
  }, [stagedRows])

  return {
    section,
    addFilterRow,
    removeFilterRow,
    setFilterField,
    setFilterCategoryFilter,
    setFilterProductSnapshot,
    applyStagedRowPatch,
    duplicateStagedRow,
    isDuplicating: duplicateMutation.isPending,
    deleteStagedRow,
    isDeleting: deleteMutation.isPending,
    stagedRowsByFilterId,
  }
}
