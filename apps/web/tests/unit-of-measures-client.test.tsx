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
import UnitOfMeasuresClient from "@/features/flooring/unit-of-measures/components/unit-of-measures-client"
import { UnitOfMeasureDetailClient } from "@/features/flooring/unit-of-measures/components/detail/unit-of-measure-detail-client"

function unitRow(overrides: Partial<{
  id: string
  name: string
  createdAt: string
  updatedAt: string
}> = {}) {
  return {
    id: "u-1",
    name: "Square Feet",
    createdAt: "2026-03-19T00:00:00.000Z",
    updatedAt: "2026-03-19T00:00:00.000Z",
    ...overrides,
  }
}

describe("UnitOfMeasuresClient", () => {
  beforeEach(() => {
    resetSimpleTableClientMocks()
  })

  it("dashboard add routes to the canonical unit-of-measure create form", async () => {
    const user = userEvent.setup()

    render(<UnitOfMeasuresClient canManage initialUnitOfMeasures={[]} />)

    await user.click(screen.getByRole("button", { name: /\+?Unit Of Measure$/ }))

    expect(navigationMocks.push).toHaveBeenCalledWith(
      "/dashboard/flooring/unit-of-measures/new?returnTo=%2Fdashboard%2Fflooring%2Ftest",
      { scroll: false },
    )
  })

  it("row click routes to the canonical detail page", async () => {
    const user = userEvent.setup()

    render(<UnitOfMeasuresClient canManage initialUnitOfMeasures={[unitRow()]} />)

    await user.click(screen.getByRole("button", { name: "Open unit of measure Square Feet" }))

    expect(navigationMocks.push).toHaveBeenCalledWith(expect.stringContaining("/dashboard/flooring/unit-of-measures/u-1"), { scroll: false })
  })

  it("detail save validates and uses the engine primary section route", async () => {
    const user = userEvent.setup()
    requestJsonMock.mockRejectedValueOnce(
      new MockRequestJsonError("Unit of measure is required", {
        status: 400,
        payload: { field: "name" },
      }),
    )

    render(
      <UnitOfMeasureDetailClient
        unitOfMeasure={unitRow()}
        canManage
        backHref="/dashboard/flooring/unit-of-measures"
      />,
    )

    const panelInput = screen.getByLabelText("Unit Of Measure")
    await user.clear(panelInput)
    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(await screen.findByText("Unit of measure is required")).toBeTruthy()

    requestJsonMock.mockResolvedValue({
      unitOfMeasure: unitRow({ name: "Hour", updatedAt: "2026-03-20T00:00:00.000Z" }),
    })

    await user.type(panelInput, "Hour")
    await user.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalled()
    })

    const [url, options] = requestJsonMock.mock.calls.at(-1) ?? []
    const body = JSON.parse(String(options?.body ?? "{}"))

    expect(url).toBe("/api/builder/unit-of-measures/u-1/primary/section")
    expect(options).toMatchObject({
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    })
    expect(body).toMatchObject({
      name: "Hour",
      mutation: {
        expectedUpdatedAt: "2026-03-19T00:00:00.000Z",
      },
    })
    expect(body.mutation.idempotencyKey).toEqual(expect.any(String))
  })

  it("detail save renders transport errors inside the primary section", async () => {
    const user = userEvent.setup()
    requestJsonMock.mockRejectedValue(new Error("Unit of measure must be unique"))

    render(
      <UnitOfMeasureDetailClient
        unitOfMeasure={unitRow()}
        canManage
        backHref="/dashboard/flooring/unit-of-measures"
      />,
    )

    await user.clear(screen.getByLabelText("Unit Of Measure"))
    await user.type(screen.getByLabelText("Unit Of Measure"), "Hour")
    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(await screen.findByText("Unit of measure must be unique")).toBeTruthy()
  })

  it("delete flow confirms and removes the row on success", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, "confirm").mockReturnValue(true)
    requestJsonMock.mockResolvedValue({ success: true })

    render(<UnitOfMeasuresClient canManage initialUnitOfMeasures={[unitRow()]} />)

    await user.click(screen.getByRole("button", { name: "Delete" }))

    await waitFor(() => {
      expect(screen.queryByText("Square Feet")).toBeNull()
    })
    expect(screen.getByText("Unit of measure deleted")).toBeTruthy()
  })

  it("delete flow surfaces linked-delete server error on failure", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, "confirm").mockReturnValue(true)
    requestJsonMock.mockRejectedValue(new Error("This unit of measure is linked to categories and cannot be deleted"))

    render(<UnitOfMeasuresClient canManage initialUnitOfMeasures={[unitRow()]} />)

    await user.click(screen.getByRole("button", { name: "Delete" }))

    expect(await screen.findByText("This unit of measure is linked to categories and cannot be deleted")).toBeTruthy()
    expect(screen.getByText("Square Feet")).toBeTruthy()
  })

  it("read-only mode hides create and row mutation controls", () => {
    render(<UnitOfMeasuresClient canManage={false} initialUnitOfMeasures={[unitRow()]} />)

    expect(screen.queryByRole("button", { name: /\+?Unit Of Measure$/ })).toBeNull()
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull()
    expect(screen.getByText("Square Feet")).toBeTruthy()
  })
})
