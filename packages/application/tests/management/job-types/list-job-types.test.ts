import { beforeEach, describe, expect, it, vi } from "vitest"

const { listJobTypesForListViewMock } = vi.hoisted(() => ({
  listJobTypesForListViewMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  listJobTypesForListView: listJobTypesForListViewMock,
}))

import { listJobTypesUseCase } from "../../../src/management/job-types/list-job-types.js"

function callArgs() {
  return listJobTypesForListViewMock.mock.calls[0]![0] as {
    search?: string
    jobTypeNumber?: string
    skip: number
    take: number
  }
}

beforeEach(() => {
  listJobTypesForListViewMock.mockReset()
  listJobTypesForListViewMock.mockResolvedValue({ rows: [], total: 0 })
})

describe("listJobTypesUseCase", () => {
  it("applies default pagination (page 1, page size 50, skip 0)", async () => {
    await listJobTypesUseCase({} as never)
    expect(callArgs()).toMatchObject({ skip: 0, take: 50 })
  })

  it("clamps page size above the max (200) and computes skip", async () => {
    await listJobTypesUseCase({ page: 2, pageSize: 5000 } as never)
    expect(callArgs()).toMatchObject({ skip: 200, take: 200 })
  })

  it("trims search and drops a blank one", async () => {
    await listJobTypesUseCase({ search: "  install  " } as never)
    expect(callArgs().search).toBe("install")
    listJobTypesForListViewMock.mockClear()
    await listJobTypesUseCase({ search: "   " } as never)
    expect(callArgs().search).toBeUndefined()
  })

  it("threads a trimmed jobTypeNumber filter through and drops a blank one", async () => {
    await listJobTypesUseCase({ filters: { jobTypeNumber: "  7  " } } as never)
    expect(callArgs().jobTypeNumber).toBe("7")
    listJobTypesForListViewMock.mockClear()
    await listJobTypesUseCase({ filters: { jobTypeNumber: "   " } } as never)
    expect(callArgs().jobTypeNumber).toBeUndefined()
  })

  it("returns the repository rows and total", async () => {
    listJobTypesForListViewMock.mockResolvedValue({ rows: [{ id: "jt-1" }], total: 1 })
    expect(await listJobTypesUseCase({} as never)).toEqual({ rows: [{ id: "jt-1" }], total: 1 })
  })
})
