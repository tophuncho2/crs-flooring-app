// @vitest-environment jsdom

import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  requestJsonMock,
  resetSimpleTableClientMocks,
} from "./helpers/simple-table-client-mocks"
import CategoriesClient from "@/features/flooring/categories/components/categories-client"

function categoryRow(overrides: Partial<{
  id: string
  name: string
  sendUnitId: string
  stockUnitId: string
  coverageAvailableUnitId: string
  itemCoverageUnitId: string
  serviceUnitId: string
  sendUnit: string
  stockUnit: string
  coverageAvailableUnit: string
  itemCoverageUnit: string
  serviceUnit: string
  productCount: number
  createdAt: string
}> = {}) {
  return {
    id: "cat-1",
    name: "Carpet",
    sendUnitId: "u-send",
    stockUnitId: "",
    coverageAvailableUnitId: "",
    itemCoverageUnitId: "u-item",
    serviceUnitId: "",
    sendUnit: "SY",
    stockUnit: "",
    coverageAvailableUnit: "",
    itemCoverageUnit: "SF",
    serviceUnit: "",
    productCount: 2,
    createdAt: "2026-03-19T00:00:00.000Z",
    ...overrides,
  }
}

describe("CategoriesClient", () => {
  beforeEach(() => {
    resetSimpleTableClientMocks()
  })

  it("create flow validates category name before posting", async () => {
    const user = userEvent.setup()

    render(<CategoriesClient canManage initialCategories={[]} unitOfMeasureOptions={[]} />)

    await user.click(screen.getByRole("button", { name: /\+?Category$/ }))
    await user.click(screen.getByRole("button", { name: "Create Category" }))

    expect(requestJsonMock).not.toHaveBeenCalled()
    expect(screen.getAllByText("Category name is required").length).toBeGreaterThan(0)
  })

  it("create flow posts the expected payload", async () => {
    const user = userEvent.setup()
    requestJsonMock.mockResolvedValue({
      category: categoryRow({ id: "cat-2", name: "Tile", sendUnitId: "", sendUnit: "", itemCoverageUnitId: "", itemCoverageUnit: "", productCount: 0 }),
    })

    render(
      <CategoriesClient
        canManage
        initialCategories={[]}
        unitOfMeasureOptions={[
          { id: "u-send", name: "SY", createdAt: "2026-03-19T00:00:00.000Z" },
          { id: "u-item", name: "SF", createdAt: "2026-03-19T00:00:00.000Z" },
        ]}
      />,
    )

    await user.click(screen.getByRole("button", { name: /\+?Category$/ }))
    await user.type(screen.getByLabelText("Category Name"), "Tile")
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "u-send" } })
    fireEvent.change(screen.getAllByRole("combobox")[3], { target: { value: "u-item" } })
    await user.click(screen.getByRole("button", { name: "Create Category" }))

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith("/api/flooring/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Tile",
          sendUnitId: "u-send",
          stockUnitId: "",
          coverageAvailableUnitId: "",
          itemCoverageUnitId: "u-item",
          serviceUnitId: "",
        }),
      })
    })

    expect(screen.getByText("Category created")).toBeTruthy()
  })

  it("create flow surfaces server errors", async () => {
    const user = userEvent.setup()
    requestJsonMock.mockRejectedValue(new Error("Name must be unique"))

    render(<CategoriesClient canManage initialCategories={[]} unitOfMeasureOptions={[]} />)

    await user.click(screen.getByRole("button", { name: /\+?Category$/ }))
    await user.type(screen.getByLabelText("Category Name"), "Carpet")
    await user.click(screen.getByRole("button", { name: "Create Category" }))

    expect(await screen.findAllByText("Name must be unique")).toHaveLength(2)
  })

  it("edit flow opens the record and PATCHes the expected payload", async () => {
    const user = userEvent.setup()
    requestJsonMock.mockResolvedValue({
      category: categoryRow({ name: "Updated Carpet", stockUnitId: "u-stock", stockUnit: "Roll" }),
    })

    render(
      <CategoriesClient
        canManage
        initialCategories={[categoryRow()]}
        unitOfMeasureOptions={[
          { id: "u-send", name: "SY", createdAt: "2026-03-19T00:00:00.000Z" },
          { id: "u-stock", name: "Roll", createdAt: "2026-03-19T00:00:00.000Z" },
          { id: "u-item", name: "SF", createdAt: "2026-03-19T00:00:00.000Z" },
        ]}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Edit" }))
    const nameInput = screen.getAllByLabelText("Category Name")[0]
    await user.clear(nameInput)
    await user.type(nameInput, "Updated Carpet")
    fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "u-stock" } })
    await user.click(screen.getByRole("button", { name: "Save Category" }))

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith("/api/flooring/categories/cat-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Carpet",
          sendUnitId: "u-send",
          stockUnitId: "u-stock",
          coverageAvailableUnitId: "",
          itemCoverageUnitId: "u-item",
          serviceUnitId: "",
        }),
      })
    })

    expect(screen.getByText("Category updated")).toBeTruthy()
  })

  it("delete flow confirms and removes the row on success", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, "confirm").mockReturnValue(true)
    requestJsonMock.mockResolvedValue({ success: true })

    render(<CategoriesClient canManage initialCategories={[categoryRow()]} unitOfMeasureOptions={[]} />)

    expect(screen.getByText("Carpet")).toBeTruthy()
    await user.click(screen.getByRole("button", { name: "Delete" }))

    await waitFor(() => {
      expect(screen.queryByText("Carpet")).toBeNull()
    })
    expect(screen.getByText("Category deleted")).toBeTruthy()
  })

  it("delete flow surfaces failure without removing the row", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, "confirm").mockReturnValue(true)
    requestJsonMock.mockRejectedValue(new Error("This record is linked and cannot be modified"))

    render(<CategoriesClient canManage initialCategories={[categoryRow()]} unitOfMeasureOptions={[]} />)

    await user.click(screen.getByRole("button", { name: "Delete" }))

    expect(await screen.findByText("This record is linked and cannot be modified")).toBeTruthy()
    expect(screen.getByText("Carpet")).toBeTruthy()
  })

  it("read-only mode hides create and row mutation controls", () => {
    render(<CategoriesClient canManage={false} initialCategories={[categoryRow()]} unitOfMeasureOptions={[]} />)

    expect(screen.queryByRole("button", { name: /\+?Category$/ })).toBeNull()
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull()
    expect(screen.getByText("Carpet")).toBeTruthy()
  })
})
