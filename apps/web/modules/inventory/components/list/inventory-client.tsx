"use client"

import { SectionHeader } from "@/components/headers"
import { SearchControl } from "@/components/features/search"
import { SortToggle } from "@/components/features/sort"
import { useConfiguredTableState } from "@/modules/shared/engines/list-view/controllers/use-configured-table-state"
import type { InventoryRow } from "@builders/domain"
import { useInventoryListController } from "../../controllers/use-inventory-list-controller"
import { InventoryTable } from "./inventory-table"

export default function InventoryClient({
  initialInventory,
}: {
  initialInventory: InventoryRow[]
}) {
  const { rows, notices, openInventory } = useInventoryListController({
    initialInventory,
  })

  const {
    searchQuery,
    isAscendingSort,
    filteredRows,
    sortedRows,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    visibleColumns,
    onSearchQueryChange,
    onToggleSort,
  } = useConfiguredTableState({
    rows,
    tableKey: "inventory-main",
    fields: [
      { key: "inventoryNumber", label: "Inv #", getValue: (row) => row.inventoryNumber, groupable: false },
      { key: "importNumber", label: "Import #", getValue: (row) => row.importNumber, groupable: false },
      { key: "product", label: "Product", getValue: (row) => row.productName, groupable: true },
      { key: "itemNumber", label: "Item #", getValue: (row) => row.itemNumber, groupable: false },
      { key: "startingStock", label: "Starting Balance", getValue: (row) => row.startingStock, groupable: false },
      { key: "totalCutSum", label: "Cut Balance", getValue: (row) => row.totalCutSum, groupable: false },
      { key: "stockBalance", label: "Available", getValue: (row) => row.stockBalance, groupable: false },
      { key: "coverageBalance", label: "Coverage", getValue: (row) => row.coverageBalance, defaultHidden: true, groupable: false },
      { key: "section", label: "Section", getValue: (row) => row.sectionNumber, groupable: true },
      { key: "location", label: "Location", getValue: (row) => row.locationShortCode, groupable: true },
      { key: "warehouse", label: "Warehouse", getValue: (row) => row.importWarehouseName || row.warehouseName, groupable: true },
      { key: "fullLocation", label: "Full Location", getValue: (row) => row.locationCode, defaultHidden: true, groupable: true },
      { key: "dyeLot", label: "Dye Lot", getValue: (row) => row.dyeLot, groupable: false },
      { key: "notes", label: "Notes", getValue: (row) => row.notes, defaultHidden: true, groupable: false },
      { key: "updated", label: "Updated", getValue: (row) => row.updatedAt.split("T")[0], defaultHidden: true, groupable: false },
    ],
    sortField: (row) => row.itemNumber,
    sortFieldKey: "itemNumber",
    defaultAscending: true,
  })

  return (
    <div className="min-h-screen bg-[var(--background)] px-0 pt-24 pb-12 text-[var(--foreground)] sm:pt-28">
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <SectionHeader title="Inventory" />

        {notices.message || notices.error ? (
          <div className="space-y-2 border-b border-[var(--panel-border)] px-4 py-3">
            {notices.message ? (
              <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800">
                {notices.message}
              </div>
            ) : null}
            {notices.error ? (
              <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-800">
                {notices.error}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--panel-border)] px-4 py-3">
          <div className="min-w-[16rem] flex-1">
            <SearchControl
              query={searchQuery}
              onQueryChange={onSearchQueryChange}
              placeholder="Search product, item #, import, section, or location"
            />
          </div>
          <SortToggle
            sortKey="itemNumber"
            direction={isAscendingSort ? "asc" : "desc"}
            onChange={() => onToggleSort()}
            ascendingLabel="A-Z"
            descendingLabel="Z-A"
          />
          <span className="text-xs text-[var(--foreground)]/55">
            {filteredRows.length} of {rows.length} inventory rows
          </span>
        </div>

        <InventoryTable
          rows={sortedRows}
          visibleColumns={visibleColumns.map((column) => ({ key: column.key, label: column.label }))}
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredRows.length}
          hasPreviousPage={hasPreviousPage}
          hasNextPage={hasNextPage}
          onPreviousPage={goToPreviousPage}
          onNextPage={goToNextPage}
          onOpenInventory={openInventory}
        />
      </div>
    </div>
  )
}
