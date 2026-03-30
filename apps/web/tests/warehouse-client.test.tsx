// @vitest-environment jsdom

import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
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

function getFieldLabel(label: string) {
  return screen
    .getAllByText(label)
    .find((node) => node.closest("label"))
    ?.closest("label")
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

  it("navigates to the canonical warehouse create page from the list", async () => {
    const user = userEvent.setup()

    render(<WarehouseClient initialRows={[warehouseRow()]} />)

    await user.click(screen.getByRole("button", { name: /add warehouse/i }))

    expect(navigationMocks.push).toHaveBeenCalledWith(
      "/dashboard/flooring/warehouse/new?returnTo=%2Fdashboard%2Fflooring%2Ftest",
      { scroll: false },
    )
  })
})

describe("WarehouseDetailClient", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
    vi.stubGlobal("fetch", fetchMock)
  })

  it("adds a section through the sections engine section and updates the warehouse counts after save", async () => {
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

    await user.click(screen.getByRole("button", { name: "Add Section" }))
    const sectionInputs = screen.getAllByPlaceholderText("Section name")
    await user.type(sectionInputs[0], "Storage")
    await user.click(screen.getByRole("button", { name: "Save Sections" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/flooring/sections",
        expect.objectContaining({ method: "POST" }),
      )
    })

    expect((await screen.findAllByDisplayValue("Storage")).length).toBeGreaterThan(0)
    expect(getFieldLabel("Sections")?.textContent).toContain("2")
  })

  it("adds a location as an allocated row under a warehouse section and updates counts after save", async () => {
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

    await user.click(screen.getByRole("button", { name: "Show locations for Showroom" }))
    await user.click(screen.getByRole("button", { name: "Add Location" }))
    await user.type(screen.getByPlaceholderText("Location code"), "A1")
    await user.click(screen.getByRole("button", { name: "Save Sections" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/flooring/locations",
        expect.objectContaining({ method: "POST" }),
      )
    })

    expect(await screen.findByDisplayValue("A1")).toBeTruthy()
    expect(getFieldLabel("Locations")?.textContent).toContain("1")
  })

  it("removing a section persists through the managed sections save flow", async () => {
    const user = userEvent.setup()

    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))

    render(
      <WarehouseDetailClient
        warehouse={warehouseRow({ sectionsCount: 1, locationsCount: 0 })}
        sections={[{ id: "sec-1", name: "Showroom", locationsCount: 0 }]}
        locations={[]}
        backHref="/dashboard/flooring/warehouse"
      />,
    )

    const showroomRow = screen.getByDisplayValue("Showroom").closest("section")
    expect(showroomRow).toBeTruthy()

    await user.click(within(showroomRow as HTMLElement).getByRole("button", { name: "Remove" }))
    await user.click(screen.getByRole("button", { name: "Save Sections" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/flooring/sections/"),
        expect.objectContaining({ method: "DELETE" }),
      )
    })

    expect(screen.queryAllByDisplayValue("Showroom")).toHaveLength(0)
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
    await user.click(screen.getAllByRole("button", { name: "Back" })[0])

    expect(window.confirm).toHaveBeenCalled()
    expect(navigationMocks.push).not.toHaveBeenCalled()
  })
})
