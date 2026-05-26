import { beforeEach, describe, expect, it, vi } from "vitest"

const { searchManagementCompanyStatesMock } = vi.hoisted(() => ({
  searchManagementCompanyStatesMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  searchManagementCompanyStates: searchManagementCompanyStatesMock,
}))

import { searchManagementCompanyStatesUseCase } from "../../../src/management/management-companies/search-management-company-states.js"

function callArgs() {
  return searchManagementCompanyStatesMock.mock.calls[0]![0] as { search?: string; take: number }
}

beforeEach(() => {
  searchManagementCompanyStatesMock.mockReset()
  searchManagementCompanyStatesMock.mockResolvedValue([])
})

describe("searchManagementCompanyStatesUseCase", () => {
  it("uses a default take of 20", async () => {
    await searchManagementCompanyStatesUseCase({})
    expect(callArgs().take).toBe(20)
  })

  it("clamps take to the [1, 50] range", async () => {
    await searchManagementCompanyStatesUseCase({ take: 75 })
    expect(callArgs().take).toBe(50)
    searchManagementCompanyStatesMock.mockClear()
    await searchManagementCompanyStatesUseCase({ take: -3 })
    expect(callArgs().take).toBe(1)
  })

  it("trims search and drops a blank one", async () => {
    await searchManagementCompanyStatesUseCase({ search: "  ny " })
    expect(callArgs().search).toBe("ny")
    searchManagementCompanyStatesMock.mockClear()
    await searchManagementCompanyStatesUseCase({ search: "   " })
    expect(callArgs().search).toBeUndefined()
  })

  it("passes through the repository result", async () => {
    searchManagementCompanyStatesMock.mockResolvedValue([{ value: "NY" }])
    expect(await searchManagementCompanyStatesUseCase({})).toEqual([{ value: "NY" }])
  })
})
