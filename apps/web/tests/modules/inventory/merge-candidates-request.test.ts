import { beforeEach, describe, expect, it, vi } from "vitest"

const { requestJsonMock } = vi.hoisted(() => ({ requestJsonMock: vi.fn() }))
vi.mock("@/transport/http", () => ({ requestJson: requestJsonMock }))

import { mergeInventoryCandidatesRequest } from "@/modules/inventory/data/merge-candidates-request"

beforeEach(() => {
  requestJsonMock.mockReset()
  requestJsonMock.mockResolvedValue({ rows: [], total: 0 })
})

function calledUrl(): string {
  return requestJsonMock.mock.calls[0]?.[0] as string
}

describe("mergeInventoryCandidatesRequest", () => {
  it("targets the merge-candidates endpoint and forwards only merge-relevant filters", async () => {
    await mergeInventoryCandidatesRequest({
      filters: {
        productId: ["p-1"],
        invNumber: "100",
        rollNumber: "R-7",
        dyeLot: "D9",
        note: "ripped",
        // List-only filters that must NOT cross the wire onto the candidate read.
        categoryId: ["c-1"],
        importNumber: ["7"],
        isArchived: true,
        location: "A1",
      },
      page: 2,
      pageSize: 15,
    })

    const url = calledUrl()
    expect(url.startsWith("/api/inventory/merge-candidates?")).toBe(true)

    const params = new URLSearchParams(url.split("?")[1])
    expect(params.get("productId")).toBe("p-1")
    expect(params.get("invNumber")).toBe("100")
    expect(params.get("rollNumber")).toBe("R-7")
    expect(params.get("dyeLot")).toBe("D9")
    expect(params.get("note")).toBe("ripped")
    expect(params.get("page")).toBe("2")
    expect(params.get("pageSize")).toBe("15")

    // List-only filters are dropped — the merge picker is scoped by product only.
    expect(params.get("categoryId")).toBeNull()
    expect(params.get("importNumber")).toBeNull()
    expect(params.get("archived")).toBeNull()
    expect(params.get("location")).toBeNull()
  })

  it("omits the page param on page 1 and forwards a warehouse scope when present", async () => {
    await mergeInventoryCandidatesRequest({
      filters: { productId: ["p-1"], warehouseId: ["wh-9"] },
      page: 1,
      pageSize: 15,
    })

    const params = new URLSearchParams(calledUrl().split("?")[1])
    expect(params.get("warehouseId")).toBe("wh-9")
    expect(params.has("page")).toBe(false)
  })
})
