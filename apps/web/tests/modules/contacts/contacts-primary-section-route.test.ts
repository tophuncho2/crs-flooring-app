import { beforeEach, describe, expect, it, vi } from "vitest"
import { PATCH } from "@/app/api/contacts/[id]/primary/section/route"
import { mockRouteErrorResponse } from "@/tests/helpers/route-error"

const {
  applyRoutePolicyMock,
  enforceMutationReceiptMock,
  finalizeMutationReceiptMock,
  getContactByIdMock,
  updateContactUseCaseMock,
  withMutationTelemetryMock,
} = vi.hoisted(() => ({
  applyRoutePolicyMock: vi.fn(),
  enforceMutationReceiptMock: vi.fn(),
  finalizeMutationReceiptMock: vi.fn(),
  getContactByIdMock: vi.fn(),
  updateContactUseCaseMock: vi.fn(),
  withMutationTelemetryMock: vi.fn(),
}))

vi.mock("@/modules/contacts/data/queries", () => ({
  getContactById: getContactByIdMock,
}))

vi.mock("@builders/application", async () => {
  const actual = await vi.importActual<typeof import("@builders/application")>("@builders/application")
  return {
    ...actual,
    updateContactUseCase: updateContactUseCaseMock,
  }
})

vi.mock("@/app/api/contacts/_validators", () => ({
  validateContactInput: vi.fn((body: Record<string, unknown>) => {
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

vi.mock("@/modules/shared/engines/common/application/mutation-telemetry", () => ({
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
    email: "builder@example.com",
    role: "BUILDER",
    isVerified: true,
    tools: [],
  },
  clientIp: "127.0.0.1",
} as const

function contactRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Jane Rep",
    type: "SALES_REP",
    typeLabel: "Sales Rep",
    assignmentsCount: 0,
    createdAt: "2026-03-23T00:00:00.000Z",
    updatedAt: "2026-03-23T00:00:00.000Z",
    ...overrides,
  }
}

describe("contacts primary section route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    applyRoutePolicyMock.mockResolvedValue(routeAccess)
    enforceMutationReceiptMock.mockResolvedValue({ replay: null, requestHash: "hash" })
    finalizeMutationReceiptMock.mockResolvedValue(undefined)
    withMutationTelemetryMock.mockImplementation(async (_access, _meta, callback) => callback())
  })

  it("accepts the mutation envelope and returns the authoritative snapshot", async () => {
    getContactByIdMock.mockResolvedValueOnce(contactRow())
    updateContactUseCaseMock.mockResolvedValueOnce(
      contactRow({ name: "Jane Contractor", type: "CONTRACTOR", typeLabel: "Contractor", updatedAt: "2026-03-24T00:00:00.000Z" }),
    )

    const response = await PATCH(
      new Request("http://localhost/api/contacts/11111111-1111-4111-8111-111111111111/primary/section", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Jane Contractor",
          type: "CONTRACTOR",
          mutation: {
            idempotencyKey: "idem-1",
            expectedUpdatedAt: "2026-03-23T00:00:00.000Z",
          },
        }),
      }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(updateContactUseCaseMock).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111", {
      name: "Jane Contractor",
      type: "CONTRACTOR",
    })
    expect(payload.contact.name).toBe("Jane Contractor")
  })

  it("normalizes stale revision conflicts", async () => {
    getContactByIdMock.mockResolvedValue(contactRow({ updatedAt: "2026-03-25T00:00:00.000Z" }))

    const response = await PATCH(
      new Request("http://localhost/api/contacts/11111111-1111-4111-8111-111111111111/primary/section", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Jane Contractor",
          type: "CONTRACTOR",
          mutation: {
            idempotencyKey: "idem-1",
            expectedUpdatedAt: "2026-03-23T00:00:00.000Z",
          },
        }),
      }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("Contact changed before section save completed. Refresh and try again.")
    expect(updateContactUseCaseMock).not.toHaveBeenCalled()
  })

  it("normalizes validation failures", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/contacts/11111111-1111-4111-8111-111111111111/primary/section", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mutation: {
            idempotencyKey: "idem-1",
            expectedUpdatedAt: "2026-03-23T00:00:00.000Z",
          },
        }),
      }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("name is required")
    expect(updateContactUseCaseMock).not.toHaveBeenCalled()
  })
})
