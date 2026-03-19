// @vitest-environment jsdom

import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import CategoriesClient from "@/features/flooring/categories/components/categories-client"

const { requestJsonMock } = vi.hoisted(() => ({
  requestJsonMock: vi.fn(),
}))

vi.mock("lucide-react", () => ({
  Plus: () => <span>+</span>,
  X: () => <span>x</span>,
}))

vi.mock("@/features/flooring/shared/http", () => ({
  requestJson: requestJsonMock,
}))

vi.mock("@/features/flooring/shared/use-configured-table-state", () => ({
  useConfiguredTableState: ({ rows, fields }: { rows: Array<{ id: string }>; fields: Array<{ key: string; label: string }> }) => ({
    searchQuery: "",
    setSearchQuery: vi.fn(),
    isAscendingSort: true,
    setIsAscendingSort: vi.fn(),
    isGroupingEnabled: false,
    setIsGroupingEnabled: vi.fn(),
    groupByKeys: [],
    updateGroupByKeyAtIndex: vi.fn(),
    addGroupByKey: vi.fn(),
    removeGroupByKeyAtIndex: vi.fn(),
    groupFields: [],
    filteredRows: rows,
    sortedRows: rows,
    groupedRowTree: [],
    page: 1,
    pageSize: rows.length || 1,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
    goToPreviousPage: vi.fn(),
    goToNextPage: vi.fn(),
    allColumns: fields.map((field) => ({ key: field.key, label: field.label })),
    visibleColumns: fields.map((field) => ({ key: field.key, label: field.label })),
    hiddenColumnKeys: [],
    toggleColumnVisibility: vi.fn(),
    moveColumn: vi.fn(),
    setColumnOrder: vi.fn(),
  }),
}))

vi.mock("@/features/flooring/shared/use-url-record-editor", async () => {
  const ReactModule = await import("react")

  return {
    useUrlRecordEditor: ({ rows, createDraft }: { rows: Array<{ id: string }>; createDraft: (row: { id: string }) => unknown }) => {
      const [activeId, setActiveId] = ReactModule.useState<string | null>(null)
      const [draftState, setDraftState] = ReactModule.useState<unknown | null>(null)
      const activeRecord = rows.find((row) => row.id === activeId) ?? null
      const draft = activeRecord ? (draftState ?? createDraft(activeRecord)) : draftState

      return {
        activeRecord,
        draft,
        setDraft: setDraftState,
        openRecord: (row: { id: string }) => {
          setActiveId(row.id)
          setDraftState(createDraft(row))
        },
        closeRecord: () => {
          setActiveId(null)
          setDraftState(null)
        },
      }
    },
  }
})

