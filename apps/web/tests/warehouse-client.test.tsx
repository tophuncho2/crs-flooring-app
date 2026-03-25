// @vitest-environment jsdom

import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import WarehouseClient, { type WarehouseRow } from "@/app/dashboard/warehouse/warehouse-client"
import { WarehouseDetailClient } from "@/features/flooring/warehouse/components/warehouse-detail-client"
import { navigationMocks } from "./helpers/next-navigation-mock"

vi.mock("lucide-react", () => ({
  ArrowLeft: () => <span aria-hidden="true">{"<"}</span>,
  ChevronDown: () => <span aria-hidden="true">{"v"}</span>,
  ChevronRight: () => <span aria-hidden="true">{">"}</span>,
  Columns3: () => <span aria-hidden="true">cols</span>,
  Filter: () => <span aria-hidden="true">filter</span>,
  Plus: () => <span aria-hidden="true">+</span>,
  Search: () => <span aria-hidden="true">search</span>,
  X: () => <span aria-hidden="true">x</span>,
}))

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  }
}

function warehouseRow(overrides: Partial<WarehouseRow> = {}): WarehouseRow {
  return {
    id: "wh-1",
    name: "Main Warehouse",
    address: "1 Main St",
    phone: "555-1111",
    sectionsCount: 1,
    locationsCount: 1,
    workOrdersCount: 0,
    createdAt: "2026-03-19T00:00:00.000Z",
    updatedAt: "2026-03-19T00:00:00.000Z",
    ...overrides,
  }
}

describe("WarehouseClient", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
    vi.stubGlobal("fetch", fetchMock)
  })

  it("routes warehouse rows into the canonical warehouse detail page", async () => {
    const user = userEvent.setup()

    render(<WarehouseClient initialRows={[warehouseRow()]} />)

    await user.click(screen.getByRole("button", { name: "Open warehouse Main Warehouse" }))

    expect(navigationMocks.push).toHaveBeenCalledWith(
      "/dashboard/flooring/warehouse/wh-1?returnTo=%2Fdashboard%2Fflooring%2Ftest",
      { scroll: false },
    )
  })

  it("navigates to the canonical warehouse detail page after creating a warehouse", async () => {
    const user = userEvent.setup()

    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          warehouse: warehouseRow({
            id: "wh-2",
            name: "Overflow Warehouse",
            address: "2 Main St",
          }),
        },
        201,
      ),
    )

    render(<WarehouseClient initialRows={[warehouseRow()]} />)

    await user.click(screen.getByRole("button", { name: /add warehouse/i }))
    await user.type(screen.getByLabelText("Warehouse Name"), "Overflow Warehouse")
    await user.type(screen.getByLabelText("Address"), "2 Main St")
    await user.click(screen.getByRole("button", { name: "Create Warehouse" }))

    await waitFor(() => {
      expect(navigationMocks.push).toHaveBeenCalledWith(
        "/dashboard/flooring/warehouse/wh-2?returnTo=%2Fdashboard%2Fflooring%2Ftest",
        { scroll: false },
      )
    })
  })
})

describe("WarehouseDetailClient", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
    vi.stubGlobal("fetch", fetchMock)
  })

  it("adds a section and updates the summary counts", async () => {
    const user = userEvent.setup()

    fetchMock.mockResolvedValueOnce(jsonResponse({ section: { id: "sec-2", name: "Storage", locationsCount: 0 } }, 201))

    render(
      <WarehouseDetailClient
        warehouse={warehouseRow()}
        sections={[{ id: "sec-1", name: "Showroom", locationsCount: 1 }]}
        locations={[]}
        backHref="/dashboard/flooring/warehouse"
      />,
    )

    await user.type(screen.getByPlaceholderText("Section name"), "Storage")
    await user.click(screen.getAllByRole("button", { name: "Add" })[0])

    expect((await screen.findAllByDisplayValue("Storage")).length).toBeGreaterThan(0)
    expect(screen.getByText("2")).toBeTruthy()
  })

  it("adds a location and updates location counts", async () => {
    const user = userEvent.setup()

    fetchMock.mockResolvedValueOnce(
      jsonResponse({ location: { id: "loc-1", locationCode: "A1", sectionId: "sec-1", sectionName: "Showroom" } }, 201),
    )

    render(
      <WarehouseDetailClient
        warehouse={warehouseRow({ locationsCount: 0 })}
        sections={[{ id: "sec-1", name: "Showroom", locationsCount: 0 }]}
        locations={[]}
        backHref="/dashboard/flooring/warehouse"
      />,
    )

    await user.type(screen.getByPlaceholderText("Location code"), "A1")
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "sec-1" } })
    await user.click(screen.getAllByRole("button", { name: "Add" })[1])

    expect(await screen.findByDisplayValue("A1")).toBeTruthy()
    expect(screen.getAllByText("1").length).toBeGreaterThan(0)
  })

  it("moving a location between sections updates both section counts", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ location: { id: "loc-1", locationCode: "A1", sectionId: "sec-2", sectionName: "Storage" } }),
    )

    render(
      <WarehouseDetailClient
        warehouse={warehouseRow({ sectionsCount: 2, locationsCount: 1 })}
        sections={[
          { id: "sec-1", name: "Showroom", locationsCount: 1 },
          { id: "sec-2", name: "Storage", locationsCount: 0 },
        ]}
        locations={[{ id: "loc-1", locationCode: "A1", sectionId: "sec-1", sectionName: "Showroom" }]}
        backHref="/dashboard/flooring/warehouse"
      />,
    )

    const locationRow = screen.getByDisplayValue("A1").closest("tr")
    expect(locationRow).toBeTruthy()
    const sectionSelect = within(locationRow as HTMLElement).getByRole("combobox")
    fireEvent.change(sectionSelect, { target: { value: "sec-2" } })
    fireEvent.blur(sectionSelect)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith("/api/flooring/locations/loc-1", expect.objectContaining({ method: "PATCH" }))
    })

    const showroomRow = screen.getAllByDisplayValue("Showroom")[0].closest("tr")
    const storageRow = screen.getAllByDisplayValue("Storage")[0].closest("tr")

    expect(showroomRow?.textContent).toContain("0")
    expect(storageRow?.textContent).toContain("1")
  })

  it("deleting a section removes it from the shared child-table section", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, "confirm").mockReturnValue(true)

    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))

    render(
      <WarehouseDetailClient
        warehouse={warehouseRow({ sectionsCount: 1, locationsCount: 0 })}
        sections={[{ id: "sec-1", name: "Showroom", locationsCount: 0 }]}
        locations={[]}
        backHref="/dashboard/flooring/warehouse"
      />,
    )

    await user.click(screen.getAllByRole("button", { name: "Delete" })[0])

    await waitFor(() => {
      expect(screen.queryAllByDisplayValue("Showroom")).toHaveLength(0)
    })

    expect(screen.getByText("No sections yet.")).toBeTruthy()
  })

  it("guards back navigation when the warehouse draft is dirty", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, "confirm").mockReturnValue(false)

    render(
      <WarehouseDetailClient
        warehouse={warehouseRow()}
        sections={[]}
        locations={[]}
        backHref="/dashboard/flooring/warehouse"
      />,
    )

    await user.clear(screen.getByLabelText("Warehouse Name"))
    await user.type(screen.getByLabelText("Warehouse Name"), "Dirty Warehouse")
    await user.click(screen.getByRole("button", { name: "Back" }))

    expect(window.confirm).toHaveBeenCalled()
    expect(navigationMocks.push).not.toHaveBeenCalled()
  })
})
