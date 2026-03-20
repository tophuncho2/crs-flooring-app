// @vitest-environment jsdom

import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  requestJsonMock,
  resetSimpleTableClientMocks,
} from "./helpers/simple-table-client-mocks"
import UnitOfMeasuresClient from "@/features/flooring/unit-of-measures/components/unit-of-measures-client"

function unitRow(overrides: Partial<{
  id: string
  name: string
  createdAt: string
}> = {}) {
  return {
    id: "u-1",
    name: "Square Feet",
    createdAt: "2026-03-19T00:00:00.000Z",
    ...overrides,
  }
}

describe("UnitOfMeasuresClient", () => {
  beforeEach(() => {
    resetSimpleTableClientMocks()
  })

  it("create flow blocks empty name with the current client-side validation message", async () => {
    const user = userEvent.setup()

    render(<UnitOfMeasuresClient initialUnitOfMeasures={[]} />)

    await user.click(screen.getByRole("button", { name: /\+?Unit Of Measure$/ }))
    await user.click(screen.getByRole("button", { name: "Create Unit Of Measure" }))

    expect(requestJsonMock).not.toHaveBeenCalled()
    expect(screen.getAllByText("Unit of measure is required").length).toBeGreaterThan(0)
  })

  it("create flow posts the expected payload for a valid name", async () => {
    const user = userEvent.setup()
    requestJsonMock.mockResolvedValue({
      unitOfMeasure: unitRow({ id: "u-2", name: "Hour" }),
    })

    render(<UnitOfMeasuresClient initialUnitOfMeasures={[]} />)

    await user.click(screen.getByRole("button", { name: /\+?Unit Of Measure$/ }))
    await user.type(screen.getByLabelText("Unit Of Measure"), "Hour")
    await user.click(screen.getByRole("button", { name: "Create Unit Of Measure" }))

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith("/api/builder/unit-of-measures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Hour" }),
      })
    })

    expect(screen.getByText("Unit of measure created")).toBeTruthy()
  })

  it("edit flow validates and PATCHes the expected payload", async () => {
    const user = userEvent.setup()

    render(<UnitOfMeasuresClient initialUnitOfMeasures={[unitRow()]} />)

    await user.click(screen.getByRole("button", { name: "Edit" }))
    const panelInput = screen.getAllByLabelText("Unit Of Measure")[0]
    await user.clear(panelInput)
    await user.click(screen.getByRole("button", { name: "Save Unit Of Measure" }))

    expect(requestJsonMock).not.toHaveBeenCalled()
    expect(screen.getByText("Unit of measure is required")).toBeTruthy()

    requestJsonMock.mockResolvedValue({
      unitOfMeasure: unitRow({ name: "Hour" }),
    })

    await user.type(panelInput, "Hour")
    await user.click(screen.getByRole("button", { name: "Save Unit Of Measure" }))

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith("/api/builder/unit-of-measures/u-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Hour" }),
      })
    })

    expect(screen.getByText("Unit of measure updated")).toBeTruthy()
  })

  it("delete flow confirms and removes the row on success", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, "confirm").mockReturnValue(true)
    requestJsonMock.mockResolvedValue({ success: true })

    render(<UnitOfMeasuresClient initialUnitOfMeasures={[unitRow()]} />)

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

    render(<UnitOfMeasuresClient initialUnitOfMeasures={[unitRow()]} />)

    await user.click(screen.getByRole("button", { name: "Delete" }))

    expect(await screen.findByText("This unit of measure is linked to categories and cannot be deleted")).toBeTruthy()
    expect(screen.getByText("Square Feet")).toBeTruthy()
  })
})
