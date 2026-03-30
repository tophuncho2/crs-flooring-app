// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { navigationMocks } from "./helpers/next-navigation-mock"
import { PropertyDetailClient } from "@/features/flooring/properties/record/detail/property-detail-client"

const property = {
  id: "prop-1",
  updatedAt: "2026-03-30T00:00:00.000Z",
  name: "Oak Apartments",
  streetAddress: "42 Oak Ave",
  city: "Cary",
  state: "NC",
  zip: "27511",
  phone: "555-0101",
  email: "oak@example.com",
  fullAddress: "42 Oak Ave, Cary, NC, 27511",
  managementCompany: {
    id: "mc-1",
    name: "Acme Management",
  },
  templates: [
    {
      id: "tpl-1",
      templateTag: "Turn",
      warehouseName: "Main Warehouse",
      itemsCount: 3,
    },
  ],
}

describe("PropertyDetailClient", () => {
  beforeEach(() => {
    cleanup()
    navigationMocks.push.mockReset()
    vi.stubGlobal("confirm", vi.fn(() => true))
  })

  it("renders through the record-view engine and keeps template add/open inside the templates section", async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, "", "/dashboard/flooring/properties/prop-1")

    render(
      <PropertyDetailClient
        property={property}
        managementOptions={[{ id: "mc-1", name: "Acme Management" }]}
        warehouseOptions={[{ id: "wh-1", name: "Main Warehouse" }]}
        backHref="/dashboard/flooring/properties"
      />,
    )

    expect(screen.getByText("Property Oak Apartments")).toBeTruthy()
    expect(screen.getByLabelText("Property Name").className).toContain("border-sky-500/35")
    expect(screen.getAllByText("Templates").length).toBeGreaterThan(0)

    await user.click(screen.getByRole("button", { name: "Add Template" }))

    expect(screen.getByRole("textbox", { name: "Template Tag" })).toBeTruthy()
    expect(screen.getByRole("combobox", { name: "Warehouse" })).toBeTruthy()

    await user.click(screen.getByRole("button", { name: "Open" }))

    await waitFor(() => {
      expect(navigationMocks.push).toHaveBeenCalledWith(
        "/dashboard/flooring/templates/tpl-1?returnTo=%2Fdashboard%2Fflooring%2Fproperties%2Fprop-1",
        { scroll: false },
      )
    })
  })
})
