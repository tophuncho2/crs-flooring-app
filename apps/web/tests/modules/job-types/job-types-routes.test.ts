import { beforeEach, describe, expect, it, vi } from "vitest"

// Golden-master route tests for the job-types handlers. They pin the current
// runtime contract — status, response-body shape, idempotency scope, and
// telemetry meta — so the runQuery/runMutation convergence (and the minRank
// fold) can be proven byte-identical. The seams are mocked at the module
// boundary the wrappers also route through, so these stay valid pre- and
// post-migration.

const {
  createJobTypeUseCaseMock,
  updateJobTypeUseCaseMock,
  deleteJobTypeUseCaseMock,
  listJobTypesUseCaseMock,
  getJobTypeByIdMock,
  getJobTypeDetailByIdMock,
  applyRoutePolicyMock,
  enforceMutationReceiptMock,
  finalizeMutationReceiptMock,
  enforceQueryRateLimitMock,
  withMutationTelemetryMock,
  telemetryCalls,
} = vi.hoisted(() => ({
  createJobTypeUseCaseMock: vi.fn(),
  updateJobTypeUseCaseMock: vi.fn(),
  deleteJobTypeUseCaseMock: vi.fn(),
  listJobTypesUseCaseMock: vi.fn(),
  getJobTypeByIdMock: vi.fn(),
  getJobTypeDetailByIdMock: vi.fn(),
  applyRoutePolicyMock: vi.fn(),
  enforceMutationReceiptMock: vi.fn(),
  finalizeMutationReceiptMock: vi.fn(),
  enforceQueryRateLimitMock: vi.fn(),
  withMutationTelemetryMock: vi.fn(),
  telemetryCalls: [] as Array<Record<string, unknown>>,
}))

vi.mock("@builders/application", async () => {
  const actual = await vi.importActual<typeof import("@builders/application")>("@builders/application")
  return {
    ...actual,
    createJobTypeUseCase: createJobTypeUseCaseMock,
    updateJobTypeUseCase: updateJobTypeUseCaseMock,
    deleteJobTypeUseCase: deleteJobTypeUseCaseMock,
    listJobTypesUseCase: listJobTypesUseCaseMock,
  }
})

vi.mock("@builders/db", async () => {
  const actual = await vi.importActual<typeof import("@builders/db")>("@builders/db")
  return {
    ...actual,
    getJobTypeById: getJobTypeByIdMock,
    getJobTypeDetailById: getJobTypeDetailByIdMock,
  }
})

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

vi.mock("@/server/telemetry/mutation-telemetry", () => ({
  withMutationTelemetry: withMutationTelemetryMock,
}))

vi.mock("@/server/platform/logger", () => ({ logEvent: vi.fn() }))

const { GET: GET_LIST, POST } = await import("@/app/api/job-types/route")
const { GET: GET_DETAIL, DELETE } = await import("@/app/api/job-types/[id]/route")
const { PATCH } = await import("@/app/api/job-types/[id]/primary/section/route")

const VALID_ID = "11111111-1111-4111-8111-111111111111"
const SNAPSHOT_UPDATED_AT = "2026-03-19T00:00:00.000Z"

function paramsOf(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  vi.clearAllMocks()
  telemetryCalls.length = 0
  applyRoutePolicyMock.mockResolvedValue({
    requestId: "req-1",
    clientIp: "127.0.0.1",
    user: { id: "admin-1", email: "admin@test.com", rank: "DEVELOPER" },
  })
  enforceMutationReceiptMock.mockResolvedValue({ replay: null, requestHash: "hash-1" })
  finalizeMutationReceiptMock.mockResolvedValue(undefined)
  enforceQueryRateLimitMock.mockResolvedValue(null)
  // Capture the telemetry meta and run the wrapped use case, mirroring the real
  // wrapper's success path.
  withMutationTelemetryMock.mockImplementation(
    async (_ctx: unknown, options: Record<string, unknown>, operation: () => Promise<unknown>) => {
      telemetryCalls.push(options)
      return operation()
    },
  )
})

describe("POST /api/job-types (create)", () => {
  it("returns 201 { jobType } and threads scope + telemetry verbatim", async () => {
    createJobTypeUseCaseMock.mockResolvedValue({ id: "jt-1", name: "Tile" })

    const response = await POST(
      new Request("http://localhost/api/job-types", {
        method: "POST",
        body: JSON.stringify({ name: "Tile", mutation: { idempotencyKey: "idem-1" } }),
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(payload).toEqual({ jobType: { id: "jt-1", name: "Tile" } })
    expect(createJobTypeUseCaseMock).toHaveBeenCalledWith({ name: "Tile" }, "admin@test.com")
    expect(enforceMutationReceiptMock).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "jobTypes.create" }),
    )
    expect(finalizeMutationReceiptMock).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "jobTypes.create", responseStatus: 201 }),
    )
    // Create passes NO entityId.
    expect(telemetryCalls[0]).toEqual({
      message: "Job type created",
      action: "jobTypes.create",
      route: "/api/job-types",
      entityType: "flooringJobType",
    })
  })

  it("returns a receipt replay response unchanged", async () => {
    enforceMutationReceiptMock.mockResolvedValueOnce({
      replay: Response.json({ jobType: { id: "jt-1" } }, { status: 201 }),
      requestHash: "hash-1",
    })

    const response = await POST(
      new Request("http://localhost/api/job-types", {
        method: "POST",
        body: JSON.stringify({ name: "Tile", mutation: { idempotencyKey: "idem-1" } }),
      }),
    )

    expect(response.status).toBe(201)
    expect(createJobTypeUseCaseMock).not.toHaveBeenCalled()
    expect(finalizeMutationReceiptMock).not.toHaveBeenCalled()
  })
})

