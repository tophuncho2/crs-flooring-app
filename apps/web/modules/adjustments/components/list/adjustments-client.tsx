"use client"

import { useCallback, useMemo } from "react"
import { PaginateControls } from "@/components/features/paginate"
import {
  ListRowCount,
  ListToolbar,
  ListToolbarBottomRow,
  ListToolbarCell,
} from "@/components/features/list-toolbar"
import { DebouncedSearchControl } from "@/components/features/search"
import { ClearAllFiltersButton } from "@/components/features/filter"
import { useFetchListController } from "@/controllers/list-view"
import { LIST_FRESHNESS_STANDARD } from "@/query-policies"
import type { ListInput } from "@builders/application"
import {
  INVENTORY_ADJUSTMENTS_LIST_PAGE_SIZE,
  type InventoryAdjustmentListFilters,
  type EnrichedInventoryAdjustmentRow,
  type WarehouseOption,
} from "@builders/domain"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import { useInventoryHub } from "@/modules/app-shell/components/inventory-hub-provider"
import {
  ADJUSTMENTS_LIST_QUERY_KEY,
  listAdjustmentsRequest,
} from "@/modules/adjustments/data/list-adjustments-request"
import { AdjustmentsTable } from "./adjustments-table"

const ADJUSTMENTS_FILTERABLE_FIELDS = [
  "warehouseId",
  "invNumber",
  "rollNumber",
  "dyeLot",
  "note",
] as const

/**
 * Engine-side filter shape: the list-view engine's filter map carries `string[]`
 * only. The four identity search bars are free-text scalars, so we encode them
 * as 1-element arrays here and translate back to the typed
 * `InventoryAdjustmentListFilters` at the listFn boundary.
 */
type EngineAdjustmentFilters = {
  warehouseId?: ReadonlyArray<string>
  invNumber?: ReadonlyArray<string>
  rollNumber?: ReadonlyArray<string>
  dyeLot?: ReadonlyArray<string>
  note?: ReadonlyArray<string>
}

function toEngineFilters(app: InventoryAdjustmentListFilters): EngineAdjustmentFilters {
  const out: EngineAdjustmentFilters = {}
  if (app.warehouseId?.length) out.warehouseId = app.warehouseId
  if (app.invNumber && app.invNumber.length > 0) out.invNumber = [app.invNumber]
  if (app.rollNumber && app.rollNumber.length > 0) out.rollNumber = [app.rollNumber]
  if (app.dyeLot && app.dyeLot.length > 0) out.dyeLot = [app.dyeLot]
  if (app.note && app.note.length > 0) out.note = [app.note]
  return out
}

function toAppFilters(engine: EngineAdjustmentFilters): InventoryAdjustmentListFilters {
  const out: InventoryAdjustmentListFilters = {}
  if (engine.warehouseId?.length) out.warehouseId = engine.warehouseId
  const invNumber = engine.invNumber?.[0]?.trim()
  if (invNumber) out.invNumber = invNumber
  const rollNumber = engine.rollNumber?.[0]?.trim()
  if (rollNumber) out.rollNumber = rollNumber
  const dyeLot = engine.dyeLot?.[0]?.trim()
  if (dyeLot) out.dyeLot = dyeLot
  const note = engine.note?.[0]?.trim()
  if (note) out.note = note
  return out
}

