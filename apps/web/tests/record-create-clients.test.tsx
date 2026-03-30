// @vitest-environment jsdom

import React from "react"
import { beforeEach, describe, expect, it } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { navigationMocks } from "./helpers/next-navigation-mock"
import { requestJsonMock, resetSimpleTableClientMocks } from "./helpers/simple-table-client-mocks"
import { ManufacturerCreateClient } from "@/features/flooring/manufacturers/record/create/manufacturer-create-client"
import { PropertyCreateClient } from "@/features/flooring/properties/record/create/property-create-client"
import { TemplateCreateClient } from "@/features/flooring/templates/record/create/template-create-client"

describe("record create clients", () => {
  beforeEach(() => {
    resetSimpleTableClientMocks()
  })

  it("manufacturer create mode uses the record-view shell and closes back to returnTo", async () => {
    const user = userEvent.setup()

    render(<ManufacturerCreateClient backHref="/dashboard/flooring/manufacturers" />)

    expect(screen.getByText("New Manufacturer")).toBeTruthy()
    expect(screen.queryByRole("button", { name: /Delete/i })).toBeNull()

    await user.click(screen.getByRole("button", { name: "Close" }))

    expect(navigationMocks.push).toHaveBeenCalledWith("/dashboard/flooring/manufacturers", { scroll: false })
  })

  it("property create mode only shows the primary section, locks the parent company, and redirects after save", async () => {
    const user = userEvent.setup()
    requestJsonMock.mockResolvedValueOnce({
      property: {
        id: "prop-2",
        updatedAt: "2026-03-30T00:00:00.000Z",
        name: "Oak Apartments",
        streetAddress: "42 Oak Ave",
        city: "Cary",
        state: "NC",
        zip: "27511",
        phone: "",
        email: "",
        fullAddress: "42 Oak Ave, Cary, NC, 27511",
        managementCompany: { id: "mc-1", name: "Acme Management" },
        templates: [],
      },
    })

    render(
      <PropertyCreateClient
        backHref="/dashboard/flooring/management-companies/mc-1"
        managementOptions={[{ id: "mc-1", name: "Acme Management" }]}
        initialManagementCompanyId="mc-1"
      />,
    )

    expect(screen.getByText("New Property")).toBeTruthy()
    expect(screen.queryByText("Templates")).toBeNull()
    expect(screen.getByRole("combobox", { name: "Management Company" }).hasAttribute("disabled")).toBe(true)

    await user.type(screen.getByRole("textbox", { name: "Property Name" }), "Oak Apartments")
    await user.click(screen.getByRole("button", { name: "Create Property" }))

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith(
        "/api/flooring/properties",
        expect.objectContaining({ method: "POST" }),
      )
    })

    const propertyPayload = JSON.parse(String(requestJsonMock.mock.calls[0]?.[1]?.body ?? "{}"))
    expect(propertyPayload).toMatchObject({
      name: "Oak Apartments",
      managementCompanyId: "mc-1",
    })

    await waitFor(() => {
      expect(navigationMocks.push).toHaveBeenCalledWith(
        "/dashboard/flooring/properties/prop-2?returnTo=%2Fdashboard%2Fflooring%2Fmanagement-companies%2Fmc-1",
        { scroll: false },
      )
    })
  })

  it("template create mode only shows the primary section, locks the parent property, and redirects after save", async () => {
    const user = userEvent.setup()
    requestJsonMock.mockResolvedValueOnce({
      template: {
        id: "tpl-2",
        templateNumber: "TP-00002",
        templateTag: "Turn",
        propertyId: "prop-1",
        propertyName: "Oak Apartments",
        warehouseId: "",
        warehouseName: "",
        instructions: "",
        templateNotes: "",
        padProductId: "",
        padTypeLabel: "",
        createdAt: "2026-03-30T00:00:00.000Z",
        updatedAt: "2026-03-30T00:00:00.000Z",
      },
    })

    render(
      <TemplateCreateClient
        backHref="/dashboard/flooring/properties/prop-1"
        propertyOptions={[{ id: "prop-1", name: "Oak Apartments" }]}
        warehouseOptions={[{ id: "wh-1", name: "Main Warehouse" }]}
        padProductOptions={[]}
        initialPropertyId="prop-1"
      />,
    )

    expect(screen.getByText("New Template")).toBeTruthy()
    expect(screen.queryByText("Material Items")).toBeNull()
    expect(screen.getByRole("combobox", { name: "Property" }).hasAttribute("disabled")).toBe(true)

    await user.type(screen.getByRole("textbox", { name: "Template Tag" }), "Turn")
    await user.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith(
        "/api/flooring/templates",
        expect.objectContaining({ method: "POST" }),
      )
    })

    const templatePayload = JSON.parse(String(requestJsonMock.mock.calls[0]?.[1]?.body ?? "{}"))
    expect(templatePayload).toMatchObject({
      templateTag: "Turn",
      propertyId: "prop-1",
    })

    await waitFor(() => {
      expect(navigationMocks.push).toHaveBeenCalledWith(
        "/dashboard/flooring/templates/tpl-2?returnTo=%2Fdashboard%2Fflooring%2Fproperties%2Fprop-1",
        { scroll: false },
      )
    })
  })
})
