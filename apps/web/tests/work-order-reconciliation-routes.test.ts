import { beforeEach, describe, expect, it, vi } from "vitest"
import { GET as GET_RECONCILIATION } from "@/app/api/flooring/work-orders/[id]/reconciliation/route"

const WORK_ORDER_ID = "11111111-1111-4111-8111-111111111111"

const {
  authorizeWorkOrdersRouteMock,
  getWorkOrderReconciliationByIdMock,
} = vi.hoisted(() => ({
  authorizeWorkOrdersRouteMock: vi.fn(),
  getWorkOrderReconciliationByIdMock: vi.fn(),
}))

vi.mock("@/features/flooring/shared/access/templates-work-orders", () => ({
  authorizeWorkOrdersRoute: authorizeWorkOrdersRouteMock,
}))

vi.mock("@/features/flooring/work-orders/queries", () => ({
  getWorkOrderReconciliationById: getWorkOrderReconciliationByIdMock,
}))

vi.mock("@/server/http/route-helpers", () => ({
  routeJson: (_access: unknown, body: unknown, init?: ResponseInit) => Response.json(body, init),
  routeError: (_access: unknown, error: unknown) => {
    const maybeError = error as { message?: unknown; status?: unknown }
    return Response.json(
      { error: typeof maybeError.message === "string" ? maybeError.message : "Unexpected server error" },
      { status: typeof maybeError.status === "number" ? maybeError.status : 500 },
    )
  },
}))

describe("work-order reconciliation route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizeWorkOrdersRouteMock.mockResolvedValue({
      requestId: "req-1",
      clientIp: "127.0.0.1",
      user: { id: "user-1", email: "owner@test.com", role: "OWNER" },
    })
  })

  it("returns the lightweight reconciliation snapshot for the work order", async () => {
    getWorkOrderReconciliationByIdMock.mockResolvedValue({
      updatedAt: "2026-03-28T12:00:00.000Z",
      hasShortage: false,
      allocationIsDone: false,
      autoAllocationRun: {
        id: "run-1",
        workOrderId: WORK_ORDER_ID,
        requestedByUserId: "user-1",
        sourceVersion: "2026-03-28T12:00:00.000Z",
        idempotencyKey: "allocation:v2:wo-1:2026-03-28T12:00:00.000Z",
        status: "PROCESSING",
        requestId: "req-1",
        queueJobId: "job-1",
        requestedAt: "2026-03-28T12:00:00.000Z",
        queuedAt: "2026-03-28T12:00:01.000Z",
        startedAt: "2026-03-28T12:00:02.000Z",
        completedAt: null,
        failedAt: null,
        failureCode: null,
        failureMessage: null,
        allocatedRowCount: 0,
        shortageCount: 0,
      },
    })

    const response = await GET_RECONCILIATION(
      new Request(`http://localhost/api/flooring/work-orders/${WORK_ORDER_ID}/reconciliation`),
      { params: Promise.resolve({ id: WORK_ORDER_ID }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(getWorkOrderReconciliationByIdMock).toHaveBeenCalledWith(WORK_ORDER_ID)
    expect(payload).toEqual({
      workOrder: expect.objectContaining({
        updatedAt: "2026-03-28T12:00:00.000Z",
        allocationIsDone: false,
        autoAllocationRun: expect.objectContaining({ id: "run-1", status: "PROCESSING" }),
      }),
    })
  })
})
