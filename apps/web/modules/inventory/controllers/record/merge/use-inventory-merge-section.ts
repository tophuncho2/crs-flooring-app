"use client"

import { useCallback, useMemo, useState } from "react"
import type { InventoryDetail, InventoryRow, ProductOption } from "@builders/domain"
import type { InventoryDetailRecord } from "@builders/db"
import { useInventoryListMutations } from "@/modules/inventory/controllers/list/use-inventory-list-mutations"
import {
  useInventoryOptionsGrid,
  type InventoryOptionsGridController,
} from "@/modules/inventory/controllers/record/header/use-inventory-options-grid"
import {
  INVENTORY_MERGE_CANDIDATES_QUERY_KEY,
  mergeInventoryCandidatesRequest,
} from "@/modules/inventory/data/merge-candidates-request"

/** Editable cells of the merged row (product + starting stock are NOT here — product is the locked scope, starting stock is derived). */
export type InventoryMergeForm = {
  warehouseId: string
  rollNumber: string
  dyeLot: string
  note: string
  location: string
  internalNotes: string
}

const EMPTY_MERGE_FORM: InventoryMergeForm = {
  warehouseId: "",
  rollNumber: "",
  dyeLot: "",
  note: "",
  location: "",
  internalNotes: "",
}

export type CommitInventoryMergeCallbacks = {
  onSuccess?: (inventory: InventoryDetail) => void
  onError?: (error: unknown) => void
}

export type InventoryMergeSlice = {
  /** Locked product scope — the master filter every selectable row shares. */
  productId: string
  productLabel: string | null
  warehouseLabel: string | null
  /** Stock-unit suffix for the derived starting-stock display. */
  stockUnitAbbrev: string
  /** The reused candidate-list controller (search bars + pagination + rows). */
  grid: InventoryOptionsGridController
  /** Selected source rows (retained across candidate pages). */
  selectedIds: Set<string>
  selectedCount: number
  /** Σ remaining balance of the selected rows — the merged row's starting stock (display only; recomputed server-authoritative under lock). */
  summedStartingStock: string
  isSelectionActive: boolean
  eligibleCount: number
  toggleRow: (id: string) => void
  toggleAll: () => void
  form: InventoryMergeForm
  setField: <K extends keyof InventoryMergeForm>(field: K, value: InventoryMergeForm[K]) => void
  /** Pick the product scope. Clears any selection + editable edits — the cross-product reset. */
  setProduct: (option: ProductOption | null) => void
  setWarehouse: (option: { id: string; name: string } | null) => void
  isDirty: boolean
  canSubmit: boolean
  resetToSeed: () => void
  isPending: boolean
  commitMerge: (callbacks: CommitInventoryMergeCallbacks) => void
}

function sumBalances(rows: InventoryRow[]): string {
  const total = rows.reduce((sum, row) => sum + Number(row.stockBalance), 0)
  return (Number.isFinite(total) ? total : 0).toFixed(2)
}

/**
 * Merge-inventory section slice for the standalone merge page
 * (`/dashboard/inventory/merge`). The user picks a product (the locked scope),
 * batch-selects rows of that product across all warehouses, and fills the
 * editable cells of the new consolidated row. The merged row's starting stock
 * is the Σ remaining balance of the selected rows (derived here for display only;
 * recomputed server-authoritative under lock — the candidate list already
 * excludes zero-balance rows, and the use case re-asserts eligibility).
 *
 * Selection is retained in a `Map` keyed by id so a row selected on page 1 keeps
 * counting after the candidate list pages away from it. **Changing the product
 * clears the selection and the editable draft** — the cardinal safeguard against
 * a cross-product merge (also hard-asserted server-side).
 */
