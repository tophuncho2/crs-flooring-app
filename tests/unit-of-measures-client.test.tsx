// @vitest-environment jsdom

import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import UnitOfMeasuresClient from "@/features/flooring/unit-of-measures/components/unit-of-measures-client"

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

function unitRow(overrides: Partial<{
  id: string
  name: string
  createdAt: string
}> = {}) {
  return {
    id: "u-1",
    name: "Square Feet",
    createdAt: "2026-03-19T00:00:00.000Z",
    ...overrides,
  }
}

describe("UnitOfMeasuresClient", () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("create flow blocks empty name with the current client-side validation message", async () => {
    const user = userEvent.setup()

    render(<UnitOfMeasuresClient initialUnitOfMeasures={[]} />)

    await user.click(screen.getByRole("button", { name: /\+?Unit Of Measure$/ }))
    await user.click(screen.getByRole("button", { name: "Create Unit Of Measure" }))

    expect(requestJsonMock).not.toHaveBeenCalled()
    expect(screen.getAllByText("Unit of measure is required").length).toBeGreaterThan(0)
  })

  it("create flow posts the expected payload for a valid name", async () => {
    const user = userEvent.setup()
    requestJsonMock.mockResolvedValue({
      unitOfMeasure: unitRow({ id: "u-2", name: "Hour" }),
    })

    render(<UnitOfMeasuresClient initialUnitOfMeasures={[]} />)

    await user.click(screen.getByRole("button", { name: /\+?Unit Of Measure$/ }))
    await user.type(screen.getByLabelText("Unit Of Measure"), "Hour")
    await user.click(screen.getByRole("button", { name: "Create Unit Of Measure" }))

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith("/api/builder/unit-of-measures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Hour" }),
      })
    })

    expect(screen.getByText("Unit of measure created")).toBeTruthy()
  })

  it("edit flow validates and PATCHes the expected payload", async () => {
    const user = userEvent.setup()

    render(<UnitOfMeasuresClient initialUnitOfMeasures={[unitRow()]} />)

    await user.click(screen.getByRole("button", { name: "Edit" }))
    const panelInput = screen.getAllByLabelText("Unit Of Measure")[0]
    await user.clear(panelInput)
    await user.click(screen.getByRole("button", { name: "Save Unit Of Measure" }))

    expect(requestJsonMock).not.toHaveBeenCalled()
    expect(screen.getByText("Unit of measure is required")).toBeTruthy()

    requestJsonMock.mockResolvedValue({
      unitOfMeasure: unitRow({ name: "Hour" }),
    })

    await user.type(panelInput, "Hour")
    await user.click(screen.getByRole("button", { name: "Save Unit Of Measure" }))

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith("/api/builder/unit-of-measures/u-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Hour" }),
      })
    })

    expect(screen.getByText("Unit of measure updated")).toBeTruthy()
  })

  it("delete flow confirms and removes the row on success", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, "confirm").mockReturnValue(true)
    requestJsonMock.mockResolvedValue({ success: true })

    render(<UnitOfMeasuresClient initialUnitOfMeasures={[unitRow()]} />)

    await user.click(screen.getByRole("button", { name: "Delete" }))

    await waitFor(() => {
      expect(screen.queryByText("Square Feet")).toBeNull()
    })
    expect(screen.getByText("Unit of measure deleted")).toBeTruthy()
  })

  it("delete flow surfaces linked-delete server error on failure", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, "confirm").mockReturnValue(true)
    requestJsonMock.mockRejectedValue(new Error("This unit of measure is linked to categories and cannot be deleted"))

    render(<UnitOfMeasuresClient initialUnitOfMeasures={[unitRow()]} />)

    await user.click(screen.getByRole("button", { name: "Delete" }))

    expect(await screen.findByText("This unit of measure is linked to categories and cannot be deleted")).toBeTruthy()
    expect(screen.getByText("Square Feet")).toBeTruthy()
  })
})