export default function AdjustmentsClient({
  initialSearchQuery,
  initialPage,
  initialFilters,
  initialWarehouseOptions,
  initialSelectedWarehouse = null,
}: {
  initialSearchQuery: string
  initialPage: number
  initialFilters: InventoryAdjustmentListFilters
  initialWarehouseOptions: WarehouseOption[]
  initialSelectedWarehouse?: WarehouseOption | null
}) {
  // Row click opens the app-wide inventory hub focused on the clicked adjustment.
  // `openForAdjustmentEdit(row)` derives the parent inventory from `row.inventoryId`
  // and loads it. The provider invalidates the ledger after any hub mutation so
  // it refreshes.
  const { openForAdjustmentEdit } = useInventoryHub()

  // The engine's filter map carries `string[]` only — translate to typed
  // InventoryAdjustmentListFilters at the listFn boundary.
  const adaptedListFn = useCallback(
    (input: ListInput<EngineAdjustmentFilters>) =>
      listAdjustmentsRequest({
        ...input,
        filters: input.filters ? toAppFilters(input.filters) : undefined,
      }),
    [],
  )

  const {
    rows,
    total,
    filters,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    onFilterChange,
    onClearAllFilters,
  } = useFetchListController<EnrichedInventoryAdjustmentRow, EngineAdjustmentFilters>({
    mode: "fetch",
    queryKey: [...ADJUSTMENTS_LIST_QUERY_KEY],
    listFn: adaptedListFn,
    initialSearchQuery,
    initialPage,
    initialFilters: toEngineFilters(initialFilters),
    pageSize: INVENTORY_ADJUSTMENTS_LIST_PAGE_SIZE,
    tableKey: "adjustments-main",
    filterableFields: ADJUSTMENTS_FILTERABLE_FIELDS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  const selectedWarehouseId = filters.warehouseId?.[0] ?? null
  const invNumberValue = filters.invNumber?.[0] ?? ""
  const rollNumberValue = filters.rollNumber?.[0] ?? ""
  const dyeLotValue = filters.dyeLot?.[0] ?? ""
  const noteValue = filters.note?.[0] ?? ""

  const warehouseLabel = useMemo(() => {
    if (!selectedWarehouseId) return null
    if (initialSelectedWarehouse?.id === selectedWarehouseId) {
      return initialSelectedWarehouse.name
    }
    return initialWarehouseOptions.find((o) => o.id === selectedWarehouseId)?.name ?? null
  }, [selectedWarehouseId, initialSelectedWarehouse, initialWarehouseOptions])

  const handleWarehouseChange = useCallback(
    (id: string | null) => {
      onFilterChange("warehouseId", id ? [id] : [])
    },
    [onFilterChange],
  )

  // One handler for all four identity search bars — encodes the free-text value
  // as a 1-element array (or empty to clear).
  const handleTextFilterChange = useCallback(
    (key: "invNumber" | "rollNumber" | "dyeLot" | "note", next: string) => {
      const trimmed = next.trim()
      onFilterChange(key, trimmed.length > 0 ? [trimmed] : [])
    },
    [onFilterChange],
  )

  const hasActiveFilters = useMemo(
    () =>
      Boolean(selectedWarehouseId) ||
      Boolean(invNumberValue) ||
      Boolean(rollNumberValue) ||
      Boolean(dyeLotValue) ||
      Boolean(noteValue),
    [selectedWarehouseId, invNumberValue, rollNumberValue, dyeLotValue, noteValue],
  )

  const handleClearAll = useCallback(() => {
    onClearAllFilters()
  }, [onClearAllFilters])

  return (
    <div className="min-h-screen space-y-3 bg-[var(--background)] px-0 pt-24 pb-12 text-[var(--foreground)] sm:pt-28">
      <div className="mx-4 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <div>
          <div className="px-4 pt-3">
            <span className="inline-block rounded-t-md border border-b-0 border-[var(--panel-border)] bg-blue-500/15 px-3 py-1 text-xs font-bold text-black">
              Adjustments
            </span>
          </div>
          <ListToolbar className="pt-0" showDivider={false}>
            <ListToolbarCell>
              <div className="flex flex-col gap-2 rounded-md rounded-tl-none border border-[var(--panel-border)] p-2">
                <DebouncedSearchControl
                  value={rollNumberValue}
                  onCommit={(next) => handleTextFilterChange("rollNumber", next)}
                  placeholder="Roll #"
                  ariaLabel="Search adjustments by roll number"
                />
                <DebouncedSearchControl
                  value={invNumberValue}
                  onCommit={(next) => handleTextFilterChange("invNumber", next)}
                  placeholder="Inv #"
                  ariaLabel="Search adjustments by inventory number"
                />
                <DebouncedSearchControl
                  value={dyeLotValue}
                  onCommit={(next) => handleTextFilterChange("dyeLot", next)}
                  placeholder="Dye lot"
                  ariaLabel="Search adjustments by dye lot"
                />
                <DebouncedSearchControl
                  value={noteValue}
                  onCommit={(next) => handleTextFilterChange("note", next)}
                  placeholder="Note"
                  ariaLabel="Search adjustments by note"
                />
                <ListToolbarBottomRow
                  left={
                    <ClearAllFiltersButton hasActive={hasActiveFilters} onClick={handleClearAll} />
                  }
                  right={<ListRowCount count={rows.length} total={total} label="adjustments" />}
                />
              </div>
            </ListToolbarCell>

            <ListToolbarCell>
              <div className="flex flex-col gap-2 rounded-md border border-[var(--panel-border)] p-2">
                <WarehousePicker
                  value={selectedWarehouseId}
                  selectedLabel={warehouseLabel}
                  onChange={handleWarehouseChange}
                  initialOptions={initialWarehouseOptions}
                  placeholder="Warehouse"
                  searchPlaceholder="Search warehouses"
                  emptyMessage="No warehouses match"
                  clearLabel="Clear filter"
                  ariaLabel="Filter adjustments by warehouse"
                />
              </div>
            </ListToolbarCell>
          </ListToolbar>
        </div>
      </div>

      <AdjustmentsTable
        rows={rows}
        onOpenAdjustment={(row) => openForAdjustmentEdit(row)}
        pagination={
          <PaginateControls
            page={page}
            pageSize={pageSize}
            totalItems={total}
            totalPages={totalPages}
            hasPreviousPage={hasPreviousPage}
            hasNextPage={hasNextPage}
            onPreviousPage={goToPreviousPage}
            onNextPage={goToNextPage}
          />
        }
      />
    </div>
  )
}
