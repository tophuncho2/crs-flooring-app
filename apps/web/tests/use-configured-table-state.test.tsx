// @vitest-environment jsdom

import { describe, expect, it } from "vitest"
import { renderHook } from "@testing-library/react"
import { useConfiguredTableState } from "@/features/flooring/shared/controllers/table/use-configured-table-state"
import { useTableColumns } from "@/features/flooring/shared/controllers/table/use-table-columns"

type Row = {
  id: string
  label: string
  status: string
}

const rows: Row[] = [
  { id: "row-1", label: "Alpha", status: "Open" },
]

function createFields() {
  return [
    { key: "label", label: "Label", getValue: (row: Row) => row.label, searchable: true, groupable: true },
    { key: "status", label: "Status", getValue: (row: Row) => row.status, searchable: true, groupable: true },
  ]
}

function createFilterDefinitions() {
  return [
    {
      key: "status",
      param: "status",
      type: "select" as const,
      label: "Status",
      options: [{ value: "open", label: "Open" }],
    },
  ]
}

describe("shared table state hooks", () => {
  it("does not reset column state forever when columns are recreated with the same values", () => {
    const { result, rerender } = renderHook(
      ({ columns }) =>
        useTableColumns({
          columns,
          initialPreferences: {
            sort: { key: "label", direction: "asc" },
            filters: {},
            columnVisibility: { label: true, status: false },
            columnOrder: ["status", "label"],
            grouping: { enabled: false, keys: [] },
          },
        }),
      {
        initialProps: {
          columns: [
            { key: "label", label: "Label" },
            { key: "status", label: "Status", defaultHidden: true },
          ],
        },
      },
    )

    rerender({
      columns: [
        { key: "label", label: "Label" },
        { key: "status", label: "Status", defaultHidden: true },
      ],
    })

    expect(result.current.columnOrder).toEqual(["status", "label"])
    expect(result.current.hiddenColumnKeys).toEqual(["status"])
  })

  it("tolerates recreated field and filter definitions without entering an update loop", () => {
    const { result, rerender } = renderHook(
      ({ fields, filterDefinitions }) =>
        useConfiguredTableState({
          rows,
          tableKey: "inventory-main",
          fields,
          sortField: (row) => row.label,
          sortFieldKey: "label",
          filterDefinitions,
          initialFilters: { status: ["open"] },
          urlSyncMode: "history",
          disableClientFiltering: true,
          disableClientSorting: true,
          disableClientPagination: true,
        }),
      {
        initialProps: {
          fields: createFields(),
          filterDefinitions: createFilterDefinitions(),
        },
      },
    )

    rerender({
      fields: createFields(),
      filterDefinitions: createFilterDefinitions(),
    })

    expect(result.current.filteredRows).toHaveLength(1)
    expect(result.current.filterGroups[0]?.selectedValues).toEqual(["open"])
    expect(result.current.visibleColumns.map((column) => column.key)).toEqual(["label", "status"])
  })
})
