// @vitest-environment jsdom

import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ServicesClient from "@/features/flooring/services/components/services-client"

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
    useUrlRecordEditor: () => {
      const [draft, setDraft] = ReactModule.useState<{
        name: string
        unitId: string
        baseCost: string
        notes: string
      } | null>(null)

      return {
        activeRecord: null,
        draft,
        setDraft,
        openRecord: vi.fn(),
        closeRecord: vi.fn(),
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

describe("ServicesClient", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("requires service name, unit, and cost before submitting and posts the valid form payload", async () => {
    const user = userEvent.setup()

    requestJsonMock.mockResolvedValue({
      service: {
        id: "svc-1",
        name: "Install",
        unitId: "unit-1",
        unitName: "Square Feet",
        baseCost: "9.50",
        notes: "",
        usageCount: 0,
        createdAt: "2026-03-19T00:00:00.000Z",
        updatedAt: "2026-03-19T00:00:00.000Z",
      },
    })

    render(
      <ServicesClient
        initialServices={[]}
        unitOptions={[
          { id: "unit-1", name: "Square Feet" },
          { id: "unit-2", name: "Room" },
        ]}
      />,
    )

    await user.click(screen.getByRole("button", { name: /\+?Service$/ }))
    await user.click(screen.getByRole("button", { name: "Create Service" }))

    expect(requestJsonMock).not.toHaveBeenCalled()
    expect(screen.getAllByText("Service name is required").length).toBeGreaterThan(0)

    await user.type(screen.getByLabelText("Service Name"), "Install")
    fireEvent.change(screen.getByLabelText("Service Unit"), { target: { value: "unit-1" } })
    await user.type(screen.getByLabelText("Cost"), "9.50")
    await user.click(screen.getByRole("button", { name: "Create Service" }))

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith("/api/flooring/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Install",
          unitId: "unit-1",
          baseCost: "9.50",
          notes: "",
        }),
      })
    })

    expect(screen.getByText("Service created")).toBeTruthy()
  })
})
