import { beforeEach, describe, expect, it, vi } from "vitest"

// Unit tests for the createMutationRoute wrapper. The route-policy seams are
// mocked so we exercise the wrapper's own branches: policy passthrough, envelope
// parse, OCC assert-before-reserve, receipt replay short-circuit, telemetry meta
// shaping, async response body, verbatim status/scope, and error normalization.

const {
  applyRoutePolicyMock,
  enforceMutationReceiptMock,
  finalizeMutationReceiptMock,
  withMutationTelemetryMock,
  telemetryCalls,
} = vi.hoisted(() => ({
  applyRoutePolicyMock: vi.fn(),
  enforceMutationReceiptMock: vi.fn(),
  finalizeMutationReceiptMock: vi.fn(),
  withMutationTelemetryMock: vi.fn(),
  telemetryCalls: [] as Array<Record<string, unknown>>,
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

vi.mock("@/server/telemetry/mutation-telemetry", () => ({
  withMutationTelemetry: withMutationTelemetryMock,
}))

vi.mock("@/server/platform/logger", () => ({ logEvent: vi.fn() }))

const { createMutationRoute } = await import("@/server/http/run-mutation")

const ACCESS = {
  requestId: "req-1",
  clientIp: "127.0.0.1",
  user: { id: "admin-1", email: "admin@test.com", rank: "DEVELOPER" as const },
}

function jsonRequest(body: unknown, method = "POST") {
  return new Request("http://localhost/api/things", { method, body: JSON.stringify(body) })
}

beforeEach(() => {
  vi.clearAllMocks()
  telemetryCalls.length = 0
  applyRoutePolicyMock.mockResolvedValue(ACCESS)
  enforceMutationReceiptMock.mockResolvedValue({ replay: null, requestHash: "hash-1" })
  finalizeMutationReceiptMock.mockResolvedValue(undefined)
  withMutationTelemetryMock.mockImplementation(
    async (_ctx: unknown, options: Record<string, unknown>, operation: () => Promise<unknown>) => {
      telemetryCalls.push(options)
      return operation()
    },
  )
})

describe("createMutationRoute — create (no OCC)", () => {
  const POST = createMutationRoute({
    scope: "things.create",
    route: "/api/things",
    rateLimit: { limit: 100, windowMs: 600000 },
    minRank: "TIER_1",
    parseInput: (body) => ({ name: body.name as string }),
    useCase: ({ input, access }) => Promise.resolve({ id: "t-1", name: input.name, by: access.user.email }),
    telemetry: { action: "things.create", message: "created", entityType: "thing" },
    status: 201,
    buildResponseBody: ({ result }) => ({ thing: result }),
  })

  it("runs the gauntlet and returns 201 with verbatim scope + telemetry", async () => {
    const response = await POST(jsonRequest({ name: "X", mutation: { idempotencyKey: "i-1" } }))
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(payload).toEqual({ thing: { id: "t-1", name: "X", by: "admin@test.com" } })
    expect(applyRoutePolicyMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        minRank: "TIER_1",
        rateLimit: expect.objectContaining({ scope: "things.create", route: "/api/things", limit: 100 }),
      }),
    )
    expect(enforceMutationReceiptMock).toHaveBeenCalledWith(expect.objectContaining({ scope: "things.create" }))
    expect(finalizeMutationReceiptMock).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "things.create", responseStatus: 201 }),
    )
    expect(telemetryCalls[0]).toEqual({
      route: "/api/things",
      action: "things.create",
      message: "created",
      entityType: "thing",
    })
  })

  it("returns a receipt replay unchanged and skips the use case + finalize", async () => {
    const useCase = vi.fn()
    const P = createMutationRoute({
      scope: "things.create",
      route: "/api/things",
      rateLimit: { limit: 100, windowMs: 600000 },
      parseInput: (b) => b,
      useCase,
      telemetry: { action: "things.create", message: "c" },
      status: 201,
      buildResponseBody: ({ result }) => ({ thing: result }),
    })
    enforceMutationReceiptMock.mockResolvedValueOnce({
      replay: Response.json({ thing: { id: "cached" } }, { status: 201 }),
      requestHash: "h",
    })

    const response = await P(jsonRequest({ mutation: { idempotencyKey: "i-1" } }))

    expect(response.status).toBe(201)
    expect(useCase).not.toHaveBeenCalled()
    expect(finalizeMutationReceiptMock).not.toHaveBeenCalled()
  })

  it("returns the applyRoutePolicy Response (403/429) unchanged", async () => {
    applyRoutePolicyMock.mockResolvedValueOnce(Response.json({ error: "Forbidden" }, { status: 403 }))
    const useCase = vi.fn()
    const P = createMutationRoute({
      scope: "s",
      route: "/api/things",
      rateLimit: { limit: 1, windowMs: 1 },
      parseInput: (b) => b,
      useCase,
      telemetry: { action: "a", message: "m" },
      status: 201,
      buildResponseBody: () => ({}),
    })

    const response = await P(jsonRequest({ mutation: { idempotencyKey: "i" } }))

    expect(response.status).toBe(403)
    expect(useCase).not.toHaveBeenCalled()
  })
})

