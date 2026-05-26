import { beforeEach, describe, expect, it, vi } from "vitest"

const { searchPropertyStatesMock } = vi.hoisted(() => ({
  searchPropertyStatesMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  searchPropertyStates: searchPropertyStatesMock,
}))

import { searchPropertyStatesUseCase } from "../../../src/management/properties/search-property-states.js"

function callArgs() {
  return searchPropertyStatesMock.mock.calls[0]![0] as { search?: string; take: number }
}

beforeEach(() => {
  searchPropertyStatesMock.mockReset()
  searchPropertyStatesMock.mockResolvedValue([])
})

describe("searchPropertyStatesUseCase", () => {
  it("uses a default take of 20", async () => {
    await searchPropertyStatesUseCase({})
    expect(callArgs().take).toBe(20)
  })

  it("clamps take to the [1, 50] range", async () => {
    await searchPropertyStatesUseCase({ take: 75 })
    expect(callArgs().take).toBe(50)
    searchPropertyStatesMock.mockClear()
    await searchPropertyStatesUseCase({ take: -3 })
    expect(callArgs().take).toBe(1)
  })

  it("trims search and drops a blank one", async () => {
    await searchPropertyStatesUseCase({ search: "  tx " })
    expect(callArgs().search).toBe("tx")
    searchPropertyStatesMock.mockClear()
    await searchPropertyStatesUseCase({ search: "   " })
    expect(callArgs().search).toBeUndefined()
  })

  it("passes through the repository result", async () => {
    searchPropertyStatesMock.mockResolvedValue([{ value: "TX" }])
    expect(await searchPropertyStatesUseCase({})).toEqual([{ value: "TX" }])
  })
})
