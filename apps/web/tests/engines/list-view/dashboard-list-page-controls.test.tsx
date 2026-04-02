// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, screen, act, cleanup } from "@testing-library/react"
import { DashboardListPageControls } from "@/modules/shared/engines/list-view/controls/dashboard-list-page-controls"
import type { ListViewEngineState } from "@/modules/shared/engines/list-view/controllers/use-list-view-engine"

function createMockEngine(overrides: Partial<ListViewEngineState<unknown>> = {}): ListViewEngineState<unknown> {
  return {
    searchQuery: "",
    onSearchQueryChange: vi.fn(),
    onSearchClear: vi.fn(),
    activeFilters: [],
    onFiltersChange: vi.fn(),
    activeFilterCount: 0,
    groupField: null,
    onGroupFieldChange: vi.fn(),
    sortStack: [{ field: "name", direction: "asc" }],
    onSortChange: vi.fn(),
    visibleColumns: ["name"],
    columnOrder: ["name"],
    onColumnVisibilityChange: vi.fn(),
    onColumnOrderChange: vi.fn(),
    notice: null,
    pushNotice: vi.fn(),
    clearNotice: vi.fn(),
    processedRows: [{ id: "1" }, { id: "2" }],
    page: 1,
    pageSize: 50,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
    goToPreviousPage: vi.fn(),
    goToNextPage: vi.fn(),
    groupedRowTree: [],
    isGroupingEnabled: false,
    ...overrides,
  }
}

describe("DashboardListPageControls", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it("renders without engine prop using legacy individual props", () => {
    render(
      <DashboardListPageControls
        count={5}
        searchQuery="test"
        onSearchQueryChange={() => {}}
        searchPlaceholder="Search..."
        isAscendingSort={true}
        onToggleSort={() => {}}
      />,
    )

    expect(screen.getByText(/5/)).toBeTruthy()
  })

  it("binds search to engine.searchQuery when engine is provided", () => {
    const engine = createMockEngine({ searchQuery: "hello" })

    render(
      <DashboardListPageControls
        engine={engine}
        searchPlaceholder="Search items..."
      />,
    )

    const input = screen.getByPlaceholderText("Search items...")
    expect((input as HTMLInputElement).value).toBe("hello")
  })

  it("renders notice strip when engine has a notice set", () => {
    const engine = createMockEngine({
      notice: { type: "success", message: "Record created" },
    })

    render(<DashboardListPageControls engine={engine} />)

    expect(screen.getByText("Record created")).toBeTruthy()
  })

  it("auto-dismisses success notices after 5000ms", () => {
    const clearNotice = vi.fn()
    const engine = createMockEngine({
      notice: { type: "success", message: "Saved" },
      clearNotice,
    })

    render(<DashboardListPageControls engine={engine} />)

    expect(clearNotice).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(clearNotice).toHaveBeenCalledTimes(1)
  })

  it("does not auto-dismiss error notices", () => {
    const clearNotice = vi.fn()
    const engine = createMockEngine({
      notice: { type: "error", message: "Failed to save" },
      clearNotice,
    })

    render(<DashboardListPageControls engine={engine} />)

    act(() => {
      vi.advanceTimersByTime(10000)
    })

    expect(clearNotice).not.toHaveBeenCalled()
  })

  it("does not render notice strip when notice is null", () => {
    const engine = createMockEngine({ notice: null })

    render(<DashboardListPageControls engine={engine} />)

    expect(screen.queryByText("Record created")).toBeNull()
    expect(screen.queryByText("Saved")).toBeNull()
  })

  it("renders formSlot rightmost when provided", () => {
    const engine = createMockEngine()

    render(
      <DashboardListPageControls
        engine={engine}
        formSlot={<button type="button">Create Item</button>}
      />,
    )

    expect(screen.getByText("Create Item")).toBeTruthy()
  })
})
