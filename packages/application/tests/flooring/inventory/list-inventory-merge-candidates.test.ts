import { beforeEach, describe, expect, it, vi } from "vitest"
import { LIST_INVENTORY_MAX_PAGE_SIZE } from "@builders/domain"

const { listInventoryMergeCandidatesMock } = vi.hoisted(() => ({
  listInventoryMergeCandidatesMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  listInventoryMergeCandidates: listInventoryMergeCandidatesMock,
}))

import { listInventoryMergeCandidatesUseCase } from "../../../src/flooring/inventory/list-inventory-merge-candidates.js"

beforeEach(() => {
  listInventoryMergeCandidatesMock.mockReset()
  listInventoryMergeCandidatesMock.mockResolvedValue({ rows: [], total: 0 })
})

function callArgs() {
  return listInventoryMergeCandidatesMock.mock.calls[0]?.[0] as Record<string, unknown>
}

describe("listInventoryMergeCandidatesUseCase", () => {
  it("returns no candidates without hitting the read when the product is blank", async () => {
    const result = await listInventoryMergeCandidatesUseCase({ productId: "   " })
    expect(result).toEqual({ rows: [], total: 0 })
    expect(listInventoryMergeCandidatesMock).not.toHaveBeenCalled()
  })

  it("trims + forwards the product, warehouse, and the four identity filters", async () => {
    await listInventoryMergeCandidatesUseCase({
      productId: " p-1 ",
      warehouseId: " wh-1 ",
      invNumber: "  100 ",
      rollNumber: " R-7 ",
      dyeLot: "  D9 ",
      note: " ripped ",
    })

    expect(callArgs()).toMatchObject({
      productId: "p-1",
      warehouseId: "wh-1",
      invNumber: "100",
      rollNumber: "R-7",
      dyeLot: "D9",
      note: "ripped",
    })
  })

  it("drops blank/whitespace-only filters (warehouse + identity) to undefined", async () => {
    await listInventoryMergeCandidatesUseCase({
      productId: "p-1",
      warehouseId: "   ",
      invNumber: "",
      rollNumber: "A",
    })

    const args = callArgs()
    expect(args.warehouseId).toBeUndefined()
    expect(args.invNumber).toBeUndefined()
    expect(args.rollNumber).toBe("A")
    expect(args.dyeLot).toBeUndefined()
    expect(args.note).toBeUndefined()
  })

  it("clamps page size to the list-view max and computes skip from the page", async () => {
    await listInventoryMergeCandidatesUseCase({
      productId: "p-1",
      page: 3,
      pageSize: 9999,
    })

    expect(callArgs()).toMatchObject({
      take: LIST_INVENTORY_MAX_PAGE_SIZE,
      skip: 2 * LIST_INVENTORY_MAX_PAGE_SIZE,
    })
  })
})
