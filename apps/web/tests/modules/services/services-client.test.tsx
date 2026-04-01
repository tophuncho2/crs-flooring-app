// @vitest-environment jsdom

import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  requestJsonMock,
  resetSimpleTableClientMocks,
} from "../../helpers/simple-table-client-mocks"
import { navigationMocks } from "../../helpers/next-navigation-mock"
import ServicesClient from "@/modules/services/components/services-client"
import { ServiceDetailClient } from "@/modules/services/record/detail/service-detail-client"

function serviceRow(overrides: Partial<{
  id: string
  name: string
  unitId: string
  unitName: string
  baseCost: string
  notes: string
  usageCount: number
  createdAt: string
  updatedAt: string
}> = {}) {
  return {
    id: "svc-1",
    name: "Install",
    unitId: "unit-1",
    unitName: "Square Feet",
    baseCost: "9.50",
    notes: "",
    usageCount: 0,
    createdAt: "2026-03-19T00:00:00.000Z",
    updatedAt: "2026-03-19T00:00:00.000Z",
    ...overrides,
  }
}

describe("ServicesClient", () => {
  beforeEach(() => {
    resetSimpleTableClientMocks()
  })

  it("dashboard add routes to the canonical service create form", async () => {
    const user = userEvent.setup()

    render(
      <ServicesClient
        initialServices={[]}
        unitOptions={[
          { id: "unit-1", name: "Square Feet" },
          { id: "unit-2", name: "Room" },
        ]}
      />,
    )

    await user.click(screen.getByRole("button", { name: /\+?Service$/ }))

    expect(navigationMocks.push).toHaveBeenCalledWith(
      "/dashboard/services/new?returnTo=%2Fdashboard%2Ftest",
      { scroll: false },
    )
  })

  it("row click routes to the canonical detail page", async () => {
    const user = userEvent.setup()

    render(
      <ServicesClient
        initialServices={[serviceRow()]}
        unitOptions={[
          { id: "unit-1", name: "Square Feet" },
          { id: "unit-2", name: "Room" },
        ]}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Open service Install" }))

    expect(navigationMocks.push).toHaveBeenCalledWith(expect.stringContaining("/dashboard/services/svc-1"), { scroll: false })
  })

  it("detail save validates and PATCHes the expected payload", async () => {
    const user = userEvent.setup()

    render(
      <ServiceDetailClient
        service={serviceRow()}
        unitOptions={[
          { id: "unit-1", name: "Square Feet" },
          { id: "unit-2", name: "Room" },
        ]}
        backHref="/dashboard/services"
      />,
    )

    const nameInput = screen.getByLabelText("Service Name")
    await user.clear(nameInput)
    await user.click(screen.getByRole("button", { name: "Save Service" }))

    expect(requestJsonMock).not.toHaveBeenCalled()
    expect(screen.getByText("Service name is required")).toBeTruthy()

    requestJsonMock.mockResolvedValue({
      service: serviceRow({ name: "Repair", unitId: "unit-2", unitName: "Room", baseCost: "12.00", notes: "Rush" }),
    })

    await user.type(nameInput, "Repair")
    fireEvent.change(screen.getByLabelText("Service Unit"), { target: { value: "unit-2" } })
    const costInput = screen.getByLabelText("Cost")
    await user.clear(costInput)
    await user.type(costInput, "12.00")
    await user.type(screen.getByLabelText("Notes"), "Rush")
    await user.click(screen.getByRole("button", { name: "Save Service" }))

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith("/api/services/svc-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Repair",
          unitId: "unit-2",
          baseCost: "12.00",
          notes: "Rush",
        }),
      })
    })

    expect(screen.getByText("Service saved")).toBeTruthy()
  })

  it("delete flow confirms and removes the row on success", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, "confirm").mockReturnValue(true)
    requestJsonMock.mockResolvedValue({ ok: true })

    render(
      <ServicesClient
        initialServices={[serviceRow()]}
        unitOptions={[{ id: "unit-1", name: "Square Feet" }]}
      />,
    )

    expect(screen.getByText("Install")).toBeTruthy()
    await user.click(screen.getByRole("button", { name: "Delete" }))

    await waitFor(() => {
      expect(screen.queryByText("Install")).toBeNull()
    })

    expect(screen.getByText("Service deleted")).toBeTruthy()
  })

  it("delete flow surfaces linked-record errors without removing the row", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, "confirm").mockReturnValue(true)
    requestJsonMock.mockRejectedValue(new Error("This record is linked and cannot be modified"))

    render(
      <ServicesClient
        initialServices={[serviceRow()]}
        unitOptions={[{ id: "unit-1", name: "Square Feet" }]}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Delete" }))

    expect(await screen.findByText("This record is linked and cannot be modified")).toBeTruthy()
    expect(screen.getByText("Install")).toBeTruthy()
  })
})
