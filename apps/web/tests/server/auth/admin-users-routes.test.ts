import { beforeEach, describe, expect, it, vi } from "vitest"
import { GovernanceExecutionError } from "@builders/application"

const {
  listManagedUsersUseCaseMock,
  getManagedUserUseCaseMock,
  createManagedUserUseCaseMock,
  updateManagedUserUseCaseMock,
  deleteManagedUserUseCaseMock,
  applyRoutePolicyMock,
  enforceQueryRateLimitMock,
  parseMutationEnvelopeMock,
  enforceMutationReceiptMock,
  finalizeMutationReceiptMock,
  withMutationTelemetryMock,
} = vi.hoisted(() => ({
  listManagedUsersUseCaseMock: vi.fn(),
  getManagedUserUseCaseMock: vi.fn(),
  createManagedUserUseCaseMock: vi.fn(),
  updateManagedUserUseCaseMock: vi.fn(),
  deleteManagedUserUseCaseMock: vi.fn(),
  applyRoutePolicyMock: vi.fn(),
  enforceQueryRateLimitMock: vi.fn(),
  parseMutationEnvelopeMock: vi.fn(),
  enforceMutationReceiptMock: vi.fn(),
  finalizeMutationReceiptMock: vi.fn(),
  withMutationTelemetryMock: vi.fn(),
}))

vi.mock("@builders/application", async () => {
  const actual = await vi.importActual<typeof import("@builders/application")>("@builders/application")
  return {
    ...actual,
    listManagedUsersUseCase: listManagedUsersUseCaseMock,
    getManagedUserUseCase: getManagedUserUseCaseMock,
    createManagedUserUseCase: createManagedUserUseCaseMock,
    updateManagedUserUseCase: updateManagedUserUseCaseMock,
    deleteManagedUserUseCase: deleteManagedUserUseCaseMock,
  }
})

vi.mock("@/server/http/route-policy", () => ({
  applyRoutePolicy: applyRoutePolicyMock,
  enforceQueryRateLimit: enforceQueryRateLimitMock,
  parseMutationEnvelope: parseMutationEnvelopeMock,
  enforceMutationReceipt: enforceMutationReceiptMock,
  finalizeMutationReceipt: finalizeMutationReceiptMock,
}))

vi.mock("@/modules/shared/engines/common/application/mutation-telemetry", () => ({
  withMutationTelemetry: withMutationTelemetryMock,
}))

vi.mock("@/server/platform/logger", () => ({
  logEvent: vi.fn(),
}))

const { GET: GET_USERS, POST: POST_USERS } = await import("@/app/api/admin/users/route")
const { GET: GET_USER, PATCH: PATCH_USER, DELETE: DELETE_USER } = await import("@/app/api/admin/users/[id]/route")

const ACCESS_CONTEXT = {
  requestId: "req-1",
  clientIp: "127.0.0.1",
  id: "admin-1",
  user: {
    id: "admin-1",
    email: "admin@test.com",
    role: "ADMIN",
    isVerified: true,
  },
}

const MOCK_USER = {
  id: "builder-1",
  email: "builder@test.com",
  role: "BUILDER",
  isVerified: true,
}

