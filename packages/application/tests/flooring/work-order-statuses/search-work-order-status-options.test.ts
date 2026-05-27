import { beforeEach, describe, expect, it, vi } from "vitest"

const { searchWorkOrderStatusOptionsMock } = vi.hoisted(() => ({
  searchWorkOrderStatusOptionsMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  searchWorkOrderStatusOptions: searchWorkOrderStatusOptionsMock,
}))

import { searchWorkOrderStatusOptionsUseCase } from "../../../src/flooring/work-order-statuses/search-work-order-status-options.js"

function callArgs() {
  return searchWorkOrderStatusOptionsMock.mock.calls[0]![0] as { search?: string; take: number }
}

beforeEach(() => {
  searchWorkOrderStatusOptionsMock.mockReset()
  searchWorkOrderStatusOptionsMock.mockResolvedValue([])
})

describe("searchWorkOrderStatusOptionsUseCase", () => {
  it("uses the default take (20)", async () => {
    await searchWorkOrderStatusOptionsUseCase({})
    expect(callArgs().take).toBe(20)
  })

  it("clamps take to the [1, 50] range", async () => {
    await searchWorkOrderStatusOptionsUseCase({ take: 999 })
    expect(callArgs().take).toBe(50)
    searchWorkOrderStatusOptionsMock.mockClear()
    await searchWorkOrderStatusOptionsUseCase({ take: 0 })
    expect(callArgs().take).toBe(1)
  })

  it("trims search and drops a blank one", async () => {
    await searchWorkOrderStatusOptionsUseCase({ search: "  del " })
    expect(callArgs().search).toBe("del")
  })

  it("returns the repository array directly", async () => {
    searchWorkOrderStatusOptionsMock.mockResolvedValue([{ id: "wos-1", name: "Assigned" }])
    expect(await searchWorkOrderStatusOptionsUseCase({})).toEqual([{ id: "wos-1", name: "Assigned" }])
  })
})
