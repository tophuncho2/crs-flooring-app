// @vitest-environment jsdom

import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import WarehouseClient, { type WarehouseRow } from "@/app/dashboard/warehouse/warehouse-client"

vi.mock("lucide-react", () => ({
  Plus: () => <span>+</span>,
  X: () => <span>x</span>,
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

  it("opening a warehouse record triggers child loads for sections and locations", async () => {
    const user = userEvent.setup()

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ sections: [{ id: "sec-1", name: "Showroom", locationsCount: 1 }] }))
      .mockResolvedValueOnce(jsonResponse({ locations: [{ id: "loc-1", locationCode: "A1", sectionId: "sec-1", sectionName: "Showroom" }] }))

    render(<WarehouseClient initialRows={[warehouseRow()]} />)

    await user.click(screen.getByRole("button", { name: "Open warehouse Main Warehouse" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/flooring/sections?warehouseId=wh-1")
      expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/flooring/locations?warehouseId=wh-1")
    })

    expect((await screen.findAllByDisplayValue("Showroom")).length).toBeGreaterThan(0)
    expect(await screen.findByDisplayValue("A1")).toBeTruthy()
  })

  it("failed child load surfaces an error instead of clearing into a silent empty state", async () => {
    const user = userEvent.setup()

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ sections: [{ id: "sec-1", name: "Showroom", locationsCount: 1 }] }))
      .mockResolvedValueOnce(jsonResponse({ locations: [{ id: "loc-1", locationCode: "A1", sectionId: "sec-1", sectionName: "Showroom" }] }))
      .mockResolvedValueOnce(jsonResponse({ error: "Sections offline" }, 503))
      .mockResolvedValueOnce(jsonResponse({ locations: [] }))

    render(
      <WarehouseClient
        initialRows={[
          warehouseRow(),
          warehouseRow({ id: "wh-2", name: "Overflow Warehouse", sectionsCount: 0, locationsCount: 0 }),
        ]}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Open warehouse Main Warehouse" }))
    expect((await screen.findAllByDisplayValue("Showroom")).length).toBeGreaterThan(0)

    await user.click(screen.getByRole("button", { name: "x" }))
    await user.click(screen.getByRole("button", { name: "Open warehouse Overflow Warehouse" }))

    expect(await screen.findByText("Sections offline")).toBeTruthy()
    expect(screen.getAllByDisplayValue("Showroom").length).toBeGreaterThan(0)
    expect(screen.getByDisplayValue("A1")).toBeTruthy()
  })

  it("adding a section increments the active warehouse sectionsCount in UI state", async () => {
    const user = userEvent.setup()

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ sections: [{ id: "sec-1", name: "Showroom", locationsCount: 1 }] }))
      .mockResolvedValueOnce(jsonResponse({ locations: [] }))
      .mockResolvedValueOnce(jsonResponse({ section: { id: "sec-2", name: "Storage", locationsCount: 0 } }, 201))

    render(<WarehouseClient initialRows={[warehouseRow()]} />)

    await user.click(screen.getByRole("button", { name: "Open warehouse Main Warehouse" }))
    await screen.findAllByDisplayValue("Showroom")

    await user.type(screen.getByPlaceholderText("Section name"), "Storage")
    await user.click(screen.getAllByRole("button", { name: "Add" })[0])

    expect((await screen.findAllByDisplayValue("Storage")).length).toBeGreaterThan(0)
    expect(screen.getByText("2 sections / 1 locations / 0 work orders")).toBeTruthy()
  })

  it("adding a location increments warehouse locationsCount and the target section locationsCount", async () => {
    const user = userEvent.setup()

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ sections: [{ id: "sec-1", name: "Showroom", locationsCount: 0 }] }))
      .mockResolvedValueOnce(jsonResponse({ locations: [] }))
      .mockResolvedValueOnce(jsonResponse({ location: { id: "loc-1", locationCode: "A1", sectionId: "sec-1", sectionName: "Showroom" } }, 201))

    render(<WarehouseClient initialRows={[warehouseRow({ sectionsCount: 1, locationsCount: 0 })]} />)

    await user.click(screen.getByRole("button", { name: "Open warehouse Main Warehouse" }))
    await screen.findAllByDisplayValue("Showroom")

    await user.type(screen.getByPlaceholderText("Location code"), "A1")
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "sec-1" } })
    await user.click(screen.getByRole("button", { name: "Add Location" }))

    expect(await screen.findByDisplayValue("A1")).toBeTruthy()
    expect(screen.getByText("1 sections / 1 locations / 0 work orders")).toBeTruthy()
    expect(screen.getAllByText("1").length).toBeGreaterThan(0)
  })

  it("moving a location from one section to another updates both affected section counts", async () => {
    const user = userEvent.setup()

    fetchMock
      .mockResolvedValueOnce(jsonResponse({
        sections: [
          { id: "sec-1", name: "Showroom", locationsCount: 1 },
          { id: "sec-2", name: "Storage", locationsCount: 0 },
        ],
      }))
      .mockResolvedValueOnce(jsonResponse({
        locations: [{ id: "loc-1", locationCode: "A1", sectionId: "sec-1", sectionName: "Showroom" }],
      }))
      .mockResolvedValueOnce(jsonResponse({
        location: { id: "loc-1", locationCode: "A1", sectionId: "sec-2", sectionName: "Storage" },
      }))

    render(<WarehouseClient initialRows={[warehouseRow({ sectionsCount: 2, locationsCount: 1 })]} />)

    await user.click(screen.getByRole("button", { name: "Open warehouse Main Warehouse" }))
    await screen.findByDisplayValue("A1")

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

  it("deleting a location decrements warehouse and section counts", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, "confirm").mockReturnValue(true)

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ sections: [{ id: "sec-1", name: "Showroom", locationsCount: 1 }] }))
      .mockResolvedValueOnce(jsonResponse({ locations: [{ id: "loc-1", locationCode: "A1", sectionId: "sec-1", sectionName: "Showroom" }] }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))

    render(<WarehouseClient initialRows={[warehouseRow()]} />)

    await user.click(screen.getByRole("button", { name: "Open warehouse Main Warehouse" }))
    await screen.findByDisplayValue("A1")

    const deleteButtons = screen.getAllByRole("button", { name: "Delete" })
    await user.click(deleteButtons[1])

    await waitFor(() => {
      expect(screen.queryByDisplayValue("A1")).toBeNull()
    })

    expect(screen.getByText("1 sections / 0 locations / 0 work orders")).toBeTruthy()
    expect(screen.getAllByText("0").length).toBeGreaterThan(0)
  })

  it("deleting a section removes it from the list after a successful delete", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, "confirm").mockReturnValue(true)

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ sections: [{ id: "sec-1", name: "Showroom", locationsCount: 0 }] }))
      .mockResolvedValueOnce(jsonResponse({ locations: [] }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))

    render(<WarehouseClient initialRows={[warehouseRow({ sectionsCount: 1, locationsCount: 0 })]} />)

    await user.click(screen.getByRole("button", { name: "Open warehouse Main Warehouse" }))
    await screen.findAllByDisplayValue("Showroom")

    await user.click(screen.getAllByRole("button", { name: "Delete" })[0])

    await waitFor(() => {
      expect(screen.queryAllByDisplayValue("Showroom")).toHaveLength(0)
    })

    expect(screen.getByText("No sections yet.")).toBeTruthy()
  })

  it("failed section delete shows the API error", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, "confirm").mockReturnValue(true)

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ sections: [{ id: "sec-1", name: "Showroom", locationsCount: 1 }] }))
      .mockResolvedValueOnce(jsonResponse({ locations: [] }))
      .mockResolvedValueOnce(jsonResponse({ error: "Section cannot be deleted while locations are linked to it" }, 409))

    render(<WarehouseClient initialRows={[warehouseRow()]} />)

    await user.click(screen.getByRole("button", { name: "Open warehouse Main Warehouse" }))
    await screen.findAllByDisplayValue("Showroom")
    await user.click(screen.getAllByRole("button", { name: "Delete" })[0])

    expect(await screen.findByText("Section cannot be deleted while locations are linked to it")).toBeTruthy()
    expect(screen.getAllByDisplayValue("Showroom").length).toBeGreaterThan(0)
  })

  it("the top card does not render a duplicate warehouse title pattern", async () => {
    const user = userEvent.setup()

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ sections: [] }))
      .mockResolvedValueOnce(jsonResponse({ locations: [] }))

    render(<WarehouseClient initialRows={[warehouseRow()]} />)

    await user.click(screen.getByRole("button", { name: "Open warehouse Main Warehouse" }))
    expect(await screen.findByText("Warehouse - Main Warehouse")).toBeTruthy()
    expect(screen.getAllByText("Warehouse - Main Warehouse")).toHaveLength(1)
    expect(screen.getAllByText("Main Warehouse")).toHaveLength(1)
  })
})
