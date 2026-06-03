import { beforeEach, describe, expect, it, vi } from "vitest"

const { searchInventoryOptionsMock } = vi.hoisted(() => ({
  searchInventoryOptionsMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  searchInventoryOptions: searchInventoryOptionsMock,
}))

import { searchInventoryOptionsUseCase } from "../../../src/flooring/inventory/search-inventory-options.js"

beforeEach(() => {
  searchInventoryOptionsMock.mockReset()
  searchInventoryOptionsMock.mockResolvedValue({ items: [], hasMore: false })
})

function callArgs() {
  return searchInventoryOptionsMock.mock.calls[0]?.[0] as Record<string, unknown>
}

describe("searchInventoryOptionsUseCase", () => {
  it("trims and forwards the four identity column filters", async () => {
    await searchInventoryOptionsUseCase({
      warehouseId: "w-1",
      invNumber: "  100 ",
      rollNumber: " R-7 ",
      dyeLot: "  D9 ",
      note: " ripped ",
    })

    expect(callArgs()).toMatchObject({
      warehouseId: "w-1",
      invNumber: "100",
      rollNumber: "R-7",
      dyeLot: "D9",
      note: "ripped",
    })
  })

  it("drops blank/whitespace-only column filters to undefined", async () => {
    await searchInventoryOptionsUseCase({
      warehouseId: "w-1",
      invNumber: "   ",
      rollNumber: "",
      dyeLot: "A",
    })

    const args = callArgs()
    expect(args.invNumber).toBeUndefined()
    expect(args.rollNumber).toBeUndefined()
    expect(args.dyeLot).toBe("A")
    expect(args.note).toBeUndefined()
  })

  it("clamps take to the [1, 50] range and defaults skip to 0", async () => {
    await searchInventoryOptionsUseCase({ warehouseId: "w-1", take: 999 })
    expect(callArgs()).toMatchObject({ take: 50, skip: 0 })

    searchInventoryOptionsMock.mockClear()
    await searchInventoryOptionsUseCase({ warehouseId: "w-1", take: 0 })
    expect(callArgs()).toMatchObject({ take: 1 })
  })

  it("no longer accepts a single free-text search param", async () => {
    await searchInventoryOptionsUseCase({
      warehouseId: "w-1",
      // @ts-expect-error — `search` was removed from the input contract
      search: "anything",
    })
    expect(callArgs()).not.toHaveProperty("search")
  })
})
