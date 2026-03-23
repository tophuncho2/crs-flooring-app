import { beforeEach, describe, expect, it, vi } from "vitest"
import { GET, POST } from "@/app/api/flooring/contacts/route"
import { DELETE, PATCH } from "@/app/api/flooring/contacts/[id]/route"

const {
  authorizeContactsRouteMock,
  enforceRouteRateLimitMock,
  logRouteMutationSuccessMock,
  logRouteMutationFailureMock,
  listContactsMock,
  createContactMock,
  updateContactMock,
  deleteContactMock,
} = vi.hoisted(() => ({
  authorizeContactsRouteMock: vi.fn(),
  enforceRouteRateLimitMock: vi.fn(),
  logRouteMutationSuccessMock: vi.fn(),
  logRouteMutationFailureMock: vi.fn(),
  listContactsMock: vi.fn(),
  createContactMock: vi.fn(),
  updateContactMock: vi.fn(),
  deleteContactMock: vi.fn(),
}))

vi.mock("@/features/flooring/shared/access/lookup-domains", () => ({
  authorizeContactsRoute: authorizeContactsRouteMock,
}))

vi.mock("@/server/http/route-helpers", () => ({
  enforceRouteRateLimit: enforceRouteRateLimitMock,
  logRouteMutationSuccess: logRouteMutationSuccessMock,
  logRouteMutationFailure: logRouteMutationFailureMock,
  routeJson: (_access: unknown, body: unknown, init?: ResponseInit) => Response.json(body, init),
  routeError: (_access: unknown, error: unknown) => {
    const maybeError = error as { message?: unknown; status?: unknown; field?: unknown; kind?: unknown }
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
          : maybeError.kind === "app" || typeof maybeError.field === "string"
            ? 400
            : 500,
    })
  },
}))

vi.mock("@/features/flooring/contacts/data/queries", () => ({
  listContacts: listContactsMock,
}))

vi.mock("@/features/flooring/contacts/data/server-mutations", () => ({
  createContact: createContactMock,
  updateContact: updateContactMock,
  deleteContact: deleteContactMock,
}))

describe("contacts routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizeContactsRouteMock.mockResolvedValue({
      requestId: "req-1",
      clientIp: "127.0.0.1",
      user: { id: "user-1", email: "owner@test.com" },
    })
    enforceRouteRateLimitMock.mockResolvedValue(null)
  })

  it("GET returns normalized contacts", async () => {
    listContactsMock.mockResolvedValue([
      {
        id: "contact-1",
        name: "Jane Rep",
        type: "SALES_REP",
        typeLabel: "Sales Rep",
        assignmentsCount: 1,
        createdAt: "2026-03-23T00:00:00.000Z",
        updatedAt: "2026-03-23T00:00:00.000Z",
      },
    ])

    const response = await GET(new Request("http://localhost/api/flooring/contacts"))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.contacts).toHaveLength(1)
    expect(payload.contacts[0]).toEqual(expect.objectContaining({
      id: "contact-1",
      name: "Jane Rep",
      type: "SALES_REP",
    }))
  })

  it("POST requires a contact name and valid type", async () => {
    const missingNameResponse = await POST(
      new Request("http://localhost/api/flooring/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "SALES_REP" }),
      }),
    )
    expect((await missingNameResponse.json()).error).toBe("name is required")

    const invalidTypeResponse = await POST(
      new Request("http://localhost/api/flooring/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Jane Rep", type: "INVALID" }),
      }),
    )
    const invalidTypePayload = await invalidTypeResponse.json()

    expect(invalidTypeResponse.status).toBe(400)
    expect(invalidTypePayload.error).toBe("type must be Sales Rep, Contractor, or Other")
    expect(invalidTypePayload.field).toBe("type")
    expect(createContactMock).not.toHaveBeenCalled()
  })

  it("POST, PATCH, and DELETE mutate contacts through the shared route flow", async () => {
    createContactMock.mockResolvedValue({
      id: "contact-1",
      name: "Jane Rep",
      type: "SALES_REP",
      typeLabel: "Sales Rep",
      assignmentsCount: 0,
      createdAt: "2026-03-23T00:00:00.000Z",
      updatedAt: "2026-03-23T00:00:00.000Z",
    })
    updateContactMock.mockResolvedValue({
      id: "contact-1",
      name: "Jane Contractor",
      type: "CONTRACTOR",
      typeLabel: "Contractor",
      assignmentsCount: 0,
      createdAt: "2026-03-23T00:00:00.000Z",
      updatedAt: "2026-03-23T01:00:00.000Z",
    })

    const createResponse = await POST(
      new Request("http://localhost/api/flooring/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Jane Rep", type: "SALES_REP" }),
      }),
    )
    expect(createResponse.status).toBe(201)
    expect(createContactMock).toHaveBeenCalledWith({
      name: "Jane Rep",
      type: "SALES_REP",
    })

    const patchResponse = await PATCH(
      new Request("http://localhost/api/flooring/contacts/contact-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Jane Contractor", type: "CONTRACTOR" }),
      }),
      { params: Promise.resolve({ id: "contact-1" }) },
    )
    const patchPayload = await patchResponse.json()
    expect(patchResponse.status).toBe(200)
    expect(patchPayload.contact).toEqual(expect.objectContaining({
      id: "contact-1",
      type: "CONTRACTOR",
    }))

    const deleteResponse = await DELETE(new Request("http://localhost/api/flooring/contacts/contact-1"), {
      params: Promise.resolve({ id: "contact-1" }),
    })
    expect(deleteResponse.status).toBe(200)
    expect(await deleteResponse.json()).toEqual({ ok: true })
    expect(deleteContactMock).toHaveBeenCalledWith("contact-1")
  })

  it("DELETE returns a clear linked-contact error", async () => {
    deleteContactMock.mockRejectedValue({
      kind: "app",
      status: 409,
      message: "This contact is linked to work orders and cannot be deleted",
    })

    const response = await DELETE(new Request("http://localhost/api/flooring/contacts/contact-1"), {
      params: Promise.resolve({ id: "contact-1" }),
    })
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("This contact is linked to work orders and cannot be deleted")
  })
})
