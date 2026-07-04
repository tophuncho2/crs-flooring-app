import { beforeEach, describe, expect, it, vi } from "vitest"

const { exportInventoryForListViewMock } = vi.hoisted(() => ({
  exportInventoryForListViewMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  exportInventoryForListView: exportInventoryForListViewMock,
}))

import { exportInventoryUseCase } from "../../../src/flooring/inventory/export-inventory.js"

function callArg() {
  return exportInventoryForListViewMock.mock.calls[0]![0] as {
    take: number
    filters?: { id?: ReadonlyArray<string>; warehouseId?: ReadonlyArray<string> }
    sort?: { entries: unknown[] }
  }
}

beforeEach(() => {
  exportInventoryForListViewMock.mockReset()
  exportInventoryForListViewMock.mockResolvedValue({ rows: [], total: 0 })
})

describe("exportInventoryUseCase", () => {
  it("clamps the requested cap to the hard ceiling and passes it as `take`", async () => {
    await exportInventoryUseCase({ cap: 99999 as unknown as number })
    expect(callArg().take).toBe(5000)
  })

  it("resolves 'all'/absent cap to the hard ceiling", async () => {
    await exportInventoryUseCase({ cap: "all" })
    expect(callArg().take).toBe(5000)
  })

  it("honours a discrete cap", async () => {
    await exportInventoryUseCase({ cap: 250 })
    expect(callArg().take).toBe(250)
  })

  it("merges ticked ids into the resolved filters (deduped/trimmed)", async () => {
    await exportInventoryUseCase({
      filters: { warehouseId: ["w1"] },
      ids: [" a ", "a", "b"],
    })
    const { filters } = callArg()
    expect(filters?.id).toEqual(["a", "b"])
    expect(filters?.warehouseId).toEqual(["w1"])
  })

  it("omits the id filter when no ids are ticked", async () => {
    await exportInventoryUseCase({ filters: { warehouseId: ["w1"] } })
    expect(callArg().filters?.id).toBeUndefined()
  })

  it("returns the rows and the pre-cap total from the read", async () => {
    exportInventoryForListViewMock.mockResolvedValue({
      rows: [{ id: "1" }],
      total: 8000,
    })
    const result = await exportInventoryUseCase({ cap: 1000 })
    expect(result.total).toBe(8000)
    expect(result.rows).toHaveLength(1)
  })
})
