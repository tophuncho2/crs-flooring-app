// @vitest-environment jsdom

import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  requestJsonMock,
  resetSimpleTableClientMocks,
} from "./helpers/simple-table-client-mocks"
import ManufacturersClient from "@/features/flooring/manufacturers/components/manufacturers-client"

function manufacturerRow(overrides: Partial<{
  id: string
  companyName: string
  agentName: string
  website: string
  phone: string
  email: string
  productsCount: number
  createdAt: string
  updatedAt: string
}> = {}) {
  return {
    id: "mfg-1",
    companyName: "Acme Flooring",
    agentName: "",
    website: "",
    phone: "",
    email: "",
    productsCount: 0,
    createdAt: "2026-03-19T00:00:00.000Z",
    updatedAt: "2026-03-19T00:00:00.000Z",
    ...overrides,
  }
}

describe("ManufacturersClient", () => {
  beforeEach(() => {
    resetSimpleTableClientMocks()
  })

  it("create flow validates company name before posting", async () => {
    const user = userEvent.setup()

    render(<ManufacturersClient initialManufacturers={[]} />)

    await user.click(screen.getByRole("button", { name: /\+?Manufacturer$/ }))
    await user.click(screen.getByRole("button", { name: "Create Manufacturer" }))

    expect(requestJsonMock).not.toHaveBeenCalled()
    expect(screen.getAllByText("Company name is required").length).toBeGreaterThan(0)
  })

  it("create flow posts the expected payload", async () => {
    const user = userEvent.setup()
    requestJsonMock.mockResolvedValue({
      manufacturer: manufacturerRow({ id: "mfg-2", companyName: "Zen Floors", agentName: "Jamie" }),
    })

    render(<ManufacturersClient initialManufacturers={[]} />)

    await user.click(screen.getByRole("button", { name: /\+?Manufacturer$/ }))
    await user.type(screen.getByLabelText("Company Name"), "Zen Floors")
    await user.type(screen.getByLabelText("Agent Name"), "Jamie")
    await user.click(screen.getByRole("button", { name: "Create Manufacturer" }))

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith("/api/flooring/manufacturers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: "Zen Floors",
          agentName: "Jamie",
          website: "",
          phone: "",
          email: "",
        }),
      })
    })

    expect(screen.getByText("Manufacturer created")).toBeTruthy()
  })

  it("edit flow PATCHes the expected payload", async () => {
    const user = userEvent.setup()
    requestJsonMock.mockResolvedValue({
      manufacturer: manufacturerRow({ companyName: "Updated Mill", email: "sales@example.com" }),
    })

    render(<ManufacturersClient initialManufacturers={[manufacturerRow()]} />)

    await user.click(screen.getByRole("button", { name: "Edit" }))
    const companyInput = screen.getAllByLabelText("Company Name")[0]
    await user.clear(companyInput)
    await user.type(companyInput, "Updated Mill")
    await user.type(screen.getAllByLabelText("Email")[0], "sales@example.com")
    await user.click(screen.getByRole("button", { name: "Save Manufacturer" }))

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith("/api/flooring/manufacturers/mfg-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: "Updated Mill",
          agentName: "",
          website: "",
          phone: "",
          email: "sales@example.com",
        }),
      })
    })

    expect(screen.getByText("Manufacturer updated")).toBeTruthy()
  })

  it("delete flow confirms and removes the row on success", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, "confirm").mockReturnValue(true)
    requestJsonMock.mockResolvedValue({ success: true })

    render(<ManufacturersClient initialManufacturers={[manufacturerRow()]} />)

    await user.click(screen.getByRole("button", { name: "Delete" }))

    await waitFor(() => {
      expect(screen.queryByText("Acme Flooring")).toBeNull()
    })

    expect(screen.getByText("Manufacturer deleted")).toBeTruthy()
  })

  it("delete flow surfaces linked-delete errors without removing the row", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, "confirm").mockReturnValue(true)
    requestJsonMock.mockRejectedValue(new Error("This manufacturer has linked products and cannot be deleted"))

    render(<ManufacturersClient initialManufacturers={[manufacturerRow()]} />)

    await user.click(screen.getByRole("button", { name: "Delete" }))

    expect(await screen.findByText("This manufacturer has linked products and cannot be deleted")).toBeTruthy()
    expect(screen.getByText("Acme Flooring")).toBeTruthy()
  })
})
