import { beforeEach, describe, expect, it, vi } from "vitest"

const { listProductsForListViewMock } = vi.hoisted(() => ({
  listProductsForListViewMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  listProductsForListView: listProductsForListViewMock,
}))

import { listProductsUseCase } from "../../../src/flooring/products/list-products.js"

function callArgs() {
  return listProductsForListViewMock.mock.calls[0]![0] as {
    search?: string
    filters?: {
      prodNumber?: string
      color?: string
      style?: string
      namingAddon?: string
      categoryId?: ReadonlyArray<string>
    }
    skip: number
    take: number
  }
}

beforeEach(() => {
  listProductsForListViewMock.mockReset()
  listProductsForListViewMock.mockResolvedValue({ rows: [], total: 0 })
})

describe("listProductsUseCase", () => {
  it("applies default pagination (page 1, page size 50, skip 0)", async () => {
    await listProductsUseCase({})
    expect(callArgs()).toMatchObject({ skip: 0, take: 50 })
  })

  it("clamps page below 1 up to 1", async () => {
    await listProductsUseCase({ page: 0 })
    expect(callArgs().skip).toBe(0)
  })

  it("clamps page size above the max (200)", async () => {
    await listProductsUseCase({ pageSize: 5000 })
    expect(callArgs().take).toBe(200)
  })

  it("computes skip from page and page size", async () => {
    await listProductsUseCase({ page: 3, pageSize: 10 })
    expect(callArgs()).toMatchObject({ skip: 20, take: 10 })
  })

  it("trims search and drops a blank one", async () => {
    await listProductsUseCase({ search: "  maple  " })
    expect(callArgs().search).toBe("maple")
    listProductsForListViewMock.mockClear()
    await listProductsUseCase({ search: "   " })
    expect(callArgs().search).toBeUndefined()
  })

  it("trims the product number filter and drops a blank one", async () => {
    await listProductsUseCase({ filters: { prodNumber: "  5  " } })
    expect(callArgs().filters).toEqual({ prodNumber: "5" })
    listProductsForListViewMock.mockClear()
    await listProductsUseCase({ filters: { prodNumber: "   " } })
    expect(callArgs().filters).toBeUndefined()
  })

  it("trims the color filter and drops a blank one", async () => {
    await listProductsUseCase({ filters: { color: "  Beige  " } })
    expect(callArgs().filters).toEqual({ color: "Beige" })
    listProductsForListViewMock.mockClear()
    await listProductsUseCase({ filters: { color: "   " } })
    expect(callArgs().filters).toBeUndefined()
  })

  it("trims the style filter and drops a blank one", async () => {
    await listProductsUseCase({ filters: { style: "  Plank  " } })
    expect(callArgs().filters).toEqual({ style: "Plank" })
    listProductsForListViewMock.mockClear()
    await listProductsUseCase({ filters: { style: "   " } })
    expect(callArgs().filters).toBeUndefined()
  })

  it("trims the naming addon filter and drops a blank one", async () => {
    await listProductsUseCase({ filters: { namingAddon: "  XL  " } })
    expect(callArgs().filters).toEqual({ namingAddon: "XL" })
    listProductsForListViewMock.mockClear()
    await listProductsUseCase({ filters: { namingAddon: "   " } })
    expect(callArgs().filters).toBeUndefined()
  })

  it("trims and de-duplicates category id filters", async () => {
    await listProductsUseCase({ filters: { categoryId: [" cat-1 ", "cat-1", "cat-2", "  "] } })
    expect(callArgs().filters).toEqual({ categoryId: ["cat-1", "cat-2"] })
  })

  it("combines product number, text, and category id filters", async () => {
    await listProductsUseCase({
      filters: {
        prodNumber: "7",
        color: "Beige",
        style: "Plank",
        namingAddon: "XL",
        categoryId: ["cat-1"],
      },
    })
    expect(callArgs().filters).toEqual({
      prodNumber: "7",
      color: "Beige",
      style: "Plank",
      namingAddon: "XL",
      categoryId: ["cat-1"],
    })
  })

  it("omits filters entirely when none survive normalization", async () => {
    await listProductsUseCase({
      filters: {
        prodNumber: "  ",
        color: "  ",
        style: "  ",
        namingAddon: "  ",
        categoryId: ["  "],
      },
    })
    expect(callArgs().filters).toBeUndefined()
  })

  it("returns the repository rows and total", async () => {
    listProductsForListViewMock.mockResolvedValue({ rows: [{ id: "p1" }], total: 1 })
    expect(await listProductsUseCase({})).toEqual({ rows: [{ id: "p1" }], total: 1 })
  })
})
