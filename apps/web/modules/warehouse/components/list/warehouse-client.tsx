"use client"

import { useCallback, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  ListToolbar,
  ListToolbarBottomRow,
  ListToolbarCell,
} from "@/components/features/list-toolbar"
import type { WarehouseRecord } from "@builders/db"
import { useWarehouseSidePanel } from "@/modules/warehouse/controllers/use-warehouse-side-panel"
import { WarehouseSidePanel } from "@/modules/warehouse/components/side-panel"
import {
  WAREHOUSE_OPTIONS_QUERY_KEY,
  searchWarehouseOptionsRequest,
} from "@/modules/warehouse/data/warehouse-options-request"
import { WarehouseTable } from "./warehouse-table"
import { AddWarehouseButton } from "./toolbar-controls/add-warehouse-button"
import { GenerateFileButton } from "./toolbar-controls/generate-file-button"
import { WarehouseListSearch } from "./toolbar-controls/warehouse-list-search"
import { WarehouseClearAll } from "./toolbar-controls/sub-controls/warehouse-clear-all"
import { WarehouseRowCount } from "./toolbar-controls/sub-controls/warehouse-row-count"

// Mirrors the server-side cap on the options endpoint (MAX_TAKE = 50).
const SEARCH_TAKE = 50

export type WarehouseClientProps = {
  initialRows: WarehouseRecord[]
}

export default function WarehouseClient({ initialRows }: WarehouseClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const sidePanel = useWarehouseSidePanel()

  const trimmed = searchQuery.trim()

  // Drive the list-view search through the same backend query that powers the
  // WarehousePicker (name `contains`, case-insensitive). Pull the matched
  // option ids and intersect with the SSR row set so the table cells (address,
  // phone, work-orders) still come from the full record.
  const optionsQuery = useQuery({
    queryKey: [...WAREHOUSE_OPTIONS_QUERY_KEY, "list-filter", trimmed],
    queryFn: ({ signal }) => searchWarehouseOptionsRequest(trimmed, signal, SEARCH_TAKE),
    enabled: trimmed.length > 0,
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  })

  const filteredRows = useMemo(() => {
    if (trimmed.length === 0) return initialRows
    const matches = optionsQuery.data
    if (!matches) return []
    const ids = new Set(matches.map((option) => option.id))
    return initialRows.filter((row) => ids.has(row.id))
  }, [initialRows, trimmed, optionsQuery.data])

  const total = initialRows.length
  const hasActiveFilters = trimmed.length > 0

  const handleClearAll = useCallback(() => {
    setSearchQuery("")
  }, [])

  return (
    <div className="min-h-screen bg-[var(--background)] px-0 pt-24 pb-12 text-[var(--foreground)] sm:pt-28">
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <ListToolbar>
          <ListToolbarCell>
            <div className="flex flex-col">
              <span className="self-start rounded-t-md border border-b-0 border-[var(--panel-border)] bg-blue-500/15 px-3 py-1 text-xs font-bold text-black">
                Warehouse
              </span>
              <div className="flex flex-col gap-2 rounded-md rounded-tl-none border border-[var(--panel-border)] p-2">
                <WarehouseListSearch query={searchQuery} onQueryChange={setSearchQuery} />
                <ListToolbarBottomRow
                  left={<WarehouseClearAll hasActive={hasActiveFilters} onClick={handleClearAll} />}
                  right={<WarehouseRowCount count={filteredRows.length} total={total} />}
                />
              </div>
            </div>
          </ListToolbarCell>

          {/* Placeholder action: 2-row × 2-col chip; disabled until the
              real generate-file flow lands. */}
          <ListToolbarCell colSpan={2}>
            <GenerateFileButton />
          </ListToolbarCell>

          {/* Right-anchored action: + Warehouse occupies the top row of a
              single right-anchored cell; the bottom row is empty (warehouse
              has no secondary create flow like properties' + Hub). */}
          <ListToolbarCell className="ml-auto">
            <AddWarehouseButton onClick={() => sidePanel.openCreate()} />
          </ListToolbarCell>
        </ListToolbar>

        <WarehouseTable rows={filteredRows} onOpen={sidePanel.openEdit} />
      </div>

      <WarehouseSidePanel controller={sidePanel} />
    </div>
  )
}
