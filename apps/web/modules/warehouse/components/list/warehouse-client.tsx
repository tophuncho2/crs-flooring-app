"use client"

import { useCallback, useMemo, useState } from "react"
import { SectionHeader } from "@/components/headers"
import {
  ListToolbar,
  ListToolbarBottomRow,
  ListToolbarCell,
} from "@/components/features/list-toolbar"
import type { WarehouseRecord } from "@builders/db"
import { useWarehouseSidePanel } from "@/modules/warehouse/controllers/use-warehouse-side-panel"
import { WarehouseSidePanel } from "@/modules/warehouse/components/side-panel"
import { WarehouseTable } from "./warehouse-table"
import { WarehouseListSearch } from "./toolbar-controls/warehouse-list-search"
import { WarehouseClearAll } from "./toolbar-controls/sub-controls/warehouse-clear-all"
import { WarehouseRowCount } from "./toolbar-controls/sub-controls/warehouse-row-count"

export type WarehouseClientProps = {
  initialRows: WarehouseRecord[]
}

function matchesQuery(row: WarehouseRecord, query: string): boolean {
  if (query.length === 0) return true
  const haystack = [
    row.name,
    row.address ?? "",
    row.phone ?? "",
    String(row.number),
  ]
    .join(" ")
    .toLowerCase()
  return haystack.includes(query)
}

export default function WarehouseClient({ initialRows }: WarehouseClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const sidePanel = useWarehouseSidePanel()

  const filteredRows = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase()
    if (trimmed.length === 0) return initialRows
    return initialRows.filter((row) => matchesQuery(row, trimmed))
  }, [initialRows, searchQuery])

  const total = initialRows.length
  const hasActiveFilters = searchQuery.trim().length > 0

  const handleClearAll = useCallback(() => {
    setSearchQuery("")
  }, [])

  return (
    <div className="min-h-screen bg-[var(--background)] px-0 pt-24 pb-12 text-[var(--foreground)] sm:pt-28">
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <SectionHeader
          title="Warehouse"
          actions={[
            {
              key: "new",
              label: "+ Warehouse",
              onClick: () => sidePanel.openCreate(),
              kind: "primary",
            },
          ]}
        />

        <ListToolbar>
          <ListToolbarCell>
            <WarehouseListSearch query={searchQuery} onQueryChange={setSearchQuery} />
            <ListToolbarBottomRow
              left={<WarehouseClearAll hasActive={hasActiveFilters} onClick={handleClearAll} />}
              right={<WarehouseRowCount count={filteredRows.length} total={total} />}
            />
          </ListToolbarCell>
        </ListToolbar>

        <WarehouseTable rows={filteredRows} onOpen={sidePanel.openEdit} />
      </div>

      <WarehouseSidePanel controller={sidePanel} />
    </div>
  )
}
