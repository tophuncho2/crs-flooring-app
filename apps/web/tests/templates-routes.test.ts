import { beforeEach, describe, expect, it, vi } from "vitest"
import { GET as GET_TEMPLATES, POST as POST_TEMPLATES } from "@/app/api/flooring/templates/route"
import { DELETE as DELETE_TEMPLATE, PATCH as PATCH_TEMPLATE } from "@/app/api/flooring/templates/[id]/route"
import { GET as GET_ITEMS, POST as POST_ITEM } from "@/app/api/flooring/templates/[id]/items/route"
import { DELETE as DELETE_ITEM, PATCH as PATCH_ITEM } from "@/app/api/flooring/templates/[id]/items/[itemId]/route"
import { GET as GET_SERVICE_ITEMS, POST as POST_SERVICE_ITEM } from "@/app/api/flooring/templates/[id]/service-items/route"
import { DELETE as DELETE_SERVICE_ITEM, PATCH as PATCH_SERVICE_ITEM } from "@/app/api/flooring/templates/[id]/service-items/[itemId]/route"
import { GET as GET_SALES_REPS, POST as POST_SALES_REP } from "@/app/api/flooring/templates/[id]/sales-reps/route"
import { GET as GET_CALCULATIONS } from "@/app/api/flooring/templates/[id]/calculations/route"
import { DELETE as DELETE_SALES_REP, PATCH as PATCH_SALES_REP } from "@/app/api/flooring/templates/[id]/sales-reps/[repId]/route"

const {
  applyRoutePolicyMock,
  enforceMutationReceiptMock,
  finalizeMutationReceiptMock,
  authorizeTemplatesRouteMock,
  enforceRouteRateLimitMock,
  logRouteMutationSuccessMock,
  logRouteMutationFailureMock,
  listTemplatesMock,
  getTemplateByIdMock,
  createTemplateUseCaseMock,
  updateTemplateUseCaseMock,
  deleteTemplateUseCaseMock,
  listTemplateItemsMock,
  createTemplateItemMock,
  updateTemplateItemMock,
  deleteTemplateItemMock,
  listTemplateServiceItemsMock,
  createTemplateServiceItemMock,
  updateTemplateServiceItemMock,
  deleteTemplateServiceItemMock,
  listTemplateSalesRepsMock,
  listTemplateCalculationRowsMock,
  createTemplateSalesRepMock,
  updateTemplateSalesRepMock,
  deleteTemplateSalesRepMock,
} = vi.hoisted(() => ({
  applyRoutePolicyMock: vi.fn(),
  enforceMutationReceiptMock: vi.fn(),
  finalizeMutationReceiptMock: vi.fn(),
  authorizeTemplatesRouteMock: vi.fn(),
  enforceRouteRateLimitMock: vi.fn(),
  logRouteMutationSuccessMock: vi.fn(),
  logRouteMutationFailureMock: vi.fn(),
  listTemplatesMock: vi.fn(),
  getTemplateByIdMock: vi.fn(),
  createTemplateUseCaseMock: vi.fn(),
  updateTemplateUseCaseMock: vi.fn(),
  deleteTemplateUseCaseMock: vi.fn(),
  listTemplateItemsMock: vi.fn(),
  createTemplateItemMock: vi.fn(),
  updateTemplateItemMock: vi.fn(),
  deleteTemplateItemMock: vi.fn(),
  listTemplateServiceItemsMock: vi.fn(),
  createTemplateServiceItemMock: vi.fn(),
  updateTemplateServiceItemMock: vi.fn(),
  deleteTemplateServiceItemMock: vi.fn(),
  listTemplateSalesRepsMock: vi.fn(),
  listTemplateCalculationRowsMock: vi.fn(),
  createTemplateSalesRepMock: vi.fn(),
  updateTemplateSalesRepMock: vi.fn(),
  deleteTemplateSalesRepMock: vi.fn(),
}))

