import { beforeEach, describe, expect, it, vi } from "vitest"

const { listEntitiesForListViewMock, searchEntityOptionsMock } = vi.hoisted(() => ({
  listEntitiesForListViewMock: vi.fn(),
  searchEntityOptionsMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  listEntitiesForListView: listEntitiesForListViewMock,
  searchEntityOptions: searchEntityOptionsMock,
}))

import {
  listEntitiesUseCase,
  searchEntityOptionsUseCase,
} from "../../src/entities/list-entities.js"

function listArgs() {
  return listEntitiesForListViewMock.mock.calls[0]![0] as {
    search?: string
    filters?: {
      entityNumber?: string
      state?: ReadonlyArray<string>
      entityTypeIds?: ReadonlyArray<string>
    }
    skip: number
    take: number
  }
}

function optionsArgs() {
  return searchEntityOptionsMock.mock.calls[0]![0] as {
    search?: string
    typeIds?: ReadonlyArray<string>
    skip: number
    take: number
  }
}

beforeEach(() => {
  listEntitiesForListViewMock.mockReset()
  searchEntityOptionsMock.mockReset()
  listEntitiesForListViewMock.mockResolvedValue({ rows: [], total: 0 })
  searchEntityOptionsMock.mockResolvedValue({ items: [], hasMore: false })
})

describe("listEntitiesUseCase", () => {
  it("applies default pagination (page 1, page size 50, skip 0)", async () => {
    await listEntitiesUseCase({})
    expect(listArgs()).toMatchObject({ skip: 0, take: 50 })
  })

  it("clamps page size above the max (200) and computes skip", async () => {
    await listEntitiesUseCase({ page: 2, pageSize: 5000 })
    expect(listArgs()).toMatchObject({ skip: 200, take: 200 })
  })

  it("normalizes state filters and drops invalid codes", async () => {
    await listEntitiesUseCase({ filters: { state: ["ca", "TX", "zz9"] } })
    expect(listArgs().filters).toEqual({ state: ["CA", "TX"] })
  })

  it("omits the filter when no state survives normalization", async () => {
    await listEntitiesUseCase({ filters: { state: ["123"] } })
    expect(listArgs().filters).toBeUndefined()
  })

  it("normalizes entity-type id filters (trim, drop empties, dedupe)", async () => {
    await listEntitiesUseCase({
      filters: { entityTypeIds: [" t1 ", "t2", "", "t1"] },
    })
    expect(listArgs().filters).toEqual({ entityTypeIds: ["t1", "t2"] })
  })

  it("trims the entity number filter and drops a blank one", async () => {
    await listEntitiesUseCase({ filters: { entityNumber: "  5  " } })
    expect(listArgs().filters).toEqual({ entityNumber: "5" })
    listEntitiesForListViewMock.mockClear()
    await listEntitiesUseCase({ filters: { entityNumber: "   " } })
    expect(listArgs().filters).toBeUndefined()
  })

  it("combines entity number, state, and entity-type filters", async () => {
    await listEntitiesUseCase({
      filters: { entityNumber: "ENT-7", state: ["ca"], entityTypeIds: ["t1"] },
    })
    expect(listArgs().filters).toEqual({
      entityNumber: "ENT-7",
      state: ["CA"],
      entityTypeIds: ["t1"],
    })
  })

  it("returns the repository rows and total", async () => {
    listEntitiesForListViewMock.mockResolvedValue({ rows: [{ id: "entity1" }], total: 1 })
    expect(await listEntitiesUseCase({})).toEqual({ rows: [{ id: "entity1" }], total: 1 })
  })
})

describe("searchEntityOptionsUseCase", () => {
  it("uses default take (20) and skip (0)", async () => {
    await searchEntityOptionsUseCase({})
    expect(optionsArgs()).toMatchObject({ take: 20, skip: 0 })
  })

  it("clamps take to the [1, 50] range and skip to >= 0", async () => {
    await searchEntityOptionsUseCase({ take: 999, skip: -5 })
    expect(optionsArgs()).toMatchObject({ take: 50, skip: 0 })
  })

  it("trims search and drops a blank one", async () => {
    await searchEntityOptionsUseCase({ search: "  ac " })
    expect(optionsArgs().search).toBe("ac")
  })

  it("normalizes the typeIds narrowing filter", async () => {
    await searchEntityOptionsUseCase({ typeIds: [" t1 ", "t1", ""] })
    expect(optionsArgs().typeIds).toEqual(["t1"])
  })

  it("passes undefined typeIds when none survive", async () => {
    await searchEntityOptionsUseCase({ typeIds: ["  "] })
    expect(optionsArgs().typeIds).toBeUndefined()
  })

  it("passes through the repository result", async () => {
    searchEntityOptionsMock.mockResolvedValue({ items: [{ id: "entity1" }], hasMore: true })
    expect(await searchEntityOptionsUseCase({})).toEqual({
      items: [{ id: "entity1" }],
      hasMore: true,
    })
  })
})
