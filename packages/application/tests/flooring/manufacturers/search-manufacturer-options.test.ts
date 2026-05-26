import { beforeEach, describe, expect, it, vi } from "vitest"

const { searchManufacturerOptionsMock } = vi.hoisted(() => ({
  searchManufacturerOptionsMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  searchManufacturerOptions: searchManufacturerOptionsMock,
}))

import { searchManufacturerOptionsUseCase } from "../../../src/flooring/manufacturers/search-manufacturer-options.js"

function callArgs() {
  return searchManufacturerOptionsMock.mock.calls[0]![0] as {
    search?: string
    skip: number
    take: number
  }
}

beforeEach(() => {
  searchManufacturerOptionsMock.mockReset()
  searchManufacturerOptionsMock.mockResolvedValue({ items: [], hasMore: false })
})

describe("searchManufacturerOptionsUseCase", () => {
  it("uses default take (20) and skip (0)", async () => {
    await searchManufacturerOptionsUseCase({})
    expect(callArgs()).toMatchObject({ take: 20, skip: 0 })
  })

  it("clamps take to the [1, 50] range", async () => {
    await searchManufacturerOptionsUseCase({ take: 999 })
    expect(callArgs().take).toBe(50)
    searchManufacturerOptionsMock.mockClear()
    await searchManufacturerOptionsUseCase({ take: 0 })
    expect(callArgs().take).toBe(1)
  })

  it("clamps a negative skip up to 0", async () => {
    await searchManufacturerOptionsUseCase({ skip: -10 })
    expect(callArgs().skip).toBe(0)
  })

  it("trims search and drops a blank one", async () => {
    await searchManufacturerOptionsUseCase({ search: "  sh " })
    expect(callArgs().search).toBe("sh")
  })

  it("passes through the repository result", async () => {
    searchManufacturerOptionsMock.mockResolvedValue({ items: [{ id: "mfr-1" }], hasMore: true })
    expect(await searchManufacturerOptionsUseCase({})).toEqual({
      items: [{ id: "mfr-1" }],
      hasMore: true,
    })
  })
})
