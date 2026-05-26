import { beforeEach, describe, expect, it, vi } from "vitest"

const { listManagementCompaniesForListViewMock, searchManagementCompanyOptionsMock } = vi.hoisted(() => ({
  listManagementCompaniesForListViewMock: vi.fn(),
  searchManagementCompanyOptionsMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  listManagementCompaniesForListView: listManagementCompaniesForListViewMock,
  searchManagementCompanyOptions: searchManagementCompanyOptionsMock,
}))

import {
  listManagementCompaniesUseCase,
  searchManagementCompanyOptionsUseCase,
} from "../../../src/management/management-companies/list-management-companies.js"

function listArgs() {
  return listManagementCompaniesForListViewMock.mock.calls[0]![0] as {
    search?: string
    filters?: { state?: ReadonlyArray<string> }
    skip: number
    take: number
  }
}

function optionsArgs() {
  return searchManagementCompanyOptionsMock.mock.calls[0]![0] as {
    search?: string
    skip: number
    take: number
  }
}

beforeEach(() => {
  listManagementCompaniesForListViewMock.mockReset()
  searchManagementCompanyOptionsMock.mockReset()
  listManagementCompaniesForListViewMock.mockResolvedValue({ rows: [], total: 0 })
  searchManagementCompanyOptionsMock.mockResolvedValue({ items: [], hasMore: false })
})

describe("listManagementCompaniesUseCase", () => {
  it("applies default pagination (page 1, page size 50, skip 0)", async () => {
    await listManagementCompaniesUseCase({})
    expect(listArgs()).toMatchObject({ skip: 0, take: 50 })
  })

  it("clamps page size above the max (200) and computes skip", async () => {
    await listManagementCompaniesUseCase({ page: 2, pageSize: 5000 })
    expect(listArgs()).toMatchObject({ skip: 200, take: 200 })
  })

  it("normalizes state filters and drops invalid codes", async () => {
    await listManagementCompaniesUseCase({ filters: { state: ["ca", "TX", "zz9"] } })
    expect(listArgs().filters).toEqual({ state: ["CA", "TX"] })
  })

  it("omits the filter when no state survives normalization", async () => {
    await listManagementCompaniesUseCase({ filters: { state: ["123"] } })
    expect(listArgs().filters).toBeUndefined()
  })

  it("returns the repository rows and total", async () => {
    listManagementCompaniesForListViewMock.mockResolvedValue({ rows: [{ id: "mc1" }], total: 1 })
    expect(await listManagementCompaniesUseCase({})).toEqual({ rows: [{ id: "mc1" }], total: 1 })
  })
})

describe("searchManagementCompanyOptionsUseCase", () => {
  it("uses default take (20) and skip (0)", async () => {
    await searchManagementCompanyOptionsUseCase({})
    expect(optionsArgs()).toMatchObject({ take: 20, skip: 0 })
  })

  it("clamps take to the [1, 50] range and skip to >= 0", async () => {
    await searchManagementCompanyOptionsUseCase({ take: 999, skip: -5 })
    expect(optionsArgs()).toMatchObject({ take: 50, skip: 0 })
  })

  it("trims search and drops a blank one", async () => {
    await searchManagementCompanyOptionsUseCase({ search: "  ac " })
    expect(optionsArgs().search).toBe("ac")
  })

  it("passes through the repository result", async () => {
    searchManagementCompanyOptionsMock.mockResolvedValue({ items: [{ id: "mc1" }], hasMore: true })
    expect(await searchManagementCompanyOptionsUseCase({})).toEqual({
      items: [{ id: "mc1" }],
      hasMore: true,
    })
  })
})
