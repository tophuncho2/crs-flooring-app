import { beforeEach, describe, expect, it, vi } from "vitest"
import { PATCH } from "@/app/api/flooring/categories/[id]/primary/section/route"
import { mockRouteErrorResponse } from "@/tests/helpers/route-error"

const {
  applyRoutePolicyMock,
  enforceMutationReceiptMock,
  finalizeMutationReceiptMock,
  getCategoryByIdMock,
  replaceCategoryPrimarySectionMock,
  withMutationTelemetryMock,
} = vi.hoisted(() => ({
  applyRoutePolicyMock: vi.fn(),
  enforceMutationReceiptMock: vi.fn(),
  finalizeMutationReceiptMock: vi.fn(),
  getCategoryByIdMock: vi.fn(),
  replaceCategoryPrimarySectionMock: vi.fn(),
  withMutationTelemetryMock: vi.fn(),
}))

vi.mock("@/features/flooring/categories/data/queries", () => ({
  getCategoryById: getCategoryByIdMock,
}))

vi.mock("@/features/flooring/categories/application/manage-category", () => ({
  replaceCategoryPrimarySection: replaceCategoryPrimarySectionMock,
  validateUpdateCategoryPrimarySectionInput: vi.fn((body: Record<string, unknown>) => {
    if (typeof body.name !== "string" || body.name.trim() === "") {
      throw {
        kind: "app",
        message: "name is required",
        field: "name",
        status: 400,
      }
    }

    return body
  }),
}))

vi.mock("@/features/flooring/shared/application/mutation-telemetry", () => ({
  withMutationTelemetry: withMutationTelemetryMock,
}))

vi.mock("@/server/http/route-helpers", () => ({
  routeJson: vi.fn((_context, body, init) => new Response(JSON.stringify(body), { status: init?.status ?? 200 })),
  routeError: vi.fn((_context, error) => mockRouteErrorResponse(error)),
}))

vi.mock("@/server/http/route-policy", async () => {
  const actual = await vi.importActual<typeof import("@/server/http/route-policy")>("@/server/http/route-policy")
  return {
    ...actual,
    applyRoutePolicy: applyRoutePolicyMock,
    enforceMutationReceipt: enforceMutationReceiptMock,
    finalizeMutationReceipt: finalizeMutationReceiptMock,
  }
})

const routeAccess = {
  requestId: "req-1",
  user: {
    id: "user-1",
    email: "owner@example.com",
    role: "OWNER",
    isVerified: true,
    tools: [],
  },
  clientIp: "127.0.0.1",
} as const

function categoryRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Carpet",
    sendUnitId: "",
    stockUnitId: "",
    coverageAvailableUnitId: "",
    itemCoverageUnitId: "",
    serviceUnitId: "",
    sendUnit: "",
    stockUnit: "",
    coverageAvailableUnit: "",
    itemCoverageUnit: "",
    serviceUnit: "",
    productCount: 0,
    createdAt: "2026-03-19T00:00:00.000Z",
    updatedAt: "2026-03-19T00:00:00.000Z",
    ...overrides,
  }
}

describe("categories primary section route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    applyRoutePolicyMock.mockResolvedValue(routeAccess)
    enforceMutationReceiptMock.mockResolvedValue({ replay: null, requestHash: "hash" })
    finalizeMutationReceiptMock.mockResolvedValue(undefined)
    withMutationTelemetryMock.mockImplementation(async (_access, _meta, callback) => callback())
  })

  it("accepts the mutation envelope and returns the authoritative snapshot", async () => {
    getCategoryByIdMock
      .mockResolvedValueOnce(categoryRow())
      .mockResolvedValueOnce(categoryRow({ name: "Updated Carpet", updatedAt: "2026-03-20T00:00:00.000Z" }))

    const response = await PATCH(
      new Request("http://localhost/api/flooring/categories/11111111-1111-4111-8111-111111111111/primary/section", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Carpet",
          sendUnitId: "",
          stockUnitId: "",
          coverageAvailableUnitId: "",
          itemCoverageUnitId: "",
          serviceUnitId: "",
          mutation: {
            idempotencyKey: "idem-1",
            expectedUpdatedAt: "2026-03-19T00:00:00.000Z",
          },
        }),
      }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(replaceCategoryPrimarySectionMock).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111", {
      name: "Updated Carpet",
      sendUnitId: "",
      stockUnitId: "",
      coverageAvailableUnitId: "",
      itemCoverageUnitId: "",
      serviceUnitId: "",
    })
    expect(payload.category.name).toBe("Updated Carpet")
    expect(finalizeMutationReceiptMock).toHaveBeenCalled()
  })

  it("normalizes stale revision conflicts", async () => {
    getCategoryByIdMock.mockResolvedValue(categoryRow({ updatedAt: "2026-03-21T00:00:00.000Z" }))

    const response = await PATCH(
      new Request("http://localhost/api/flooring/categories/11111111-1111-4111-8111-111111111111/primary/section", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Carpet",
          mutation: {
            idempotencyKey: "idem-1",
            expectedUpdatedAt: "2026-03-19T00:00:00.000Z",
          },
        }),
      }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("Category changed before section save completed. Refresh and try again.")
  })

  it("normalizes validation failures", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/flooring/categories/11111111-1111-4111-8111-111111111111/primary/section", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mutation: {
            idempotencyKey: "idem-1",
            expectedUpdatedAt: "2026-03-19T00:00:00.000Z",
          },
        }),
      }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("name is required")
  })
})
