// @vitest-environment jsdom

import { describe, expect, it } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { useTableControls } from "@/features/flooring/shared/use-table-controls"

type Row = {
  id: string
  warehouse: string
  status: string
  transport: string
}

const rows: Row[] = [
  { id: "1", warehouse: "Main", status: "Pending", transport: "Truck" },
]

describe("useTableControls grouping order", () => {
  it("collapses later grouping levels when an earlier grouped column is toggled off", () => {
    const { result } = renderHook(() =>
      useTableControls({
        rows,
        searchFields: [{ key: "warehouse", getValue: (row) => row.warehouse }],
        sortField: (row) => row.warehouse,
        groupFields: [
          { key: "warehouse", label: "Warehouse", getValue: (row) => row.warehouse },
          { key: "status", label: "Status", getValue: (row) => row.status },
          { key: "transport", label: "Transport", getValue: (row) => row.transport },
        ],
        defaultGrouped: true,
        defaultGroupKeys: ["warehouse", "status", "transport"],
      }),
    )

    act(() => {
      result.current.toggleGroupByKey("status")
    })

    expect(result.current.groupByKeys).toEqual(["warehouse"])
    expect(result.current.isGroupingEnabled).toBe(true)

    act(() => {
      result.current.toggleGroupByKey("warehouse")
    })

    expect(result.current.groupByKeys).toEqual([])
    expect(result.current.isGroupingEnabled).toBe(false)
  })
})