vi.mock("@/features/flooring/shared/access/templates-work-orders", () => ({
  authorizeTemplatesRoute: authorizeTemplatesRouteMock,
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

vi.mock("@/server/http/route-policy", async () => {
  const actual = await vi.importActual<typeof import("@/server/http/route-policy")>("@/server/http/route-policy")
  return {
    ...actual,
    applyRoutePolicy: applyRoutePolicyMock,
    enforceMutationReceipt: enforceMutationReceiptMock,
    finalizeMutationReceipt: finalizeMutationReceiptMock,
  }
})

vi.mock("@/features/flooring/templates/queries", () => ({
  listTemplates: listTemplatesMock,
  getTemplateById: getTemplateByIdMock,
  listTemplateItems: listTemplateItemsMock,
  listTemplateServiceItems: listTemplateServiceItemsMock,
  listTemplateSalesReps: listTemplateSalesRepsMock,
  listTemplateCalculationRows: listTemplateCalculationRowsMock,
}))

vi.mock("@/features/flooring/templates/application/manage-template", () => ({
  createTemplateUseCase: createTemplateUseCaseMock,
  updateTemplateUseCase: updateTemplateUseCaseMock,
  deleteTemplateUseCase: deleteTemplateUseCaseMock,
}))

vi.mock("@/features/flooring/templates/mutations", () => ({
  createTemplateItem: createTemplateItemMock,
  updateTemplateItem: updateTemplateItemMock,
  deleteTemplateItem: deleteTemplateItemMock,
  createTemplateServiceItem: createTemplateServiceItemMock,
  updateTemplateServiceItem: updateTemplateServiceItemMock,
  deleteTemplateServiceItem: deleteTemplateServiceItemMock,
  createTemplateSalesRep: createTemplateSalesRepMock,
  updateTemplateSalesRep: updateTemplateSalesRepMock,
  deleteTemplateSalesRep: deleteTemplateSalesRepMock,
}))

function templateRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "tpl-1",
    templateNumber: "TP-00001",
    templateTag: "Turn",
    propertyId: "prop-1",
    propertyName: "Oak Apartments",
    warehouseId: "",
    warehouseName: "",
    instructions: "",
    templateNotes: "",
    padProductId: "",
    padTypeLabel: "",
    itemsCount: 0,
    createdAt: "2026-03-19T00:00:00.000Z",
    updatedAt: "2026-03-19T00:00:00.000Z",
    ...overrides,
  }
}

describe("template routes", () => {
  const templateId = "11111111-1111-4111-8111-111111111111"

  beforeEach(() => {
    vi.clearAllMocks()
    authorizeTemplatesRouteMock.mockResolvedValue({
      requestId: "req-1",
      clientIp: "127.0.0.1",
      user: { id: "user-1", email: "owner@test.com" },
    })
    enforceRouteRateLimitMock.mockResolvedValue(null)
    applyRoutePolicyMock.mockResolvedValue({
      requestId: "req-1",
      clientIp: "127.0.0.1",
      user: { id: "user-1", email: "owner@test.com" },
    })
    enforceMutationReceiptMock.mockResolvedValue({ replay: null, requestHash: "hash" })
    finalizeMutationReceiptMock.mockResolvedValue(undefined)
    createTemplateUseCaseMock.mockImplementation(async (body: Record<string, unknown>) => {
      if (typeof body.propertyId !== "string" || body.propertyId.trim() === "") {
        throw { message: "propertyId is required", status: 400, field: "propertyId" }
      }
      if (typeof body.templateTag !== "string" || body.templateTag.trim() === "") {
        throw { message: "templateTag is required", status: 400, field: "templateTag" }
      }

      return templateRow()
    })
  })

  it("GET /api/flooring/templates returns normalized template rows", async () => {
    listTemplatesMock.mockResolvedValue([templateRow()])

    const response = await GET_TEMPLATES()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.templates).toEqual([templateRow()])
    expect(authorizeTemplatesRouteMock).toHaveBeenCalledTimes(1)
  })

  it("POST requires propertyId and templateTag", async () => {
    const missingProperty = await POST_TEMPLATES(
      new Request("http://localhost/api/flooring/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateTag: "Turn" }),
      }),
    )
    const missingPropertyPayload = await missingProperty.json()

    expect(missingProperty.status).toBe(400)
    expect(missingPropertyPayload.error).toBe("propertyId is required")

    const missingTag = await POST_TEMPLATES(
      new Request("http://localhost/api/flooring/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: "prop-1" }),
      }),
    )
    const missingTagPayload = await missingTag.json()

    expect(missingTag.status).toBe(400)
    expect(missingTagPayload.error).toBe("templateTag is required")
  })

  it("POST accepts nullable warehouseId and padProductId and returns normalized payload", async () => {
    createTemplateUseCaseMock.mockResolvedValue(templateRow())

    const response = await POST_TEMPLATES(
      new Request("http://localhost/api/flooring/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: "prop-1",
          templateTag: "Turn",
          warehouseId: null,
          padProductId: null,
        }),
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(createTemplateUseCaseMock).toHaveBeenCalledWith(expect.objectContaining({
      propertyId: "prop-1",
      templateTag: "Turn",
      warehouseId: null,
      padProductId: null,
    }))
    expect(payload.template).toEqual(templateRow())
  })

  it("PATCH updates allowed fields and returns normalized payload", async () => {
    getTemplateByIdMock.mockResolvedValueOnce(templateRow({ id: templateId }))
    updateTemplateUseCaseMock.mockResolvedValue(templateRow({
      id: templateId,
      templateTag: "Make Ready",
      warehouseId: "wh-1",
      warehouseName: "Main",
    }))

    const response = await PATCH_TEMPLATE(
      new Request(`http://localhost/api/flooring/templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateTag: "Make Ready",
          warehouseId: "wh-1",
          mutation: {
            idempotencyKey: "idem-1",
            expectedUpdatedAt: "2026-03-19T00:00:00.000Z",
          },
        }),
      }),
      { params: Promise.resolve({ id: templateId }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(updateTemplateUseCaseMock).toHaveBeenCalledWith(templateId, expect.objectContaining({
      templateTag: "Make Ready",
      warehouseId: "wh-1",
    }))
    expect(payload.template).toEqual(templateRow({ id: templateId, templateTag: "Make Ready", warehouseId: "wh-1", warehouseName: "Main" }))
  })

  it("DELETE succeeds on happy path and auth uses warehouse tool access", async () => {
    getTemplateByIdMock.mockResolvedValueOnce(templateRow({ id: templateId }))
    deleteTemplateUseCaseMock.mockResolvedValue({ ok: true })

    const response = await DELETE_TEMPLATE(
      new Request(`http://localhost/api/flooring/templates/${templateId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mutation: {
            idempotencyKey: "idem-2",
            expectedUpdatedAt: "2026-03-19T00:00:00.000Z",
          },
        }),
      }),
      {
        params: Promise.resolve({ id: templateId }),
      },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ ok: true })
    expect(deleteTemplateUseCaseMock).toHaveBeenCalledWith(templateId)
    expect(applyRoutePolicyMock).toHaveBeenCalledTimes(1)
  })

  it("normalizes template validation and business-rule errors", async () => {
    createTemplateUseCaseMock.mockRejectedValue({ message: "padProductId must reference a Pad product", field: "padProductId" })

    const response = await POST_TEMPLATES(
      new Request("http://localhost/api/flooring/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: "prop-1", templateTag: "Turn", padProductId: "prod-1" }),
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("padProductId must reference a Pad product")
  })

  it("child item routes list, create, patch, and delete material items", async () => {
    listTemplateItemsMock.mockResolvedValue([{ id: "item-1", productId: "prod-1", productName: "Pad", sendUnit: "SF", quantity: "2", unitPrice: "4.00", notes: "", createdAt: "2026-03-19T00:00:00.000Z" }])
    createTemplateItemMock.mockResolvedValue({ id: "item-2" })
    updateTemplateItemMock.mockResolvedValue({ id: "item-1", quantity: "3" })

    const listResponse = await GET_ITEMS(new Request("http://localhost/api/flooring/templates/tpl-1/items"), {
      params: Promise.resolve({ id: "tpl-1" }),
    })
    expect((await listResponse.json()).items).toHaveLength(1)

    const createResponse = await POST_ITEM(
      new Request("http://localhost/api/flooring/templates/tpl-1/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: "prod-1", quantity: "2", unitPrice: "4.00" }),
      }),
      { params: Promise.resolve({ id: "tpl-1" }) },
    )
    expect(createResponse.status).toBe(201)
    expect(createTemplateItemMock).toHaveBeenCalledWith("tpl-1", expect.objectContaining({ productId: "prod-1" }))

    const patchResponse = await PATCH_ITEM(
      new Request("http://localhost/api/flooring/templates/tpl-1/items/item-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: "3" }),
      }),
      { params: Promise.resolve({ id: "tpl-1", itemId: "item-1" }) },
    )
    expect((await patchResponse.json()).item).toEqual({ id: "item-1", quantity: "3" })

    const deleteResponse = await DELETE_ITEM(new Request("http://localhost/api/flooring/templates/tpl-1/items/item-1"), {
      params: Promise.resolve({ id: "tpl-1", itemId: "item-1" }),
    })
    expect((await deleteResponse.json()).ok).toBe(true)
    expect(deleteTemplateItemMock).toHaveBeenCalledWith("item-1")
  })

  it("child service-item routes list, create, patch, and delete service items", async () => {
    listTemplateServiceItemsMock.mockResolvedValue([{ id: "svc-item-1", serviceId: "svc-1", name: "Install", unitId: "unit-1", unitName: "SF", quantity: "1", unitPrice: "9.00", notes: "", createdAt: "2026-03-19T00:00:00.000Z" }])
    createTemplateServiceItemMock.mockResolvedValue({ id: "svc-item-2" })
    updateTemplateServiceItemMock.mockResolvedValue({ id: "svc-item-1", quantity: "2" })

    const listResponse = await GET_SERVICE_ITEMS(new Request("http://localhost/api/flooring/templates/tpl-1/service-items"), {
      params: Promise.resolve({ id: "tpl-1" }),
    })
    expect((await listResponse.json()).items).toHaveLength(1)

    const createResponse = await POST_SERVICE_ITEM(
      new Request("http://localhost/api/flooring/templates/tpl-1/service-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: "svc-1", unitId: "unit-1", quantity: "1", unitPrice: "9.00" }),
      }),
      { params: Promise.resolve({ id: "tpl-1" }) },
    )
    expect(createResponse.status).toBe(201)
    expect(createTemplateServiceItemMock).toHaveBeenCalledWith("tpl-1", expect.objectContaining({ serviceId: "svc-1" }))

    const patchResponse = await PATCH_SERVICE_ITEM(
      new Request("http://localhost/api/flooring/templates/tpl-1/service-items/svc-item-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: "2" }),
      }),
      { params: Promise.resolve({ id: "tpl-1", itemId: "svc-item-1" }) },
    )
    expect((await patchResponse.json()).item).toEqual({ id: "svc-item-1", quantity: "2" })

    const deleteResponse = await DELETE_SERVICE_ITEM(new Request("http://localhost/api/flooring/templates/tpl-1/service-items/svc-item-1"), {
      params: Promise.resolve({ id: "tpl-1", itemId: "svc-item-1" }),
    })
    expect((await deleteResponse.json()).ok).toBe(true)
    expect(deleteTemplateServiceItemMock).toHaveBeenCalledWith("svc-item-1")
  })

  it("child item routes return field metadata for invalid quantities", async () => {
    const response = await POST_ITEM(
      new Request("http://localhost/api/flooring/templates/tpl-1/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: "prod-1", quantity: "0" }),
      }),
      { params: Promise.resolve({ id: "tpl-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("quantity must be greater than 0")
    expect(payload.field).toBe("quantity")
  })

  it("child service-item routes require a custom name when no saved service is selected", async () => {
    const response = await POST_SERVICE_ITEM(
      new Request("http://localhost/api/flooring/templates/tpl-1/service-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId: "unit-1", quantity: "1" }),
      }),
      { params: Promise.resolve({ id: "tpl-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("name is required when no saved service is selected")
    expect(payload.field).toBe("name")
  })

  it("child sales-rep routes list, create, patch, and delete sales reps", async () => {
    listTemplateSalesRepsMock.mockResolvedValue([
      { id: "rep-1", contactId: "contact-1", contactName: "Jordan Case", percent: "10.00", createdAt: "2026-03-23T00:00:00.000Z" },
    ])
    createTemplateSalesRepMock.mockResolvedValue({ id: "rep-2", contactId: "contact-1", contactName: "Jordan Case", percent: "12.50" })
    updateTemplateSalesRepMock.mockResolvedValue({ id: "rep-1", contactId: "contact-1", contactName: "Jordan Case", percent: "15.00" })

    const listResponse = await GET_SALES_REPS(new Request("http://localhost/api/flooring/templates/tpl-1/sales-reps"), {
      params: Promise.resolve({ id: "tpl-1" }),
    })
    expect((await listResponse.json()).items).toHaveLength(1)

    const createResponse = await POST_SALES_REP(
      new Request("http://localhost/api/flooring/templates/tpl-1/sales-reps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: "contact-1", percent: "12.50" }),
      }),
      { params: Promise.resolve({ id: "tpl-1" }) },
    )
    expect(createResponse.status).toBe(201)
    expect(createTemplateSalesRepMock).toHaveBeenCalledWith("tpl-1", expect.objectContaining({ contactId: "contact-1" }))

    const patchResponse = await PATCH_SALES_REP(
      new Request("http://localhost/api/flooring/templates/tpl-1/sales-reps/rep-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ percent: "15.00" }),
      }),
      { params: Promise.resolve({ id: "tpl-1", repId: "rep-1" }) },
    )
    expect((await patchResponse.json()).item).toEqual({
      id: "rep-1",
      contactId: "contact-1",
      contactName: "Jordan Case",
      percent: "15.00",
    })

    const deleteResponse = await DELETE_SALES_REP(new Request("http://localhost/api/flooring/templates/tpl-1/sales-reps/rep-1"), {
      params: Promise.resolve({ id: "tpl-1", repId: "rep-1" }),
    })
    expect((await deleteResponse.json()).ok).toBe(true)
    expect(deleteTemplateSalesRepMock).toHaveBeenCalledWith("rep-1")
  })

  it("child sales-rep routes return field metadata for duplicate contacts", async () => {
    createTemplateSalesRepMock.mockRejectedValue({ message: "This sales rep is already assigned to the template", field: "contactId", status: 409 })

    const response = await POST_SALES_REP(
      new Request("http://localhost/api/flooring/templates/tpl-1/sales-reps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: "contact-1", percent: "10.00" }),
      }),
      { params: Promise.resolve({ id: "tpl-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("This sales rep is already assigned to the template")
    expect(payload.field).toBe("contactId")
  })

  it("child calculation route lists derived rows", async () => {
    listTemplateCalculationRowsMock.mockResolvedValue([
      { key: "customerCost", label: "Customer Cost", value: 100, format: "currency" },
      { key: "profitMargin", label: "Profit Margin", value: 0.25, format: "percentage" },
    ])

    const response = await GET_CALCULATIONS(new Request("http://localhost/api/flooring/templates/tpl-1/calculations"), {
      params: Promise.resolve({ id: "tpl-1" }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.items).toEqual([
      { key: "customerCost", label: "Customer Cost", value: 100, format: "currency" },
      { key: "profitMargin", label: "Profit Margin", value: 0.25, format: "percentage" },
    ])
    expect(listTemplateCalculationRowsMock).toHaveBeenCalledWith("tpl-1")
  })
})