describe("admin user routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    applyRoutePolicyMock.mockResolvedValue(ACCESS_CONTEXT)
    enforceQueryRateLimitMock.mockResolvedValue(null)
    enforceMutationReceiptMock.mockResolvedValue({ replay: null })
    finalizeMutationReceiptMock.mockResolvedValue(undefined)
    parseMutationEnvelopeMock.mockImplementation((body: Record<string, unknown>, parse: (b: unknown) => unknown) => ({
      input: parse(body),
      mutation: { idempotencyKey: "test-key" },
    }))
    withMutationTelemetryMock.mockImplementation(
      (_access: unknown, _opts: unknown, fn: () => unknown) => fn(),
    )
  })

  describe("GET /api/admin/users", () => {
    it("returns users from listManagedUsersUseCase", async () => {
      listManagedUsersUseCaseMock.mockResolvedValue({ users: [MOCK_USER] })

      const response = await GET_USERS(new Request("http://localhost/api/admin/users"))
      const payload = await response.json()

      expect(response.status).toBe(200)
      expect(payload.users).toEqual([MOCK_USER])
      expect(listManagedUsersUseCaseMock).toHaveBeenCalledWith({
        id: "admin-1",
        role: "ADMIN",
      })
    })
  })

  describe("GET /api/admin/users/[id]", () => {
    it("returns user from getManagedUserUseCase", async () => {
      getManagedUserUseCaseMock.mockResolvedValue(MOCK_USER)

      const response = await GET_USER(
        new Request("http://localhost/api/admin/users/builder-1"),
        { params: Promise.resolve({ id: "a1b2c3d4-e5f6-1234-abcd-1234567890ab" }) },
      )
      const payload = await response.json()

      expect(response.status).toBe(200)
      expect(payload.user).toEqual(MOCK_USER)
    })

    it("returns 404 when user not found", async () => {
      getManagedUserUseCaseMock.mockRejectedValue(
        new GovernanceExecutionError({
          code: "GOVERNANCE_USER_NOT_FOUND",
          message: "User not found",
          status: 404,
        }),
      )

      const response = await GET_USER(
        new Request("http://localhost/api/admin/users/missing-1"),
        { params: Promise.resolve({ id: "a1b2c3d4-e5f6-1234-abcd-1234567890ab" }) },
      )
      const payload = await response.json()

      expect(response.status).toBe(404)
      expect(payload.error).toBe("User not found")
    })
  })

  describe("POST /api/admin/users", () => {
    it("creates user and returns 201", async () => {
      createManagedUserUseCaseMock.mockResolvedValue(MOCK_USER)

      const response = await POST_USERS(
        new Request("http://localhost/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "builder@test.com", role: "BUILDER" }),
        }),
      )
      const payload = await response.json()

      expect(response.status).toBe(201)
      expect(payload.user).toEqual(MOCK_USER)
    })

    it("returns 403 when governance blocks creation", async () => {
      createManagedUserUseCaseMock.mockRejectedValue(
        new GovernanceExecutionError({
          code: "GOVERNANCE_CREATE_BLOCKED",
          message: "Cannot create user with this role",
          status: 403,
        }),
      )

      const response = await POST_USERS(
        new Request("http://localhost/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "builder@test.com", role: "OWNER" }),
        }),
      )
      const payload = await response.json()

      expect(response.status).toBe(403)
      expect(payload.error).toBe("Cannot create user with this role")
    })
  })

  describe("PATCH /api/admin/users/[id]", () => {
    it("updates user and returns result", async () => {
      updateManagedUserUseCaseMock.mockResolvedValue({ ...MOCK_USER, role: "ADMIN" })

      const response = await PATCH_USER(
        new Request("http://localhost/api/admin/users/builder-1", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "ADMIN" }),
        }),
        { params: Promise.resolve({ id: "a1b2c3d4-e5f6-1234-abcd-1234567890ab" }) },
      )
      const payload = await response.json()

      expect(response.status).toBe(200)
      expect(payload.user).toEqual({ ...MOCK_USER, role: "ADMIN" })
    })

    it("returns 403 when governance blocks role change", async () => {
      updateManagedUserUseCaseMock.mockRejectedValue(
        new GovernanceExecutionError({
          code: "GOVERNANCE_ROLE_CHANGE_BLOCKED",
          message: "Only builder accounts can be governed from this panel",
          status: 403,
        }),
      )

      const response = await PATCH_USER(
        new Request("http://localhost/api/admin/users/admin-1", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "BUILDER" }),
        }),
        { params: Promise.resolve({ id: "a1b2c3d4-e5f6-1234-abcd-1234567890ab" }) },
      )
      const payload = await response.json()

      expect(response.status).toBe(403)
      expect(payload.error).toBe("Only builder accounts can be governed from this panel")
    })
  })

  describe("DELETE /api/admin/users/[id]", () => {
    it("deletes user and returns ok", async () => {
      deleteManagedUserUseCaseMock.mockResolvedValue(undefined)

      const response = await DELETE_USER(
        new Request("http://localhost/api/admin/users/builder-1", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }),
        { params: Promise.resolve({ id: "a1b2c3d4-e5f6-1234-abcd-1234567890ab" }) },
      )
      const payload = await response.json()

      expect(response.status).toBe(200)
      expect(payload.ok).toBe(true)
    })

    it("returns 403 when governance blocks deletion", async () => {
      deleteManagedUserUseCaseMock.mockRejectedValue(
        new GovernanceExecutionError({
          code: "GOVERNANCE_DELETE_BLOCKED",
          message: "Only builder accounts can be governed from this panel",
          status: 403,
        }),
      )

      const response = await DELETE_USER(
        new Request("http://localhost/api/admin/users/admin-1", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }),
        { params: Promise.resolve({ id: "a1b2c3d4-e5f6-1234-abcd-1234567890ab" }) },
      )
      const payload = await response.json()

      expect(response.status).toBe(403)
      expect(payload.error).toBe("Only builder accounts can be governed from this panel")
    })
  })

  describe("auth", () => {
    it("returns 401 when not authenticated", async () => {
      applyRoutePolicyMock.mockResolvedValueOnce(
        Response.json({ error: "Unauthorized" }, { status: 401 }),
      )

      const response = await GET_USERS(new Request("http://localhost/api/admin/users"))
      const payload = await response.json()

      expect(response.status).toBe(401)
      expect(payload.error).toBe("Unauthorized")
    })

    it("returns 403 when lacking capability", async () => {
      applyRoutePolicyMock.mockResolvedValueOnce(
        Response.json({ error: "Forbidden" }, { status: 403 }),
      )

      const response = await GET_USERS(new Request("http://localhost/api/admin/users"))
      const payload = await response.json()

      expect(response.status).toBe(403)
      expect(payload.error).toBe("Forbidden")
    })
  })
})
