import { beforeEach, describe, expect, it, vi } from "vitest"

const { exportAdjustmentsForListViewMock } = vi.hoisted(() => ({
  exportAdjustmentsForListViewMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  exportAdjustmentsForListView: exportAdjustmentsForListViewMock,
}))

import { exportAdjustmentsUseCase } from "../../../../src/flooring/inventory/adjustments/export-adjustments.js"

function callArg() {
  return exportAdjustmentsForListViewMock.mock.calls[0]![0] as {
    take: number
    filters: {
      id?: ReadonlyArray<string>
      warehouseId?: ReadonlyArray<string>
      adjNumber?: string
    }
    sort?: { entries: unknown[] }
  }
}

beforeEach(() => {
  exportAdjustmentsForListViewMock.mockReset()
  exportAdjustmentsForListViewMock.mockResolvedValue({ rows: [], total: 0 })
})

describe("exportAdjustmentsUseCase", () => {
  it("clamps the requested cap to the hard ceiling and passes it as `take`", async () => {
    await exportAdjustmentsUseCase({ cap: 99999 as unknown as number })
    expect(callArg().take).toBe(5000)
  })

  it("resolves 'all'/absent cap to the hard ceiling", async () => {
    await exportAdjustmentsUseCase({ cap: "all" })
    expect(callArg().take).toBe(5000)
  })

  it("honours a discrete cap", async () => {
    await exportAdjustmentsUseCase({ cap: 250 })
    expect(callArg().take).toBe(250)
  })

  it("merges ticked ids into the resolved filters (deduped/trimmed)", async () => {
    await exportAdjustmentsUseCase({
      filters: { warehouseId: ["w1"] },
      ids: [" a ", "a", "b"],
    })
    const { filters } = callArg()
    expect(filters.id).toEqual(["a", "b"])
    expect(filters.warehouseId).toEqual(["w1"])
  })

  it("omits the id filter when no ids are ticked", async () => {
    await exportAdjustmentsUseCase({ filters: { warehouseId: ["w1"] } })
    expect(callArg().filters.id).toBeUndefined()
  })

  it("trims the identity-search filters", async () => {
    await exportAdjustmentsUseCase({ filters: { adjNumber: "  12 " } })
    expect(callArg().filters.adjNumber).toBe("12")
  })

  it("returns the rows and the pre-cap total from the read", async () => {
    exportAdjustmentsForListViewMock.mockResolvedValue({
      rows: [{ id: "1" }],
      total: 8000,
    })
    const result = await exportAdjustmentsUseCase({ cap: 1000 })
    expect(result.total).toBe(8000)
    expect(result.rows).toHaveLength(1)
  })
})