export function useInventoryMergeSection({
  clearError,
}: {
  clearError: () => void
}): InventoryMergeSlice {
  const [productId, setProductId] = useState("")
  const [productLabel, setProductLabel] = useState<string | null>(null)
  const [stockUnitAbbrev, setStockUnitAbbrev] = useState("")
  const [warehouseLabel, setWarehouseLabel] = useState<string | null>(null)
  const [form, setForm] = useState<InventoryMergeForm>(EMPTY_MERGE_FORM)
  // id → row snapshot, so off-page selections retain their balance for the sum.
  const [selected, setSelected] = useState<Map<string, InventoryRow>>(() => new Map())

  const grid = useInventoryOptionsGrid({
    warehouseId: null,
    productFilterId: productId || null,
    enabled: productId !== "",
    // Merge candidates only: the endpoint excludes archived, already-merged, and
    // zero-balance rows so a spent row can never be picked into a merge.
    requestFn: mergeInventoryCandidatesRequest,
    queryKey: INVENTORY_MERGE_CANDIDATES_QUERY_KEY,
  })

  const setField = useCallback(
    <K extends keyof InventoryMergeForm>(field: K, value: InventoryMergeForm[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }))
      clearError()
    },
    [clearError],
  )

  // Picking (or clearing) the product resets every product-scoped piece of state
  // — selection AND the editable draft — so no row or value from product A can
  // ride into a merge of product B.
  const setProduct = useCallback(
    (option: ProductOption | null) => {
      setProductId(option?.id ?? "")
      setProductLabel(option?.name ?? null)
      setStockUnitAbbrev(option?.stockUnitAbbrev ?? "")
      setSelected(new Map())
      setForm(EMPTY_MERGE_FORM)
      setWarehouseLabel(null)
      clearError()
    },
    [clearError],
  )

  const setWarehouse = useCallback(
    (option: { id: string; name: string } | null) => {
      setWarehouseLabel(option?.name ?? null)
      setForm((prev) => ({ ...prev, warehouseId: option?.id ?? "" }))
      clearError()
    },
    [clearError],
  )

  const toggleRow = useCallback(
    (id: string) => {
      setSelected((prev) => {
        const next = new Map(prev)
        if (next.has(id)) {
          next.delete(id)
        } else {
          const row = grid.rows.find((candidate) => candidate.id === id)
          if (row) next.set(id, row)
        }
        return next
      })
      clearError()
    },
    [grid.rows, clearError],
  )

  // Select-All affordance: active (anything selected) → clear everything;
  // inactive → select every row on the current candidate page.
  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (prev.size > 0) return new Map()
      return new Map(grid.rows.map((row) => [row.id, row]))
    })
    clearError()
  }, [grid.rows, clearError])

  const selectedRows = useMemo(() => Array.from(selected.values()), [selected])
  const summedStartingStock = useMemo(() => sumBalances(selectedRows), [selectedRows])

  const isDirty = useMemo(() => {
    // Browsing a product (no rows picked, nothing typed) is NOT unsaved work.
    if (selected.size > 0) return true
    return (
      form.warehouseId !== "" ||
      form.rollNumber !== "" ||
      form.dyeLot !== "" ||
      form.note !== "" ||
      form.location !== "" ||
      form.internalNotes !== ""
    )
  }, [selected, form])

  const canSubmit =
    productId.trim().length > 0 && selected.size >= 2 && form.warehouseId.trim().length > 0

  const resetToSeed = useCallback(() => {
    setSelected(new Map())
    setForm(EMPTY_MERGE_FORM)
    setWarehouseLabel(null)
    clearError()
  }, [clearError])

  const { mergeInventory } = useInventoryListMutations()
  const isPending = mergeInventory.isPending

  const commitMerge = useCallback(
    ({ onSuccess, onError }: CommitInventoryMergeCallbacks) => {
      mergeInventory.mutate(
        {
          input: {
            productId,
            warehouseId: form.warehouseId,
            sourceInventoryIds: Array.from(selected.keys()),
            rollNumber: form.rollNumber,
            dyeLot: form.dyeLot,
            note: form.note,
            location: form.location,
            internalNotes: form.internalNotes,
          },
        },
        {
          onSuccess: (response) => {
            const detail = response.inventory as InventoryDetailRecord
            onSuccess?.(detail as InventoryDetail)
          },
          onError: (err) => onError?.(err),
        },
      )
    },
    [mergeInventory, productId, form, selected],
  )

  return {
    productId,
    productLabel,
    warehouseLabel,
    stockUnitAbbrev: selectedRows[0]?.stockUnitAbbrev ?? grid.rows[0]?.stockUnitAbbrev ?? stockUnitAbbrev,
    grid,
    selectedIds: new Set(selected.keys()),
    selectedCount: selected.size,
    summedStartingStock,
    isSelectionActive: selected.size > 0,
    eligibleCount: grid.rows.length,
    toggleRow,
    toggleAll,
    form,
    setField,
    setProduct,
    setWarehouse,
    isDirty,
    canSubmit,
    resetToSeed,
    isPending,
    commitMerge,
  }
}
