// @vitest-environment jsdom

import React from "react"
import { beforeEach, describe, expect, it } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { navigationMocks } from "../../helpers/next-navigation-mock"
import { requestJsonMock, resetSimpleTableClientMocks } from "../../helpers/simple-table-client-mocks"
import { ManufacturerCreateClient } from "@/modules/manufacturers/components/record/manufacturer-create-client"
import { ProductCreateClient } from "@/modules/products/record/create/product-create-client"
import { PropertyCreateClient } from "@/modules/properties/record/create/property-create-client"
import { TemplateCreateClient } from "@/modules/templates/record/create/template-create-client"

describe("record create clients", () => {
  beforeEach(() => {
    resetSimpleTableClientMocks()
  })

  it("manufacturer create mode uses the record-view shell and closes back to returnTo", async () => {
    const user = userEvent.setup()

    render(<ManufacturerCreateClient backHref="/dashboard/manufacturers" />)

    expect(screen.getByText("New Manufacturer")).toBeTruthy()
    expect(screen.queryByRole("button", { name: /Delete/i })).toBeNull()

    await user.click(screen.getByRole("button", { name: "Close" }))

    expect(navigationMocks.push).toHaveBeenCalledWith("/dashboard/manufacturers", { scroll: false })
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
        backHref="/dashboard/management-companies/mc-1"
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
        "/api/properties",
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
        "/dashboard/properties/prop-2?returnTo=%2Fdashboard%2Fmanagement-companies%2Fmc-1",
        { scroll: false },
      )
    })
  })

  it("product create mode uses the record-view form route and redirects after save", async () => {
    const user = userEvent.setup()
    requestJsonMock.mockResolvedValueOnce({
      product: {
        id: "prod-2",
        name: "Carpet - Plush - Sand",
        categoryId: "cat-1",
        manufacturerId: "man-1",
        manufacturerName: "Acme",
        style: "Plush",
        color: "Sand",
        width: "12ft",
        sheetSize: "",
        thickness: "",
        unitWeight: "",
        coveragePerUnit: "20",
        coverageUnit: "SF",
        notes: "",
        createdAt: "2026-03-30T00:00:00.000Z",
        updatedAt: "2026-03-30T00:00:00.000Z",
        category: {
          id: "cat-1",
          name: "Carpet",
          sendUnit: "SY",
          stockUnit: "SF",
          coverageAvailableUnit: "SF",
          itemCoverageUnit: "SF",
        },
      },
    })

    render(
      <ProductCreateClient
        backHref="/dashboard/products"
        categoryOptions={[{ id: "cat-1", name: "Carpet", sendUnit: "SY", stockUnit: "SF", coverageAvailableUnit: "SF", itemCoverageUnit: "SF" }]}
        manufacturerOptions={[{ id: "man-1", name: "Acme", website: "", phone: "", email: "" }]}
      />,
    )

    expect(screen.getByText("New Product")).toBeTruthy()
    expect(screen.queryByText("Inventory Rows")).toBeNull()

    await user.selectOptions(screen.getByRole("combobox", { name: "Category" }), "cat-1")
    await user.type(screen.getByRole("textbox", { name: "Style" }), "Plush")
    await user.type(screen.getByRole("textbox", { name: "Color" }), "Sand")
    await user.click(screen.getByRole("button", { name: "Create Product" }))

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith(
        "/api/products",
        expect.objectContaining({ method: "POST" }),
      )
    })

    const productPayload = JSON.parse(String(requestJsonMock.mock.calls[0]?.[1]?.body ?? "{}"))
    expect(productPayload).toMatchObject({
      categoryId: "cat-1",
      style: "Plush",
      color: "Sand",
    })

    await waitFor(() => {
      expect(navigationMocks.push).toHaveBeenCalledWith(
        "/dashboard/products/prod-2?returnTo=%2Fdashboard%2Fproducts",
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
        backHref="/dashboard/properties/prop-1"
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
        "/api/templates",
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
        "/dashboard/templates/tpl-2?returnTo=%2Fdashboard%2Fproperties%2Fprop-1",
        { scroll: false },
      )
    })
  })
})
