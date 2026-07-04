import { beforeEach, describe, expect, it, vi } from "vitest"

const { listWorkOrdersMock, countWorkOrdersMock } = vi.hoisted(() => ({
  listWorkOrdersMock: vi.fn(),
  countWorkOrdersMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  listWorkOrders: listWorkOrdersMock,
  countWorkOrders: countWorkOrdersMock,
}))

import { listWorkOrdersUseCase } from "../../src/work-orders/list-work-orders.js"

function sortArg() {
  return (listWorkOrdersMock.mock.calls[0]![0] as { sort?: { entries: unknown[] } }).sort
}

beforeEach(() => {
  listWorkOrdersMock.mockReset()
  listWorkOrdersMock.mockResolvedValue([])
  countWorkOrdersMock.mockReset()
  countWorkOrdersMock.mockResolvedValue(0)
})

describe("listWorkOrdersUseCase — multi-column sort seam", () => {
  it("maps a single `sort` to a one-entry ordered list", async () => {
    await listWorkOrdersUseCase({ sort: { field: "property", direction: "asc" }, page: 1, pageSize: 50 })
    expect(sortArg()).toEqual({ entries: [{ field: "property", direction: "asc" }] })
  })

  it("maps the ordered `sorts` array, which wins over `sort`", async () => {
    await listWorkOrdersUseCase({
      sort: { field: "createdAt", direction: "desc" },
      sorts: [
        { field: "property", direction: "asc" },
        { field: "scheduledFor", direction: "desc" },
      ],
      page: 1,
      pageSize: 50,
    })
    expect(sortArg()).toEqual({
      entries: [
        { field: "property", direction: "asc" },
        { field: "scheduledFor", direction: "desc" },
      ],
    })
  })

  it("caps the sort chain at 3 levels", async () => {
    await listWorkOrdersUseCase({
      sorts: [
        { field: "property", direction: "asc" },
        { field: "entity", direction: "asc" },
        { field: "scheduledFor", direction: "desc" },
        { field: "createdAt", direction: "desc" },
      ],
      page: 1,
      pageSize: 50,
    })
    expect(sortArg()?.entries).toHaveLength(3)
  })

  it("omits sort entirely when neither `sort` nor `sorts` is provided", async () => {
    await listWorkOrdersUseCase({ page: 1, pageSize: 50 })
    expect(sortArg()).toBeUndefined()
  })
})