vi.mock("@/features/flooring/shared/table-controls-bar", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock("@/features/flooring/shared/table-column-settings", () => ({
  TableColumnSettings: () => null,
}))

vi.mock("@/features/flooring/shared/table-shell", () => ({
  TableActionsSummary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TableEmptyRow: ({ message, colSpan }: { message: string; colSpan: number }) => (
    <tr>
      <td colSpan={colSpan}>{message}</td>
    </tr>
  ),
  TableGroupRow: ({ label, colSpan }: { label: string; colSpan: number }) => (
    <tr>
      <td colSpan={colSpan}>{label}</td>
    </tr>
  ),
  TableHead: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableHeaderCell: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TablePaginationControls: () => null,
  TableShell: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
}))

vi.mock("@/features/flooring/shared/row-action-buttons", () => ({
  EditRowButton: ({ onClick }: { onClick: () => void }) => <button onClick={onClick}>Edit</button>,
  DeleteRowButton: ({ onClick, children, disabled }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}))

function categoryRow(overrides: Partial<{
  id: string
  name: string
  sendUnitId: string
  stockUnitId: string
  coverageAvailableUnitId: string
  itemCoverageUnitId: string
  serviceUnitId: string
  sendUnit: string
  stockUnit: string
  coverageAvailableUnit: string
  itemCoverageUnit: string
  serviceUnit: string
  productCount: number
  createdAt: string
}> = {}) {
  return {
    id: "cat-1",
    name: "Carpet",
    sendUnitId: "u-send",
    stockUnitId: "",
    coverageAvailableUnitId: "",
    itemCoverageUnitId: "u-item",
    serviceUnitId: "",
    sendUnit: "SY",
    stockUnit: "",
    coverageAvailableUnit: "",
    itemCoverageUnit: "SF",
    serviceUnit: "",
    productCount: 2,
    createdAt: "2026-03-19T00:00:00.000Z",
    ...overrides,
  }
}

describe("CategoriesClient", () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("create flow posts the expected payload", async () => {
    const user = userEvent.setup()
    requestJsonMock.mockResolvedValue({
      category: categoryRow({ id: "cat-2", name: "Tile", sendUnitId: "", sendUnit: "", itemCoverageUnitId: "", itemCoverageUnit: "", productCount: 0 }),
    })

    render(
      <CategoriesClient
        initialCategories={[]}
        unitOfMeasureOptions={[
          { id: "u-send", name: "SY", createdAt: "2026-03-19T00:00:00.000Z" },
          { id: "u-item", name: "SF", createdAt: "2026-03-19T00:00:00.000Z" },
        ]}
      />,
    )

    await user.click(screen.getByRole("button", { name: /\+?Category$/ }))
    await user.type(screen.getByLabelText("Category Name"), "Tile")
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "u-send" } })
    fireEvent.change(screen.getAllByRole("combobox")[3], { target: { value: "u-item" } })
    await user.click(screen.getByRole("button", { name: "Create Category" }))

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith("/api/flooring/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Tile",
          sendUnitId: "u-send",
          stockUnitId: "",
          coverageAvailableUnitId: "",
          itemCoverageUnitId: "u-item",
          serviceUnitId: "",
        }),
      })
    })

    expect(screen.getByText("Category created")).toBeTruthy()
  })

  it("create flow surfaces server errors", async () => {
    const user = userEvent.setup()
    requestJsonMock.mockRejectedValue(new Error("Name must be unique"))

    render(<CategoriesClient initialCategories={[]} unitOfMeasureOptions={[]} />)

    await user.click(screen.getByRole("button", { name: /\+?Category$/ }))
    await user.type(screen.getByLabelText("Category Name"), "Carpet")
    await user.click(screen.getByRole("button", { name: "Create Category" }))

    expect(await screen.findAllByText("Name must be unique")).toHaveLength(2)
  })

  it("edit flow opens the record and PATCHes the expected payload", async () => {
    const user = userEvent.setup()
    requestJsonMock.mockResolvedValue({
      category: categoryRow({ name: "Updated Carpet", stockUnitId: "u-stock", stockUnit: "Roll" }),
    })

    render(
      <CategoriesClient
        initialCategories={[categoryRow()]}
        unitOfMeasureOptions={[
          { id: "u-send", name: "SY", createdAt: "2026-03-19T00:00:00.000Z" },
          { id: "u-stock", name: "Roll", createdAt: "2026-03-19T00:00:00.000Z" },
          { id: "u-item", name: "SF", createdAt: "2026-03-19T00:00:00.000Z" },
        ]}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Edit" }))
    const nameInput = screen.getAllByLabelText("Category Name")[0]
    await user.clear(nameInput)
    await user.type(nameInput, "Updated Carpet")
    fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "u-stock" } })
    await user.click(screen.getByRole("button", { name: "Save Category" }))

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith("/api/flooring/categories/cat-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Carpet",
          sendUnitId: "u-send",
          stockUnitId: "u-stock",
          coverageAvailableUnitId: "",
          itemCoverageUnitId: "u-item",
          serviceUnitId: "",
        }),
      })
    })

    expect(screen.getByText("Category updated")).toBeTruthy()
  })

  it("delete flow confirms and removes the row on success", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, "confirm").mockReturnValue(true)
    requestJsonMock.mockResolvedValue({ success: true })

    render(<CategoriesClient initialCategories={[categoryRow()]} unitOfMeasureOptions={[]} />)

    expect(screen.getByText("Carpet")).toBeTruthy()
    await user.click(screen.getByRole("button", { name: "Delete" }))

    await waitFor(() => {
      expect(screen.queryByText("Carpet")).toBeNull()
    })
    expect(screen.getByText("Category deleted")).toBeTruthy()
  })

  it("delete flow surfaces failure without removing the row", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, "confirm").mockReturnValue(true)
    requestJsonMock.mockRejectedValue(new Error("This record is linked and cannot be modified"))

    render(<CategoriesClient initialCategories={[categoryRow()]} unitOfMeasureOptions={[]} />)

    await user.click(screen.getByRole("button", { name: "Delete" }))

    expect(await screen.findByText("This record is linked and cannot be modified")).toBeTruthy()
    expect(screen.getByText("Carpet")).toBeTruthy()
  })
})
