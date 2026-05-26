import { beforeEach, describe, expect, it, vi } from "vitest"

const { searchPropertyOptionsMock } = vi.hoisted(() => ({
  searchPropertyOptionsMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  searchPropertyOptions: searchPropertyOptionsMock,
}))

import { searchPropertyOptionsUseCase } from "../../../src/management/properties/search-property-options.js"

function callArgs() {
  return searchPropertyOptionsMock.mock.calls[0]![0] as {
    search?: string
    managementCompanyId?: string
    skip: number
    take: number
  }
}

beforeEach(() => {
  searchPropertyOptionsMock.mockReset()
  searchPropertyOptionsMock.mockResolvedValue({ items: [], hasMore: false })
})

describe("searchPropertyOptionsUseCase", () => {
  it("uses default take (20) and skip (0)", async () => {
    await searchPropertyOptionsUseCase({})
    expect(callArgs()).toMatchObject({ take: 20, skip: 0 })
  })

  it("clamps take to the [1, 50] range", async () => {
    await searchPropertyOptionsUseCase({ take: 999 })
    expect(callArgs().take).toBe(50)
    searchPropertyOptionsMock.mockClear()
    await searchPropertyOptionsUseCase({ take: 0 })
    expect(callArgs().take).toBe(1)
  })

  it("clamps a negative skip up to 0", async () => {
    await searchPropertyOptionsUseCase({ skip: -10 })
    expect(callArgs().skip).toBe(0)
  })

  it("trims search and management company id, dropping blanks", async () => {
    await searchPropertyOptionsUseCase({ search: "  m ", managementCompanyId: "  " })
    expect(callArgs()).toMatchObject({ search: "m", managementCompanyId: undefined })
  })

  it("passes through the repository result", async () => {
    searchPropertyOptionsMock.mockResolvedValue({ items: [{ id: "p1" }], hasMore: true })
    expect(await searchPropertyOptionsUseCase({})).toEqual({ items: [{ id: "p1" }], hasMore: true })
  })
})
