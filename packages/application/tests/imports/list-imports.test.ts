import { beforeEach, describe, expect, it, vi } from "vitest"

const { listImportsForListViewMock } = vi.hoisted(() => ({
  listImportsForListViewMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  listImportsForListView: listImportsForListViewMock,
}))

import { listImportsUseCase } from "../../src/imports/list-imports.js"

function callArgs() {
  return listImportsForListViewMock.mock.calls[0]![0] as {
    search?: string
    filters?: {
      impNumber?: string
      warehouseId?: ReadonlyArray<string>
    }
    skip: number
    take: number
  }
}

beforeEach(() => {
  listImportsForListViewMock.mockReset()
  listImportsForListViewMock.mockResolvedValue({ rows: [], total: 0 })
})

describe("listImportsUseCase", () => {
  it("applies default pagination (page 1, page size 50, skip 0)", async () => {
    await listImportsUseCase({})
    expect(callArgs()).toMatchObject({ skip: 0, take: 50 })
  })

  it("clamps page below 1 up to 1", async () => {
    await listImportsUseCase({ page: 0 })
    expect(callArgs().skip).toBe(0)
  })

  it("clamps page size above the max (200)", async () => {
    await listImportsUseCase({ pageSize: 5000 })
    expect(callArgs().take).toBe(200)
  })

  it("computes skip from page and page size", async () => {
    await listImportsUseCase({ page: 3, pageSize: 10 })
    expect(callArgs()).toMatchObject({ skip: 20, take: 10 })
  })

  it("trims search and drops a blank one", async () => {
    await listImportsUseCase({ search: "  PO-12  " })
    expect(callArgs().search).toBe("PO-12")
    listImportsForListViewMock.mockClear()
    await listImportsUseCase({ search: "   " })
    expect(callArgs().search).toBeUndefined()
  })

  it("trims the import number filter and drops a blank one", async () => {
    await listImportsUseCase({ filters: { impNumber: "  5  " } })
    expect(callArgs().filters).toEqual({ impNumber: "5" })
    listImportsForListViewMock.mockClear()
    await listImportsUseCase({ filters: { impNumber: "   " } })
    expect(callArgs().filters).toBeUndefined()
  })

  it("trims and de-duplicates warehouse id filters", async () => {
    await listImportsUseCase({ filters: { warehouseId: [" wh-1 ", "wh-1", "wh-2", "  "] } })
    expect(callArgs().filters).toEqual({ warehouseId: ["wh-1", "wh-2"] })
  })

  it("combines import number and warehouse id filters", async () => {
    await listImportsUseCase({ filters: { impNumber: "7", warehouseId: ["wh-1"] } })
    expect(callArgs().filters).toEqual({ impNumber: "7", warehouseId: ["wh-1"] })
  })

  it("omits filters entirely when none survive normalization", async () => {
    await listImportsUseCase({ filters: { impNumber: "  ", warehouseId: ["  "] } })
    expect(callArgs().filters).toBeUndefined()
  })

  it("returns the repository rows and total", async () => {
    listImportsForListViewMock.mockResolvedValue({ rows: [{ id: "i1" }], total: 1 })
    expect(await listImportsUseCase({})).toEqual({ rows: [{ id: "i1" }], total: 1 })
  })
})