describe("PATCH /api/job-types/[id]/primary/section", () => {
  it("returns 200 { jobType } when expectedUpdatedAt matches", async () => {
    getJobTypeByIdMock.mockResolvedValue({ id: VALID_ID, updatedAt: SNAPSHOT_UPDATED_AT })
    updateJobTypeUseCaseMock.mockResolvedValue({ id: VALID_ID, name: "Carpet" })

    const response = await PATCH(
      new Request(`http://localhost/api/job-types/${VALID_ID}/primary/section`, {
        method: "PATCH",
        body: JSON.stringify({
          name: "Carpet",
          mutation: { idempotencyKey: "idem-2", expectedUpdatedAt: SNAPSHOT_UPDATED_AT },
        }),
      }),
      paramsOf(VALID_ID),
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ jobType: { id: VALID_ID, name: "Carpet" } })
    expect(updateJobTypeUseCaseMock).toHaveBeenCalledWith(VALID_ID, { name: "Carpet" }, "admin@test.com")
    expect(enforceMutationReceiptMock).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "jobTypes.primary.section.replace" }),
    )
    expect(telemetryCalls[0]).toMatchObject({
      action: "jobTypes.primary.section.replace",
      entityType: "flooringJobType",
      entityId: VALID_ID,
    })
  })

  it("returns 409 with a snapshot when expectedUpdatedAt is stale (OCC before receipt)", async () => {
    getJobTypeByIdMock.mockResolvedValue({ id: VALID_ID, updatedAt: "2026-03-20T00:00:00.000Z" })

    const response = await PATCH(
      new Request(`http://localhost/api/job-types/${VALID_ID}/primary/section`, {
        method: "PATCH",
        body: JSON.stringify({
          name: "Carpet",
          mutation: { idempotencyKey: "idem-2", expectedUpdatedAt: SNAPSHOT_UPDATED_AT },
        }),
      }),
      paramsOf(VALID_ID),
    )
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.snapshot).toEqual({ jobType: { id: VALID_ID, updatedAt: "2026-03-20T00:00:00.000Z" } })
    // OCC short-circuits BEFORE the receipt is reserved.
    expect(enforceMutationReceiptMock).not.toHaveBeenCalled()
    expect(updateJobTypeUseCaseMock).not.toHaveBeenCalled()
  })
})

describe("DELETE /api/job-types/[id]", () => {
  it("returns 200 { ok: true } and threads the delete scope", async () => {
    getJobTypeByIdMock.mockResolvedValue({ id: VALID_ID, updatedAt: SNAPSHOT_UPDATED_AT })
    deleteJobTypeUseCaseMock.mockResolvedValue(undefined)

    const response = await DELETE(
      new Request(`http://localhost/api/job-types/${VALID_ID}`, {
        method: "DELETE",
        body: JSON.stringify({
          mutation: { idempotencyKey: "idem-3", expectedUpdatedAt: SNAPSHOT_UPDATED_AT },
        }),
      }),
      paramsOf(VALID_ID),
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ ok: true })
    expect(deleteJobTypeUseCaseMock).toHaveBeenCalledWith(VALID_ID)
    expect(finalizeMutationReceiptMock).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "jobTypes.delete", responseStatus: 200 }),
    )
    expect(telemetryCalls[0]).toMatchObject({ action: "jobTypes.delete", entityId: VALID_ID })
  })
})

describe("GET /api/job-types (list)", () => {
  it("passes the list use-case result through unchanged", async () => {
    listJobTypesUseCaseMock.mockResolvedValue({ rows: [{ id: "jt-1" }], total: 1 })

    const response = await GET_LIST(new Request("http://localhost/api/job-types?page=1"))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ rows: [{ id: "jt-1" }], total: 1 })
    expect(listJobTypesUseCaseMock).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }))
    expect(enforceQueryRateLimitMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "/api/job-types",
    )
  })
})

describe("GET /api/job-types/[id] (detail)", () => {
  it("returns 200 { jobType } when found", async () => {
    getJobTypeDetailByIdMock.mockResolvedValue({ id: VALID_ID, name: "Tile" })

    const response = await GET_DETAIL(
      new Request(`http://localhost/api/job-types/${VALID_ID}`),
      paramsOf(VALID_ID),
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ jobType: { id: VALID_ID, name: "Tile" } })
  })

  it("returns 404 when the record is missing", async () => {
    getJobTypeDetailByIdMock.mockResolvedValue(null)

    const response = await GET_DETAIL(
      new Request(`http://localhost/api/job-types/${VALID_ID}`),
      paramsOf(VALID_ID),
    )

    expect(response.status).toBe(404)
  })
})
