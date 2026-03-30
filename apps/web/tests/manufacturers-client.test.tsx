// @vitest-environment jsdom

import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  MockRequestJsonError,
  requestJsonMock,
  resetSimpleTableClientMocks,
} from "./helpers/simple-table-client-mocks"
import { navigationMocks } from "./helpers/next-navigation-mock"
import ManufacturersClient from "@/features/flooring/manufacturers/components/manufacturers-client"
import { ManufacturerDetailClient } from "@/features/flooring/manufacturers/components/detail/manufacturer-detail-client"

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

  it("dashboard add routes to the canonical manufacturer create form", async () => {
    const user = userEvent.setup()

    render(<ManufacturersClient initialManufacturers={[]} />)

    await user.click(screen.getByRole("button", { name: /\+?Manufacturer$/ }))

    expect(navigationMocks.push).toHaveBeenCalledWith(
      "/dashboard/flooring/manufacturers/new?returnTo=%2Fdashboard%2Fflooring%2Ftest",
      { scroll: false },
    )
  })

  it("row click routes to the canonical detail page", async () => {
    const user = userEvent.setup()

    render(<ManufacturersClient initialManufacturers={[manufacturerRow()]} />)

    await user.click(screen.getByRole("button", { name: "Open manufacturer Acme Flooring" }))

    expect(navigationMocks.push).toHaveBeenCalledWith(expect.stringContaining("/dashboard/flooring/manufacturers/mfg-1"), { scroll: false })
  })

  it("detail save validates and uses the engine primary section route", async () => {
    const user = userEvent.setup()
    requestJsonMock.mockRejectedValueOnce(
      new MockRequestJsonError("Company name is required", {
        status: 400,
        payload: { field: "companyName" },
      }),
    )

    render(
      <ManufacturerDetailClient
        manufacturer={manufacturerRow()}
        backHref="/dashboard/flooring/manufacturers"
      />,
    )

    const companyInput = screen.getByLabelText("Company Name")
    await user.clear(companyInput)
    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(await screen.findByText("Company name is required")).toBeTruthy()

    requestJsonMock.mockResolvedValue({
      manufacturer: manufacturerRow({
        companyName: "Updated Mill",
        email: "sales@example.com",
        updatedAt: "2026-03-20T00:00:00.000Z",
      }),
    })

    await user.type(companyInput, "Updated Mill")
    await user.type(screen.getByLabelText("Email"), "sales@example.com")
    await user.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalled()
    })

    const [url, options] = requestJsonMock.mock.calls.at(-1) ?? []
    const body = JSON.parse(String(options?.body ?? "{}"))

    expect(url).toBe("/api/flooring/manufacturers/mfg-1/primary/section")
    expect(options).toMatchObject({
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    })
    expect(body).toMatchObject({
      companyName: "Updated Mill",
      agentName: "",
      website: "",
      phone: "",
      email: "sales@example.com",
      mutation: {
        expectedUpdatedAt: "2026-03-19T00:00:00.000Z",
      },
    })
    expect(body.mutation.idempotencyKey).toEqual(expect.any(String))
  })

  it("detail save renders transport errors inside the primary section", async () => {
    const user = userEvent.setup()
    requestJsonMock.mockRejectedValue(new Error("Company name must be unique"))

    render(
      <ManufacturerDetailClient
        manufacturer={manufacturerRow()}
        backHref="/dashboard/flooring/manufacturers"
      />,
    )

    await user.clear(screen.getByLabelText("Company Name"))
    await user.type(screen.getByLabelText("Company Name"), "Updated Mill")
    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(await screen.findByText("Company name must be unique")).toBeTruthy()
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
