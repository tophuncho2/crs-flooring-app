import { beforeEach, describe, expect, it, vi } from "vitest"

const { listInventoryForListViewMock } = vi.hoisted(() => ({
  listInventoryForListViewMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  listInventoryForListView: listInventoryForListViewMock,
}))

import { listInventoryUseCase } from "../../src/inventory/list-inventory.js"

function sortArg() {
  return (listInventoryForListViewMock.mock.calls[0]![0] as { sort?: { entries: unknown[] } }).sort
}

function filtersArg() {
  return (listInventoryForListViewMock.mock.calls[0]![0] as { filters?: Record<string, unknown> })
    .filters
}

beforeEach(() => {
  listInventoryForListViewMock.mockReset()
  listInventoryForListViewMock.mockResolvedValue({ rows: [], total: 0 })
})

describe("listInventoryUseCase — multi-column sort seam", () => {
  it("maps a single `sort` to a one-entry ordered list", async () => {
    await listInventoryUseCase({ sort: { field: "location", direction: "asc" }, page: 1, pageSize: 25 })
    expect(sortArg()).toEqual({ entries: [{ field: "location", direction: "asc" }] })
  })

  it("maps the ordered `sorts` array, which wins over `sort`", async () => {
    await listInventoryUseCase({
      sort: { field: "createdAt", direction: "desc" },
      sorts: [
        { field: "stockBalance", direction: "desc" },
        { field: "location", direction: "asc" },
      ],
      page: 1,
      pageSize: 25,
    })
    expect(sortArg()).toEqual({
      entries: [
        { field: "stockBalance", direction: "desc" },
        { field: "location", direction: "asc" },
      ],
    })
  })

  it("caps the sort chain at 3 levels", async () => {
    await listInventoryUseCase({
      sorts: [
        { field: "stockBalance", direction: "desc" },
        { field: "location", direction: "asc" },
        { field: "createdAt", direction: "desc" },
        { field: "stockBalance", direction: "asc" },
      ],
      page: 1,
      pageSize: 25,
    })
    expect(sortArg()?.entries).toHaveLength(3)
  })

  it("omits sort entirely when neither `sort` nor `sorts` is provided", async () => {
    await listInventoryUseCase({ page: 1, pageSize: 25 })
    expect(sortArg()).toBeUndefined()
  })
})

describe("listInventoryUseCase — product-attribute search seam", () => {
  it("passes the four trimmed product searches through to the repo filters", async () => {
    await listInventoryUseCase({
      filters: { prodNumber: " 12 ", color: " beige ", style: "plush", namingAddon: "clearance" },
      page: 1,
      pageSize: 25,
    })
    expect(filtersArg()).toMatchObject({
      prodNumber: "12",
      color: "beige",
      style: "plush",
      namingAddon: "clearance",
    })
  })

  it("resolves filters to undefined when only blank product searches are given", async () => {
    await listInventoryUseCase({
      filters: { prodNumber: "   ", color: "" },
      page: 1,
      pageSize: 25,
    })
    expect(filtersArg()).toBeUndefined()
  })
})
