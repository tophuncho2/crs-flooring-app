// @vitest-environment jsdom

import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  MockRequestJsonError,
  requestJsonMock,
  resetSimpleTableClientMocks,
} from "../../helpers/simple-table-client-mocks"
import { navigationMocks } from "../../helpers/next-navigation-mock"
import ManufacturersClient from "@/modules/manufacturers/components/list/manufacturers-client"
import { ManufacturerDetailClient } from "@/modules/manufacturers/components/record/manufacturer-detail-client"

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
      "/dashboard/manufacturers/new?returnTo=%2Fdashboard%2Ftest",
      { scroll: false },
    )
  })

  it("row click routes to the canonical detail page", async () => {
    const user = userEvent.setup()

    render(<ManufacturersClient initialManufacturers={[manufacturerRow()]} />)

    await user.click(screen.getByRole("button", { name: "Open manufacturer Acme Flooring" }))

    expect(navigationMocks.push).toHaveBeenCalledWith(expect.stringContaining("/dashboard/manufacturers/mfg-1"), { scroll: false })
  })

  it("detail save renders transport errors inside the primary section", async () => {
    const user = userEvent.setup()
    requestJsonMock.mockRejectedValue(new Error("Company name must be unique"))

    render(
      <ManufacturerDetailClient
        manufacturer={manufacturerRow()}
        backHref="/dashboard/manufacturers"
      />,
    )

    const companyInput = screen.getByLabelText("Company Name")
    await user.clear(companyInput)
    await user.type(companyInput, "Updated Mill")
    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(await screen.findByText("Company name must be unique")).toBeTruthy()
  })

})
