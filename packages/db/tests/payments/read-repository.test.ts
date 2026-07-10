import { describe, expect, it, vi } from "vitest"
import { listPaymentsByWorkOrder } from "../../src/payments/read-repository.js"

// A minimal Prisma-row shape that normalizePayment + projectPaymentLinks accept,
// carrying the included `entity`/`workOrder` relations the hydration reads.
function paymentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "pay-1",
    paymentNumber: "PAY-1",
    paymentNumberInt: 1,
    amount: "100.00",
    direction: "REVENUE",
    color: "SLATE",
    paymentMethod: null,
    storePhone: null,
    receiptNumber: null,
    paymentDate: null,
    entityId: null,
    workOrderId: "wo-1",
    entity: null,
    workOrder: {
      id: "wo-1",
      workOrderNumber: "WO-7",
      unitType: "2BR",
      property: { name: "Maple Court" },
    },
    createdAt: "2026-07-09T00:00:00.000Z",
    updatedAt: "2026-07-09T00:00:00.000Z",
    createdBy: null,
    updatedBy: null,
    ...overrides,
  }
}

function makeClient(rows: unknown[]) {
  return { flooringPayment: { findMany: vi.fn().mockResolvedValue(rows) } }
}

describe("listPaymentsByWorkOrder", () => {
  it("filters by workOrderId, orders newest-first, and includes the link hydration", async () => {
    const client = makeClient([])

    await listPaymentsByWorkOrder("wo-1", client as never)

    const arg = client.flooringPayment.findMany.mock.calls[0][0]
    expect(arg.where).toEqual({ workOrderId: "wo-1" })
    expect(arg.orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }])
    // paymentLinksInclude is passed so each row carries entity + workOrder display fields.
    expect(arg.include.workOrder).toBeDefined()
    expect(arg.include.entity).toBeDefined()
    // Unpaginated — no skip/take.
    expect(arg.skip).toBeUndefined()
    expect(arg.take).toBeUndefined()
  })

  it("normalizes rows and hydrates the work-order label from the included relation", async () => {
    const client = makeClient([paymentRow()])

    const rows = await listPaymentsByWorkOrder("wo-1", client as never)

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      id: "pay-1",
      paymentNumber: "PAY-1",
      amount: "100.00",
      direction: "REVENUE",
      workOrderId: "wo-1",
      workOrderNumber: "WO-7",
      workOrderLabel: "#WO-7 · Maple Court · 2BR",
    })
  })
})
