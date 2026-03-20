// @vitest-environment jsdom

import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { TableColumnSettings } from "@/features/flooring/shared/table-column-settings"

describe("TableColumnSettings", () => {
  beforeEach(() => {
    cleanup()
  })

  it("renders a grouping toggle only for groupable columns", () => {
    const onToggleGroupedColumn = vi.fn()

    render(
      <TableColumnSettings
        columns={[
          { key: "product", label: "Product", groupable: true },
          { key: "notes", label: "Notes", groupable: false },
        ]}
        hiddenColumnKeys={[]}
        onToggleColumn={vi.fn()}
        onMoveColumn={vi.fn()}
        onToggleGroupedColumn={onToggleGroupedColumn}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Columns" }))
    fireEvent.click(screen.getByRole("button", { name: "Group by Product" }))

    expect(onToggleGroupedColumn).toHaveBeenCalledWith("product")
    expect(screen.queryByRole("button", { name: "Group by Notes" })).toBeNull()
  })

  it("shows the active grouping order for grouped columns", () => {
    render(
      <TableColumnSettings
        columns={[
          { key: "warehouse", label: "Warehouse", groupable: true },
          { key: "status", label: "Status", groupable: true },
          { key: "transport", label: "Transport", groupable: true },
        ]}
        hiddenColumnKeys={[]}
        onToggleColumn={vi.fn()}
        onMoveColumn={vi.fn()}
        groupedColumnKeys={["warehouse", "status"]}
        onToggleGroupedColumn={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Columns" }))

    expect(screen.getByRole("button", { name: "Remove grouping for Warehouse" }).textContent).toBe("1")
    expect(screen.getByRole("button", { name: "Remove grouping for Status" }).textContent).toBe("2")
    expect(screen.getByRole("button", { name: "Group by Transport" }).textContent).toBe("G")
  })

  it("disables new grouping toggles when the maximum grouping depth is already used", () => {
    render(
      <TableColumnSettings
        columns={[
          { key: "warehouse", label: "Warehouse", groupable: true },
          { key: "status", label: "Status", groupable: true },
          { key: "transport", label: "Transport", groupable: true },
          { key: "product", label: "Product", groupable: true },
        ]}
        hiddenColumnKeys={[]}
        onToggleColumn={vi.fn()}
        onMoveColumn={vi.fn()}
        groupedColumnKeys={["warehouse", "status", "transport"]}
        maxGroupFields={3}
        onToggleGroupedColumn={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Columns" }))

    expect((screen.getByRole("button", { name: "Group by Product" }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole("button", { name: "Remove grouping for Warehouse" }) as HTMLButtonElement).disabled).toBe(false)
  })
})
