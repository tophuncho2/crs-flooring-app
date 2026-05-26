import { beforeEach, describe, expect, it, vi } from "vitest"

const { listWarehousesForListViewMock } = vi.hoisted(() => ({
  listWarehousesForListViewMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  listWarehousesForListView: listWarehousesForListViewMock,
}))

import { listWarehousesUseCase } from "../../../src/flooring/warehouses/list-warehouses.js"

function callArgs() {
  return listWarehousesForListViewMock.mock.calls[0]![0] as {
    search?: string
    skip: number
    take: number
  }
}

beforeEach(() => {
  listWarehousesForListViewMock.mockReset()
  listWarehousesForListViewMock.mockResolvedValue({ rows: [], total: 0 })
})

describe("listWarehousesUseCase", () => {
  it("applies default pagination (page 1, page size 50, skip 0)", async () => {
    await listWarehousesUseCase({} as never)
    expect(callArgs()).toMatchObject({ skip: 0, take: 50 })
  })

  it("clamps page size above the max (200) and computes skip", async () => {
    await listWarehousesUseCase({ page: 2, pageSize: 5000 } as never)
    expect(callArgs()).toMatchObject({ skip: 200, take: 200 })
  })

  it("trims search and drops a blank one", async () => {
    await listWarehousesUseCase({ search: "  depot  " } as never)
    expect(callArgs().search).toBe("depot")
    listWarehousesForListViewMock.mockClear()
    await listWarehousesUseCase({ search: "   " } as never)
    expect(callArgs().search).toBeUndefined()
  })

  it("returns the repository rows and total", async () => {
    listWarehousesForListViewMock.mockResolvedValue({ rows: [{ id: "wh-1" }], total: 1 })
    expect(await listWarehousesUseCase({} as never)).toEqual({ rows: [{ id: "wh-1" }], total: 1 })
  })
})
