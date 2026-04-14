import { beforeEach, describe, expect, it, vi } from "vitest"
import { GET, POST } from "@/app/api/contacts/route"
import { DELETE, PATCH } from "@/app/api/contacts/[id]/route"

const {
  applyRoutePolicyMock,
  enforceMutationReceiptMock,
  finalizeMutationReceiptMock,
  withMutationTelemetryMock,
  enforceRouteRateLimitMock,
  enforceQueryRateLimitMock,
  logRouteMutationSuccessMock,
  logRouteMutationFailureMock,
  listContactsMock,
  getContactByIdMock,
  createContactUseCaseMock,
  updateContactUseCaseMock,
  deleteContactUseCaseMock,
} = vi.hoisted(() => ({
  applyRoutePolicyMock: vi.fn(),
  enforceMutationReceiptMock: vi.fn(),
  finalizeMutationReceiptMock: vi.fn(),
  withMutationTelemetryMock: vi.fn(),
  enforceRouteRateLimitMock: vi.fn(),
  enforceQueryRateLimitMock: vi.fn(),
  logRouteMutationSuccessMock: vi.fn(),
  logRouteMutationFailureMock: vi.fn(),
  listContactsMock: vi.fn(),
  getContactByIdMock: vi.fn(),
  createContactUseCaseMock: vi.fn(),
  updateContactUseCaseMock: vi.fn(),
  deleteContactUseCaseMock: vi.fn(),
}))

vi.mock("@/modules/shared/access/lookup-domains", () => ({
  CONTACTS_TOOL_SLUG: "warehouse",
}))

vi.mock("@/server/http/route-policy", async () => {
  const actual = await vi.importActual<typeof import("@/server/http/route-policy")>("@/server/http/route-policy")
  return {
    ...actual,
    applyRoutePolicy: applyRoutePolicyMock,
    enforceMutationReceipt: enforceMutationReceiptMock,
    finalizeMutationReceipt: finalizeMutationReceiptMock,
    enforceQueryRateLimit: enforceQueryRateLimitMock,
  }
})

vi.mock("@/modules/shared/engines/common/application/mutation-telemetry", () => ({
  withMutationTelemetry: withMutationTelemetryMock,
}))

vi.mock("@/server/http/route-helpers", () => ({
  enforceRouteRateLimit: enforceRouteRateLimitMock,
  logRouteMutationSuccess: logRouteMutationSuccessMock,
  logRouteMutationFailure: logRouteMutationFailureMock,
  routeJson: (_access: unknown, body: unknown, init?: ResponseInit) => Response.json(body, init),
  routeError: (_access: unknown, error: unknown) => {
    const maybeError = error as { message?: unknown; status?: unknown; field?: unknown; code?: unknown; name?: unknown }
    const payload: Record<string, unknown> = {
      error: typeof maybeError.message === "string" ? maybeError.message : "Unexpected server error",
    }

    if (typeof maybeError.field === "string") {
      payload.field = maybeError.field
    }

    return Response.json(payload, {
      status:
        typeof maybeError.status === "number"
          ? maybeError.status
          : typeof maybeError.field === "string"
            ? 400
            : 500,
    })
  },
}))

vi.mock("@/modules/contacts/data/queries", () => ({
  listContacts: listContactsMock,
  getContactById: getContactByIdMock,
}))

vi.mock("@builders/application", async () => {
  const actual = await vi.importActual<typeof import("@builders/application")>("@builders/application")
  return {
    ...actual,
    createContactUseCase: createContactUseCaseMock,
    updateContactUseCase: updateContactUseCaseMock,
    deleteContactUseCase: deleteContactUseCaseMock,
  }
})

const ACCESS_CONTEXT = {
  requestId: "req-1",
  clientIp: "127.0.0.1",
  user: { id: "user-1", email: "owner@test.com" },
}

