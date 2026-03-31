// @vitest-environment jsdom

import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { navigationMocks } from "./helpers/next-navigation-mock"
import { ManagementCompanyDetailClient } from "@/features/flooring/management-companies/record/detail/management-company-detail-client"

const company = {
  id: "mc-1",
  updatedAt: "2026-03-30T00:00:00.000Z",
  name: "Acme Management",
  streetAddress: "1 Main St",
  city: "Raleigh",
  state: "NC",
  zip: "27601",
  phone: "555-0000",
  email: "ops@acme.test",
  fullAddress: "1 Main St, Raleigh, NC, 27601",
  properties: [
    {
      id: "prop-1",
      name: "Oak Apartments",
      fullAddress: "42 Oak Ave, Cary, NC, 27511",
      templateCount: 1,
      templates: [
        {
          id: "tpl-1",
          templateTag: "TPL-100",
          warehouseName: "Main Warehouse",
          itemsCount: 4,
        },
      ],
    },
  ],
}

describe("ManagementCompanyDetailClient", () => {
  beforeEach(() => {
    navigationMocks.push.mockReset()
    vi.stubGlobal("confirm", vi.fn(() => true))
  })

  it("renders through the record-view engine with read-only linked properties and nested templates", async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, "", "/dashboard/flooring/management-companies/mc-1")

    render(
      <ManagementCompanyDetailClient
        company={company}
        backHref="/dashboard/flooring/management-companies"
      />,
    )

    expect(screen.getByText("Management Company Acme Management")).toBeTruthy()
    expect(screen.getAllByText("Linked Properties").length).toBeGreaterThan(0)
    expect(screen.getByLabelText("Company Name").className).toContain("border-sky-500/35")
    expect(screen.getByRole("button", { name: "Add Property" })).toBeTruthy()

    await user.click(screen.getByRole("button", { name: "Add Property" }))
    await waitFor(() => {
      expect(navigationMocks.push).toHaveBeenCalledWith(
        "/dashboard/flooring/properties/new?returnTo=%2Fdashboard%2Fflooring%2Ftest&managementCompanyId=mc-1",
        { scroll: false },
      )
    })
    navigationMocks.push.mockClear()

    await user.click(screen.getByRole("button", { name: "Show templates for Oak Apartments" }))

    expect(screen.getByText("TPL-100")).toBeTruthy()
    expect(navigationMocks.push).not.toHaveBeenCalled()

    await user.click(screen.getAllByRole("button", { name: "Open" })[0])
    await waitFor(() => {
      expect(navigationMocks.push).toHaveBeenCalledWith(
        expect.stringContaining("/dashboard/flooring/properties/prop-1"),
        { scroll: false },
      )
    })

    await user.click(screen.getByRole("button", { name: "Open template TPL-100" }))
    await waitFor(() => {
      expect(navigationMocks.push).toHaveBeenCalledWith(
        expect.stringContaining("/dashboard/flooring/templates/tpl-1"),
        { scroll: false },
      )
    })
  })
})
