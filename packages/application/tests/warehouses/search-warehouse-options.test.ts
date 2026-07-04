import { beforeEach, describe, expect, it, vi } from "vitest"

const { searchWarehouseOptionsMock } = vi.hoisted(() => ({
  searchWarehouseOptionsMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  searchWarehouseOptions: searchWarehouseOptionsMock,
}))

import { searchWarehouseOptionsUseCase } from "../../src/warehouses/search-warehouse-options.js"

function callArgs() {
  return searchWarehouseOptionsMock.mock.calls[0]![0] as {
    search?: string
    skip: number
    take: number
  }
}

beforeEach(() => {
  searchWarehouseOptionsMock.mockReset()
  searchWarehouseOptionsMock.mockResolvedValue({ items: [], hasMore: false })
})

describe("searchWarehouseOptionsUseCase", () => {
  it("uses default take (20) and skip (0)", async () => {
    await searchWarehouseOptionsUseCase({})
    expect(callArgs()).toMatchObject({ take: 20, skip: 0 })
  })

  it("clamps take to the [1, 50] range", async () => {
    await searchWarehouseOptionsUseCase({ take: 999 })
    expect(callArgs().take).toBe(50)
    searchWarehouseOptionsMock.mockClear()
    await searchWarehouseOptionsUseCase({ take: 0 })
    expect(callArgs().take).toBe(1)
  })

  it("clamps a negative skip up to 0", async () => {
    await searchWarehouseOptionsUseCase({ skip: -10 })
    expect(callArgs().skip).toBe(0)
  })

  it("trims search and drops a blank one", async () => {
    await searchWarehouseOptionsUseCase({ search: "  dep " })
    expect(callArgs().search).toBe("dep")
  })

  it("passes through the repository result", async () => {
    searchWarehouseOptionsMock.mockResolvedValue({ items: [{ id: "wh-1" }], hasMore: true })
    expect(await searchWarehouseOptionsUseCase({})).toEqual({
      items: [{ id: "wh-1" }],
      hasMore: true,
    })
  })
})
