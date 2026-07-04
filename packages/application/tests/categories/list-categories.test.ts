import { beforeEach, describe, expect, it, vi } from "vitest"

const { listCategoriesForListViewMock } = vi.hoisted(() => ({
  listCategoriesForListViewMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  listCategoriesForListView: listCategoriesForListViewMock,
}))

import { listCategoriesUseCase } from "../../src/categories/list-categories.js"

function callArgs() {
  return listCategoriesForListViewMock.mock.calls[0]![0] as {
    skip: number
    take: number
  }
}

beforeEach(() => {
  listCategoriesForListViewMock.mockReset()
  listCategoriesForListViewMock.mockResolvedValue({ rows: [], total: 0 })
})

describe("listCategoriesUseCase", () => {
  it("applies default pagination (page 1, page size 50, skip 0)", async () => {
    await listCategoriesUseCase({} as never)
    expect(callArgs()).toMatchObject({ skip: 0, take: 50 })
  })

  it("clamps page size above the max (200) and computes skip", async () => {
    await listCategoriesUseCase({ page: 2, pageSize: 5000 } as never)
    expect(callArgs()).toMatchObject({ skip: 200, take: 200 })
  })

  it("returns the repository rows and total", async () => {
    listCategoriesForListViewMock.mockResolvedValue({ rows: [{ id: "cat-1" }], total: 1 })
    expect(await listCategoriesUseCase({} as never)).toEqual({ rows: [{ id: "cat-1" }], total: 1 })
  })
})
