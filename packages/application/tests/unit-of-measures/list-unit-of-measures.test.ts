import { beforeEach, describe, expect, it, vi } from "vitest"

const { listUnitOfMeasuresForListViewMock } = vi.hoisted(() => ({
  listUnitOfMeasuresForListViewMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  listUnitOfMeasuresForListView: listUnitOfMeasuresForListViewMock,
}))

import { listUnitOfMeasuresUseCase } from "../../src/unit-of-measures/list-unit-of-measures.js"

function callArgs() {
  return listUnitOfMeasuresForListViewMock.mock.calls[0]![0] as {
    skip: number
    take: number
  }
}

beforeEach(() => {
  listUnitOfMeasuresForListViewMock.mockReset()
  listUnitOfMeasuresForListViewMock.mockResolvedValue({ rows: [], total: 0 })
})

describe("listUnitOfMeasuresUseCase", () => {
  it("applies default pagination (page 1, page size 50, skip 0)", async () => {
    await listUnitOfMeasuresUseCase({} as never)
    expect(callArgs()).toMatchObject({ skip: 0, take: 50 })
  })

  it("clamps page size above the max (200) and computes skip", async () => {
    await listUnitOfMeasuresUseCase({ page: 2, pageSize: 5000 } as never)
    expect(callArgs()).toMatchObject({ skip: 200, take: 200 })
  })

  it("returns the repository rows and total", async () => {
    listUnitOfMeasuresForListViewMock.mockResolvedValue({ rows: [{ id: "u-1" }], total: 1 })
    expect(await listUnitOfMeasuresUseCase({} as never)).toEqual({ rows: [{ id: "u-1" }], total: 1 })
  })
})
