// @vitest-environment jsdom

import React from "react"
import { describe, expect, it } from "vitest"
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
  it("renders through the record-view engine with read-only linked properties and nested templates", async () => {
    const user = userEvent.setup()

    render(
      <ManagementCompanyDetailClient
        company={company}
        backHref="/dashboard/flooring/management-companies"
      />,
    )

    expect(screen.getByText("Management Company Acme Management")).toBeTruthy()
    expect(screen.getAllByText("Linked Properties").length).toBeGreaterThan(0)
    expect(screen.getByLabelText("Company Name").className).toContain("border-sky-500/35")

    await user.click(screen.getByRole("button", { name: "Show templates for Oak Apartments" }))

    expect(screen.getByText("TPL-100")).toBeTruthy()
    expect(navigationMocks.push).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Open property Oak Apartments" }))
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
