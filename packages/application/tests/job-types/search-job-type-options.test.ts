import { beforeEach, describe, expect, it, vi } from "vitest"

const { searchJobTypeOptionsMock } = vi.hoisted(() => ({
  searchJobTypeOptionsMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  searchJobTypeOptions: searchJobTypeOptionsMock,
}))

import { searchJobTypeOptionsUseCase } from "../../src/job-types/search-job-type-options.js"

function callArgs() {
  return searchJobTypeOptionsMock.mock.calls[0]![0] as { search?: string; take: number }
}

beforeEach(() => {
  searchJobTypeOptionsMock.mockReset()
  searchJobTypeOptionsMock.mockResolvedValue([])
})

describe("searchJobTypeOptionsUseCase", () => {
  it("uses the default take (20)", async () => {
    await searchJobTypeOptionsUseCase({})
    expect(callArgs().take).toBe(20)
  })

  it("clamps take to the [1, 50] range", async () => {
    await searchJobTypeOptionsUseCase({ take: 999 })
    expect(callArgs().take).toBe(50)
    searchJobTypeOptionsMock.mockClear()
    await searchJobTypeOptionsUseCase({ take: 0 })
    expect(callArgs().take).toBe(1)
  })

  it("trims search and drops a blank one", async () => {
    await searchJobTypeOptionsUseCase({ search: "  ins " })
    expect(callArgs().search).toBe("ins")
  })

  it("returns the repository array directly", async () => {
    searchJobTypeOptionsMock.mockResolvedValue([{ id: "jt-1", name: "Install" }])
    expect(await searchJobTypeOptionsUseCase({})).toEqual([{ id: "jt-1", name: "Install" }])
  })
})
