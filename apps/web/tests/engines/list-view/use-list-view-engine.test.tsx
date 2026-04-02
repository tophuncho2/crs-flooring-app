// @vitest-environment jsdom

import { describe, expect, it } from "vitest"
import { renderHook, act } from "@testing-library/react"
import {
  useListViewEngine,
  type ListViewEngineState,
} from "@/modules/shared/engines/list-view/controllers/use-list-view-engine"

type Row = {
  id: string
  name: string
}

const rows: Row[] = [
  { id: "row-1", name: "Alpha" },
  { id: "row-2", name: "Bravo" },
]

function createConfig() {
  return {
    rows,
    tableKey: "test-table",
    fields: [
      { key: "name", label: "Name", getValue: (row: Row) => row.name, groupable: true },
    ],
    sortField: (row: Row) => row.name,
    sortFieldKey: "name",
    urlSync: false,
  }
}

describe("useListViewEngine", () => {
  it("returns all fields specified in ListViewEngineState", () => {
    const { result } = renderHook(() => useListViewEngine(createConfig()))

    const engine: ListViewEngineState<Row> = result.current

    // Search
    expect(typeof engine.searchQuery).toBe("string")
    expect(typeof engine.onSearchQueryChange).toBe("function")
    expect(typeof engine.onSearchClear).toBe("function")

    // Filter
    expect(Array.isArray(engine.activeFilters)).toBe(true)
    expect(typeof engine.onFiltersChange).toBe("function")
    expect(typeof engine.activeFilterCount).toBe("number")

    // Group
    expect(typeof engine.onGroupFieldChange).toBe("function")

    // Sort
    expect(Array.isArray(engine.sortStack)).toBe(true)
    expect(typeof engine.onSortChange).toBe("function")

    // Columns
    expect(Array.isArray(engine.visibleColumns)).toBe(true)
    expect(Array.isArray(engine.columnOrder)).toBe(true)
    expect(typeof engine.onColumnVisibilityChange).toBe("function")
    expect(typeof engine.onColumnOrderChange).toBe("function")

    // Notices
    expect(engine.notice).toBeNull()
    expect(typeof engine.pushNotice).toBe("function")
    expect(typeof engine.clearNotice).toBe("function")

    // Derived
    expect(Array.isArray(engine.processedRows)).toBe(true)

    // Pagination
    expect(typeof engine.page).toBe("number")
    expect(typeof engine.pageSize).toBe("number")
    expect(typeof engine.totalPages).toBe("number")
    expect(typeof engine.hasPreviousPage).toBe("boolean")
    expect(typeof engine.hasNextPage).toBe("boolean")
    expect(typeof engine.goToPreviousPage).toBe("function")
    expect(typeof engine.goToNextPage).toBe("function")

    // Grouping tree
    expect(Array.isArray(engine.groupedRowTree)).toBe(true)
    expect(typeof engine.isGroupingEnabled).toBe("boolean")
  })

  it("pushNotice sets the notice state", () => {
    const { result } = renderHook(() => useListViewEngine(createConfig()))

    expect(result.current.notice).toBeNull()

    act(() => {
      result.current.pushNotice({ type: "success", message: "Record created" })
    })

    expect(result.current.notice).toEqual({ type: "success", message: "Record created" })
  })

  it("clearNotice clears the notice state", () => {
    const { result } = renderHook(() => useListViewEngine(createConfig()))

    act(() => {
      result.current.pushNotice({ type: "error", message: "Something failed" })
    })
    expect(result.current.notice).not.toBeNull()

    act(() => {
      result.current.clearNotice()
    })
    expect(result.current.notice).toBeNull()
  })

  it("onSearchClear resets search query to empty string", () => {
    const { result } = renderHook(() => useListViewEngine(createConfig()))

    act(() => {
      result.current.onSearchQueryChange("test search")
    })
    expect(result.current.searchQuery).toBe("test search")

    act(() => {
      result.current.onSearchClear()
    })
    expect(result.current.searchQuery).toBe("")
  })

  it("sortStack reflects the configured sort field and default ascending direction", () => {
    const { result } = renderHook(() => useListViewEngine(createConfig()))

    expect(result.current.sortStack).toEqual([
      { field: "name", direction: "asc" },
    ])
  })

  it("processedRows reflects filtering and sorting of input rows", () => {
    const { result } = renderHook(() => useListViewEngine(createConfig()))

    expect(result.current.processedRows).toHaveLength(2)
    expect(result.current.processedRows[0].name).toBe("Alpha")
    expect(result.current.processedRows[1].name).toBe("Bravo")
  })

  it("groupField defaults to null when no group keys configured", () => {
    const { result } = renderHook(() => useListViewEngine(createConfig()))

    expect(result.current.groupField).toBeNull()
    expect(result.current.isGroupingEnabled).toBe(false)
  })
})
