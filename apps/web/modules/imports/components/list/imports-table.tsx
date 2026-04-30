"use client"

import { Grid, GridEmpty, type GridLayout } from "@/components/grid"
import { PaginateControls } from "@/components/features/paginate"
import { formatStableDate } from "@builders/domain"
import type { ImportRow } from "@/modules/imports/controllers/use-imports-list-controller"

const IMPORTS_LIST_LAYOUT: GridLayout<ImportRow> = {
  dataColumns: [
    { key: "importNumber", label: "Import #", minWidth: 120, grow: 0 },
    { key: "tag", label: "Tag", minWidth: 140, grow: 1 },
    { key: "warehouseName", label: "Warehouse", minWidth: 160, grow: 1 },
    { key: "manufacturerName", label: "Manufacturer", minWidth: 160, grow: 1 },
    { key: "stagedInventoryRowsCount", label: "Staged", kind: "number", minWidth: 90, grow: 0, align: "end" },
    { key: "liveInventoryRowsCount", label: "Live", kind: "number", minWidth: 80, grow: 0, align: "end" },
    { key: "createdAt", label: "Created", minWidth: 120, grow: 0 },
  ],
}

function formatImportNumber(value: number): string {
  return `IMP-${String(value).padStart(4, "0")}`
}

export function ImportsTable({
  rows,
  pagination,
  page,
  totalPages,
  pageSize,
  totalItems,
  hasPreviousPage,
  hasNextPage,
  onPreviousPage,
  onNextPage,
  onOpenImport,
}: {
  rows: ImportRow[]
  pagination?: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
    previousPageHref: string
    nextPageHref: string
  }
  page: number
  totalPages: number
  pageSize: number
  totalItems: number
  hasPreviousPage: boolean
  hasNextPage: boolean
  onPreviousPage: () => void
  onNextPage: () => void
  onOpenImport: (id: string) => void
}) {
  return (
    <Grid<ImportRow>
      rows={rows}
      layout={IMPORTS_LIST_LAYOUT}
      empty={<GridEmpty>No imports logged yet.</GridEmpty>}
      onRowClick={(row) => onOpenImport(row.id)}
      getRowAriaLabel={(row) => `Open import ${formatImportNumber(row.importNumber)}`}
      renderCell={(column, row) => {
        switch (column.key) {
          case "importNumber":
            return (
              <span className="font-medium text-blue-500">
                {formatImportNumber(row.importNumber)}
              </span>
            )
          case "tag":
            return row.tag || "-"
          case "warehouseName":
            return row.warehouseName || "-"
          case "manufacturerName":
            return row.manufacturerName || "-"
          case "stagedInventoryRowsCount":
            return <span className="tabular-nums">{row.stagedInventoryRowsCount}</span>
          case "liveInventoryRowsCount":
            return <span className="tabular-nums">{row.liveInventoryRowsCount}</span>
          case "createdAt":
            return formatStableDate(row.createdAt)
          default:
            return "-"
        }
      }}
      footerSlot={
        <PaginateControls
          page={pagination?.page ?? page}
          pageSize={pagination?.pageSize ?? pageSize}
          totalItems={pagination?.totalItems ?? totalItems}
          totalPages={pagination?.totalPages ?? totalPages}
          hasPreviousPage={pagination ? pagination.page > 1 : hasPreviousPage}
          hasNextPage={pagination ? pagination.page < pagination.totalPages : hasNextPage}
          onPreviousPage={pagination ? undefined : onPreviousPage}
          onNextPage={pagination ? undefined : onNextPage}
          previousPageHref={pagination?.previousPageHref}
          nextPageHref={pagination?.nextPageHref}
        />
      }
    />
  )
}