describe("createMutationRoute — OCC (PATCH/DELETE)", () => {
  const loadSnapshot = vi.fn()
  const PATCH = createMutationRoute({
    scope: "things.section.replace",
    route: "/api/things/[id]",
    rateLimit: { limit: 240, windowMs: 600000 },
    parseParams: async (raw) => ({ id: (raw as { id: string }).id }),
    parseInput: (body) => ({ name: body.name as string }),
    concurrency: {
      loadSnapshot: ({ params }) => loadSnapshot(params),
      snapshotKey: "thing",
      message: "changed",
    },
    useCase: ({ input, params }) => Promise.resolve({ id: params.id, name: input.name }),
    telemetry: ({ params }) => ({ action: "things.section.replace", message: "replaced", entityId: params.id }),
    status: 200,
    buildResponseBody: ({ result }) => ({ thing: result }),
  })

  beforeEach(() => loadSnapshot.mockReset())

  it("asserts expectedUpdatedAt, then reserves the receipt (assert-before-reserve)", async () => {
    loadSnapshot.mockResolvedValue({ id: "x", updatedAt: "2026-03-19T00:00:00.000Z" })

    const response = await PATCH(
      jsonRequest({ name: "Y", mutation: { idempotencyKey: "i-2", expectedUpdatedAt: "2026-03-19T00:00:00.000Z" } }, "PATCH"),
      { params: Promise.resolve({ id: "x" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ thing: { id: "x", name: "Y" } })
    expect(loadSnapshot).toHaveBeenCalledWith({ id: "x" })
    expect(telemetryCalls[0]).toMatchObject({ action: "things.section.replace", entityId: "x" })
  })

  it("returns 409 with the keyed snapshot and never reserves the receipt when stale", async () => {
    loadSnapshot.mockResolvedValue({ id: "x", updatedAt: "2026-03-20T00:00:00.000Z" })

    const response = await PATCH(
      jsonRequest({ name: "Y", mutation: { idempotencyKey: "i-2", expectedUpdatedAt: "2026-03-19T00:00:00.000Z" } }, "PATCH"),
      { params: Promise.resolve({ id: "x" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.snapshot).toEqual({ thing: { id: "x", updatedAt: "2026-03-20T00:00:00.000Z" } })
    expect(enforceMutationReceiptMock).not.toHaveBeenCalled()
  })
})

describe("createMutationRoute — async body + error", () => {
  it("awaits an async buildResponseBody (parent re-fetch) and returns status 202", async () => {
    const POST = createMutationRoute({
      scope: "things.mark",
      route: "/api/things/[id]/mark",
      rateLimit: { limit: 100, windowMs: 600000 },
      parseParams: async (raw) => raw as { id: string },
      parseInput: (b) => b,
      useCase: () => Promise.resolve({ id: "batch-1" }),
      telemetry: ({ params }) => ({ action: "things.mark", message: "m", entityId: params.id }),
      status: 202,
      buildResponseBody: async ({ result, params }) => ({
        batch: result,
        parent: await Promise.resolve({ id: params.id, updatedAt: "t" }),
      }),
    })

    const response = await POST(jsonRequest({ mutation: { idempotencyKey: "i" } }), {
      params: Promise.resolve({ id: "p-1" }),
    })
    const payload = await response.json()

    expect(response.status).toBe(202)
    expect(payload).toEqual({ batch: { id: "batch-1" }, parent: { id: "p-1", updatedAt: "t" } })
  })

  it("routes a thrown use-case error through routeError (status preserved)", async () => {
    withMutationTelemetryMock.mockImplementationOnce(
      async (_ctx: unknown, _options: unknown, operation: () => Promise<unknown>) => operation(),
    )
    const POST = createMutationRoute({
      scope: "s",
      route: "/api/things",
      rateLimit: { limit: 100, windowMs: 600000 },
      parseInput: (b) => b,
      useCase: () => Promise.reject(Object.assign(new Error("Conflict"), { status: 409 })),
      telemetry: { action: "a", message: "m" },
      status: 201,
      buildResponseBody: () => ({}),
    })

    const response = await POST(jsonRequest({ mutation: { idempotencyKey: "i" } }))
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("Conflict")
  })
})
