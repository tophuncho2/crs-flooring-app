import { beforeEach, describe, expect, it, vi } from "vitest"

const { listPropertiesForListViewMock } = vi.hoisted(() => ({
  listPropertiesForListViewMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  listPropertiesForListView: listPropertiesForListViewMock,
}))

import { listPropertiesUseCase } from "../../src/properties/list-properties.js"

function callArgs() {
  return listPropertiesForListViewMock.mock.calls[0]![0] as {
    search?: string
    filters?: {
      propNumber?: string
      entityId?: ReadonlyArray<string>
      state?: ReadonlyArray<string>
    }
    skip: number
    take: number
  }
}

beforeEach(() => {
  listPropertiesForListViewMock.mockReset()
  listPropertiesForListViewMock.mockResolvedValue({ rows: [], total: 0 })
})

describe("listPropertiesUseCase", () => {
  it("applies default pagination (page 1, page size 50, skip 0)", async () => {
    await listPropertiesUseCase({})
    expect(callArgs()).toMatchObject({ skip: 0, take: 50 })
  })

  it("clamps page below 1 up to 1", async () => {
    await listPropertiesUseCase({ page: 0 })
    expect(callArgs().skip).toBe(0)
  })

  it("clamps page size above the max (200)", async () => {
    await listPropertiesUseCase({ pageSize: 5000 })
    expect(callArgs().take).toBe(200)
  })

  it("computes skip from page and page size", async () => {
    await listPropertiesUseCase({ page: 3, pageSize: 10 })
    expect(callArgs()).toMatchObject({ skip: 20, take: 10 })
  })

  it("trims search and drops a blank one", async () => {
    await listPropertiesUseCase({ search: "  maple  " })
    expect(callArgs().search).toBe("maple")
    listPropertiesForListViewMock.mockClear()
    await listPropertiesUseCase({ search: "   " })
    expect(callArgs().search).toBeUndefined()
  })

  it("trims the property number filter and drops a blank one", async () => {
    await listPropertiesUseCase({ filters: { propNumber: "  5  " } })
    expect(callArgs().filters).toEqual({ propNumber: "5" })
    listPropertiesForListViewMock.mockClear()
    await listPropertiesUseCase({ filters: { propNumber: "   " } })
    expect(callArgs().filters).toBeUndefined()
  })

  it("trims and de-duplicates entity id filters", async () => {
    await listPropertiesUseCase({ filters: { entityId: [" entity-1 ", "entity-1", "entity-2", "  "] } })
    expect(callArgs().filters).toEqual({ entityId: ["entity-1", "entity-2"] })
  })

  it("normalizes state filters and drops invalid codes", async () => {
    await listPropertiesUseCase({ filters: { state: ["ca", "TX", "zzz", ""] } })
    expect(callArgs().filters).toEqual({ state: ["CA", "TX"] })
  })

  it("omits filters entirely when none survive normalization", async () => {
    await listPropertiesUseCase({ filters: { entityId: ["  "], state: ["123"] } })
    expect(callArgs().filters).toBeUndefined()
  })

  it("returns the repository rows and total", async () => {
    listPropertiesForListViewMock.mockResolvedValue({ rows: [{ id: "p1" }], total: 1 })
    expect(await listPropertiesUseCase({})).toEqual({ rows: [{ id: "p1" }], total: 1 })
  })
})
