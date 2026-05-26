import { beforeEach, describe, expect, it, vi } from "vitest"

const { listManufacturersForListViewMock } = vi.hoisted(() => ({
  listManufacturersForListViewMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  listManufacturersForListView: listManufacturersForListViewMock,
}))

import { listManufacturersUseCase } from "../../../src/flooring/manufacturers/list-manufacturers.js"

function callArgs() {
  return listManufacturersForListViewMock.mock.calls[0]![0] as {
    search?: string
    skip: number
    take: number
  }
}

beforeEach(() => {
  listManufacturersForListViewMock.mockReset()
  listManufacturersForListViewMock.mockResolvedValue({ rows: [], total: 0 })
})

describe("listManufacturersUseCase", () => {
  it("applies default pagination (page 1, page size 50, skip 0)", async () => {
    await listManufacturersUseCase({} as never)
    expect(callArgs()).toMatchObject({ skip: 0, take: 50 })
  })

  it("clamps page size above the max (200) and computes skip", async () => {
    await listManufacturersUseCase({ page: 2, pageSize: 5000 } as never)
    expect(callArgs()).toMatchObject({ skip: 200, take: 200 })
  })

  it("trims search and drops a blank one", async () => {
    await listManufacturersUseCase({ search: "  shaw  " } as never)
    expect(callArgs().search).toBe("shaw")
    listManufacturersForListViewMock.mockClear()
    await listManufacturersUseCase({ search: "   " } as never)
    expect(callArgs().search).toBeUndefined()
  })

  it("returns the repository rows and total", async () => {
    listManufacturersForListViewMock.mockResolvedValue({ rows: [{ id: "mfr-1" }], total: 1 })
    expect(await listManufacturersUseCase({} as never)).toEqual({ rows: [{ id: "mfr-1" }], total: 1 })
  })
})