describe("contacts routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    enforceRouteRateLimitMock.mockResolvedValue(null)
    enforceQueryRateLimitMock.mockReturnValue(null)
    applyRoutePolicyMock.mockResolvedValue(ACCESS_CONTEXT)
    enforceMutationReceiptMock.mockResolvedValue({ replay: null, requestHash: "hash" })
    finalizeMutationReceiptMock.mockResolvedValue(undefined)
    withMutationTelemetryMock.mockImplementation(
      async (_access: unknown, _meta: unknown, callback: () => Promise<unknown>) => callback(),
    )
  })

  it("GET returns normalized contacts", async () => {
    listContactsMock.mockResolvedValue([
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Jane Rep",
        type: "SALES_REP",
        typeLabel: "Sales Rep",
        assignmentsCount: 1,
        createdAt: "2026-03-23T00:00:00.000Z",
        updatedAt: "2026-03-23T00:00:00.000Z",
      },
    ])

    const response = await GET(new Request("http://localhost/api/contacts"))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.contacts).toHaveLength(1)
    expect(payload.contacts[0]).toEqual(expect.objectContaining({
      id: "11111111-1111-4111-8111-111111111111",
      name: "Jane Rep",
      type: "SALES_REP",
    }))
  })

  it("POST requires a contact name and valid type", async () => {
    const missingNameResponse = await POST(
      new Request("http://localhost/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "SALES_REP",
          mutation: { idempotencyKey: "key-1" },
        }),
      }),
    )
    expect((await missingNameResponse.json()).error).toBe("name is required")

    const invalidTypeResponse = await POST(
      new Request("http://localhost/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Jane Rep",
          type: "INVALID",
          mutation: { idempotencyKey: "key-2" },
        }),
      }),
    )
    const invalidTypePayload = await invalidTypeResponse.json()

    expect(invalidTypeResponse.status).toBe(400)
    expect(invalidTypePayload.error).toBe("type must be Sales Rep, Contractor, or Other")
    expect(invalidTypePayload.field).toBe("type")
    expect(createContactUseCaseMock).not.toHaveBeenCalled()
  })

  it("POST creates a contact with valid form data and returns the full record", async () => {
    createContactUseCaseMock.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      name: "Jane Rep",
      type: "SALES_REP",
      typeLabel: "Sales Rep",
      assignmentsCount: 0,
      createdAt: "2026-03-23T00:00:00.000Z",
      updatedAt: "2026-03-23T00:00:00.000Z",
    })

    const response = await POST(
      new Request("http://localhost/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Jane Rep",
          type: "SALES_REP",
          mutation: { idempotencyKey: "key-1" },
        }),
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(createContactUseCaseMock).toHaveBeenCalledWith({
      name: "Jane Rep",
      type: "SALES_REP",
    })
    expect(payload.contact).toEqual({
      id: "11111111-1111-4111-8111-111111111111",
      name: "Jane Rep",
      type: "SALES_REP",
      typeLabel: "Sales Rep",
      assignmentsCount: 0,
      createdAt: "2026-03-23T00:00:00.000Z",
      updatedAt: "2026-03-23T00:00:00.000Z",
    })
  })

  it("POST, PATCH, and DELETE mutate contacts through the shared route flow", async () => {
    const contactSnapshot = {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Jane Rep",
      type: "SALES_REP",
      typeLabel: "Sales Rep",
      assignmentsCount: 0,
      createdAt: "2026-03-23T00:00:00.000Z",
      updatedAt: "2026-03-23T00:00:00.000Z",
    }

    createContactUseCaseMock.mockResolvedValue(contactSnapshot)
    getContactByIdMock.mockResolvedValue(contactSnapshot)

    const createResponse = await POST(
      new Request("http://localhost/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Jane Rep",
          type: "SALES_REP",
          mutation: { idempotencyKey: "key-create" },
        }),
      }),
    )
    expect(createResponse.status).toBe(201)
    expect(createContactUseCaseMock).toHaveBeenCalledWith({
      name: "Jane Rep",
      type: "SALES_REP",
    })

    const updatedSnapshot = {
      ...contactSnapshot,
      name: "Jane Contractor",
      type: "CONTRACTOR",
      typeLabel: "Contractor",
      updatedAt: "2026-03-23T01:00:00.000Z",
    }
    getContactByIdMock
      .mockResolvedValueOnce(contactSnapshot)
      .mockResolvedValueOnce(updatedSnapshot)

    const patchResponse = await PATCH(
      new Request("http://localhost/api/contacts/11111111-1111-4111-8111-111111111111", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Jane Contractor",
          type: "CONTRACTOR",
          mutation: {
            idempotencyKey: "key-patch",
            expectedUpdatedAt: "2026-03-23T00:00:00.000Z",
          },
        }),
      }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) },
    )
    const patchPayload = await patchResponse.json()
    expect(patchResponse.status).toBe(200)
    expect(patchPayload.contact).toEqual(expect.objectContaining({
      id: "11111111-1111-4111-8111-111111111111",
      type: "CONTRACTOR",
    }))

    getContactByIdMock.mockResolvedValueOnce(updatedSnapshot)

    const deleteResponse = await DELETE(
      new Request("http://localhost/api/contacts/11111111-1111-4111-8111-111111111111", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mutation: {
            idempotencyKey: "key-delete",
            expectedUpdatedAt: "2026-03-23T01:00:00.000Z",
          },
        }),
      }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) },
    )
    expect(deleteResponse.status).toBe(200)
    expect(await deleteResponse.json()).toEqual({ ok: true })
    expect(deleteContactUseCaseMock).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111")
  })

  it("DELETE returns a clear linked-contact error", async () => {
    getContactByIdMock.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      name: "Jane Rep",
      type: "SALES_REP",
      typeLabel: "Sales Rep",
      assignmentsCount: 2,
      createdAt: "2026-03-23T00:00:00.000Z",
      updatedAt: "2026-03-23T00:00:00.000Z",
    })
    deleteContactUseCaseMock.mockRejectedValue(
      Object.assign(new Error("This contact is linked to work orders and cannot be deleted"), {
        name: "ContactExecutionError",
        code: "CONTACT_IN_USE",
        status: 409,
      }),
    )

    const response = await DELETE(
      new Request("http://localhost/api/contacts/11111111-1111-4111-8111-111111111111", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mutation: {
            idempotencyKey: "key-delete",
            expectedUpdatedAt: "2026-03-23T00:00:00.000Z",
          },
        }),
      }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("This contact is linked to work orders and cannot be deleted")
  })
})
