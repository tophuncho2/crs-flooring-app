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
import CategoriesClient from "@/modules/categories/components/categories-client"
import { CategoryDetailClient } from "@/modules/categories/record/detail/category-detail-client"

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
  updatedAt: string
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
    updatedAt: "2026-03-19T00:00:00.000Z",
    ...overrides,
  }
}

describe("CategoriesClient", () => {
  beforeEach(() => {
    resetSimpleTableClientMocks()
  })

  it("dashboard add routes to the canonical category create form", async () => {
    const user = userEvent.setup()

    render(<CategoriesClient canManage initialCategories={[]} unitOfMeasureOptions={[]} />)

    await user.click(screen.getByRole("button", { name: /\+?Category$/ }))

    expect(navigationMocks.push).toHaveBeenCalledWith(
      "/dashboard/categories/new?returnTo=%2Fdashboard%2Ftest",
      { scroll: false },
    )
  })

  it("row click routes to the canonical detail page", async () => {
    const user = userEvent.setup()

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

    await user.click(screen.getByRole("button", { name: "Open category Carpet" }))

    expect(navigationMocks.push).toHaveBeenCalledWith(expect.stringContaining("/dashboard/categories/cat-1"), { scroll: false })
  })

  it("detail save uses the engine primary section route", async () => {
    const user = userEvent.setup()
    requestJsonMock.mockResolvedValue({
      category: categoryRow({
        name: "Updated Carpet",
        stockUnitId: "u-stock",
        stockUnit: "Roll",
        updatedAt: "2026-03-20T00:00:00.000Z",
      }),
    })

    render(
      <CategoryDetailClient
        category={categoryRow()}
        canManage
        unitOfMeasureOptions={[
          { id: "u-send", name: "SY", createdAt: "2026-03-19T00:00:00.000Z" },
          { id: "u-stock", name: "Roll", createdAt: "2026-03-19T00:00:00.000Z" },
          { id: "u-item", name: "SF", createdAt: "2026-03-19T00:00:00.000Z" },
        ]}
        backHref="/dashboard/categories"
      />,
    )

    expect(screen.getByText("Category Carpet")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Save Category" })).toBeNull()

    const nameInput = screen.getByLabelText("Category Name")
    await user.clear(nameInput)
    await user.type(nameInput, "Updated Carpet")
    fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "u-stock" } })
    await user.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalled()
    })

    const [url, options] = requestJsonMock.mock.calls.at(-1) ?? []
    const body = JSON.parse(String(options?.body ?? "{}"))

    expect(url).toBe("/api/categories/cat-1/primary/section")
    expect(options).toMatchObject({
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    })
    expect(body).toMatchObject({
      name: "Updated Carpet",
      sendUnitId: "u-send",
      stockUnitId: "u-stock",
      coverageAvailableUnitId: "",
      itemCoverageUnitId: "u-item",
      serviceUnitId: "",
      mutation: {
        expectedUpdatedAt: "2026-03-19T00:00:00.000Z",
      },
    })
    expect(body.mutation.idempotencyKey).toEqual(expect.any(String))
  })

  it("detail save renders transport errors inside the primary section", async () => {
    const user = userEvent.setup()
    requestJsonMock.mockRejectedValue(new Error("Category name must be unique"))

    render(
      <CategoryDetailClient
        category={categoryRow()}
        canManage
        unitOfMeasureOptions={[]}
        backHref="/dashboard/categories"
      />,
    )

    await user.clear(screen.getByLabelText("Category Name"))
    await user.type(screen.getByLabelText("Category Name"), "Updated Carpet")
    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(await screen.findByText("Category name must be unique")).toBeTruthy()
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
