import { beforeEach, describe, expect, it, vi } from "vitest"
import { createWorkOrderInvoiceProcessor } from "../src/processors/process-work-order-invoice.js"
import { renderWorkOrderInvoicePdf } from "../src/render/render-work-order-invoice.js"

describe("createWorkOrderInvoiceProcessor", () => {
  const env = {
    queueRedisUrl: "redis://localhost:6379",
    invoiceWorkerConcurrency: 2,
    invoiceWorkerLockDurationMs: 300000,
    environmentName: "test",
    serviceName: "worker",
    storage: {
      accessKeyId: "key",
      defaultRegion: "us-east-1",
      endpointUrl: "https://storage.example.com",
      bucketName: "builders",
      secretAccessKey: "secret",
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("generates and uploads the invoice when the job is current", async () => {
    const processor = createWorkOrderInvoiceProcessor({
      getInvoiceGeneration: vi.fn().mockResolvedValue({
        id: "gen-1",
        workOrderId: "wo-1",
        requestedByUserId: "user-1",
        sourceVersion: "2026-03-26T12:00:00.000Z",
        idempotencyKey: "invoice:v2:wo-1:2026-03-26T12:00:00.000Z",
        status: "QUEUED",
        requestId: "req-1",
        queueJobId: "invoice:v2:wo-1:2026-03-26T12:00:00.000Z",
        requestedAt: "2026-03-26T12:00:00.000Z",
        queuedAt: "2026-03-26T12:00:01.000Z",
        startedAt: null,
        completedAt: null,
        failedAt: null,
        supersededAt: null,
        failureCode: null,
        failureMessage: null,
      }),
      getInvoiceSource: vi.fn().mockResolvedValue({
        workOrderId: "wo-1",
        workOrderNumber: "WO-00001",
        propertyName: "Oak Apartments",
        propertyAddress: "123 Main St",
        warehouseName: "Main Warehouse",
        status: "BUILDING_ORDER",
        isComplete: false,
        vacancy: null,
        scheduledFor: "2026-03-26T00:00:00.000Z",
        unitText: "101",
        unitType: "Turn",
        customAddress: "",
        instructions: "",
        notes: "",
        sourceVersion: "2026-03-26T12:00:00.000Z",
        items: [{ id: "item-1", name: "Pad", style: null, color: null, sendUnit: "SF", quantity: "2", unitPrice: "4.00", notes: "" }],
        serviceItems: [{ id: "svc-1", name: "Install", unitName: "SF", quantity: "1", unitPrice: "9.00", notes: "" }],
      }),
      startInvoiceGeneration: vi.fn().mockResolvedValue(true),
      supersedeInvoiceGeneration: vi.fn().mockResolvedValue(true),
      failInvoiceGeneration: vi.fn().mockResolvedValue(true),
      persistCompletedInvoice: vi.fn().mockResolvedValue(undefined),
      renderInvoicePdf: vi.fn().mockResolvedValue(Buffer.from("pdf")),
      uploadInvoicePdf: vi.fn().mockResolvedValue("https://storage.example.com/builders/invoices/wo-1/invoice.pdf"),
    })

    const result = await processor({
      version: "v1",
      jobName: "generate-work-order-invoice",
      requestId: "req-1",
      generationId: "gen-1",
      workOrderId: "wo-1",
      requestedByUserId: "user-1",
      idempotencyKey: "invoice:v2:wo-1:2026-03-26T12:00:00.000Z",
      sourceVersion: "2026-03-26T12:00:00.000Z",
      queuedAt: "2026-03-26T12:00:01.000Z",
    }, env)

    expect(result).toEqual({
      status: "completed",
      fileKey: "invoices/wo-1/invoice:v2:wo-1:2026-03-26T12:00:00.000Z.pdf",
    })
  })

  it("skips processing when the generation cannot be claimed", async () => {
    const processor = createWorkOrderInvoiceProcessor({
      getInvoiceGeneration: vi.fn().mockResolvedValue({
        id: "gen-1",
        workOrderId: "wo-1",
        requestedByUserId: "user-1",
        sourceVersion: "2026-03-26T12:00:00.000Z",
        idempotencyKey: "invoice:v2:wo-1:2026-03-26T12:00:00.000Z",
        status: "SUPERSEDED",
        requestId: "req-1",
        queueJobId: "invoice:v2:wo-1:2026-03-26T12:00:00.000Z",
        requestedAt: "2026-03-26T12:00:00.000Z",
        queuedAt: "2026-03-26T12:00:01.000Z",
        startedAt: null,
        completedAt: null,
        failedAt: null,
        supersededAt: "2026-03-26T12:00:30.000Z",
        failureCode: null,
        failureMessage: null,
      }),
      getInvoiceSource: vi.fn(),
      startInvoiceGeneration: vi.fn().mockResolvedValue(false),
      supersedeInvoiceGeneration: vi.fn(),
      failInvoiceGeneration: vi.fn(),
      persistCompletedInvoice: vi.fn(),
      renderInvoicePdf: vi.fn(),
      uploadInvoicePdf: vi.fn(),
    })

    const result = await processor({
      version: "v1",
      jobName: "generate-work-order-invoice",
      requestId: "req-1",
      generationId: "gen-1",
      workOrderId: "wo-1",
      requestedByUserId: "user-1",
      idempotencyKey: "invoice:v2:wo-1:2026-03-26T12:00:00.000Z",
      sourceVersion: "2026-03-26T12:00:00.000Z",
      queuedAt: "2026-03-26T12:00:01.000Z",
    }, env)

    expect(result).toEqual({
      status: "skipped",
      reason: "invoice-generation-unavailable",
    })
  })

  it("supersedes the generation when the work-order source version changed", async () => {
    const supersedeInvoiceGeneration = vi.fn().mockResolvedValue(true)
    const processor = createWorkOrderInvoiceProcessor({
      getInvoiceGeneration: vi.fn().mockResolvedValue({
        id: "gen-1",
        workOrderId: "wo-1",
        requestedByUserId: "user-1",
        sourceVersion: "2026-03-26T12:00:00.000Z",
        idempotencyKey: "invoice:v2:wo-1:2026-03-26T12:00:00.000Z",
        status: "QUEUED",
        requestId: "req-1",
        queueJobId: "invoice:v2:wo-1:2026-03-26T12:00:00.000Z",
        requestedAt: "2026-03-26T12:00:00.000Z",
        queuedAt: "2026-03-26T12:00:01.000Z",
        startedAt: null,
        completedAt: null,
        failedAt: null,
        supersededAt: null,
        failureCode: null,
        failureMessage: null,
      }),
      getInvoiceSource: vi.fn().mockResolvedValue({
        workOrderId: "wo-1",
        workOrderNumber: "WO-00001",
        propertyName: "Oak Apartments",
        propertyAddress: "123 Main St",
        warehouseName: "Main Warehouse",
        status: "BUILDING_ORDER",
        isComplete: false,
        vacancy: null,
        scheduledFor: "2026-03-26T00:00:00.000Z",
        unitText: "101",
        unitType: "Turn",
        customAddress: "",
        instructions: "",
        notes: "",
        sourceVersion: "2026-03-26T12:05:00.000Z",
        items: [],
        serviceItems: [],
      }),
      startInvoiceGeneration: vi.fn().mockResolvedValue(true),
      supersedeInvoiceGeneration,
      failInvoiceGeneration: vi.fn(),
      persistCompletedInvoice: vi.fn(),
      renderInvoicePdf: vi.fn(),
      uploadInvoicePdf: vi.fn(),
    })

    const result = await processor({
      version: "v1",
      jobName: "generate-work-order-invoice",
      requestId: "req-1",
      generationId: "gen-1",
      workOrderId: "wo-1",
      requestedByUserId: "user-1",
      idempotencyKey: "invoice:v2:wo-1:2026-03-26T12:00:00.000Z",
      sourceVersion: "2026-03-26T12:00:00.000Z",
      queuedAt: "2026-03-26T12:00:01.000Z",
    }, env)

    expect(result).toEqual({
      status: "skipped",
      reason: "invoice-source-changed",
    })
    expect(supersedeInvoiceGeneration).toHaveBeenCalledWith({
      generationId: "gen-1",
    })
  })

  it("marks the generation as failed when rendering throws", async () => {
    const failInvoiceGeneration = vi.fn().mockResolvedValue(true)
    const processor = createWorkOrderInvoiceProcessor({
      getInvoiceGeneration: vi.fn().mockResolvedValue({
        id: "gen-1",
        workOrderId: "wo-1",
        requestedByUserId: "user-1",
        sourceVersion: "2026-03-26T12:00:00.000Z",
        idempotencyKey: "invoice:v2:wo-1:2026-03-26T12:00:00.000Z",
        status: "QUEUED",
        requestId: "req-1",
        queueJobId: "invoice:v2:wo-1:2026-03-26T12:00:00.000Z",
        requestedAt: "2026-03-26T12:00:00.000Z",
        queuedAt: "2026-03-26T12:00:01.000Z",
        startedAt: null,
        completedAt: null,
        failedAt: null,
        supersededAt: null,
        failureCode: null,
        failureMessage: null,
      }),
      getInvoiceSource: vi.fn().mockResolvedValue({
        workOrderId: "wo-1",
        workOrderNumber: "WO-00001",
        propertyName: "Oak Apartments",
        propertyAddress: "123 Main St",
        warehouseName: "Main Warehouse",
        status: "BUILDING_ORDER",
        isComplete: false,
        vacancy: null,
        scheduledFor: "2026-03-26T00:00:00.000Z",
        unitText: "101",
        unitType: "Turn",
        customAddress: "",
        instructions: "",
        notes: "",
        sourceVersion: "2026-03-26T12:00:00.000Z",
        items: [],
        serviceItems: [],
      }),
      startInvoiceGeneration: vi.fn().mockResolvedValue(true),
      supersedeInvoiceGeneration: vi.fn().mockResolvedValue(true),
      failInvoiceGeneration,
      persistCompletedInvoice: vi.fn(),
      renderInvoicePdf: vi.fn().mockRejectedValue(new Error("PDF render failed")),
      uploadInvoicePdf: vi.fn(),
    })

    await expect(processor({
      version: "v1",
      jobName: "generate-work-order-invoice",
      requestId: "req-1",
      generationId: "gen-1",
      workOrderId: "wo-1",
      requestedByUserId: "user-1",
      idempotencyKey: "invoice:v2:wo-1:2026-03-26T12:00:00.000Z",
      sourceVersion: "2026-03-26T12:00:00.000Z",
      queuedAt: "2026-03-26T12:00:01.000Z",
    }, env)).rejects.toThrow("PDF render failed")

    expect(failInvoiceGeneration).toHaveBeenCalledWith({
      generationId: "gen-1",
      failureCode: "INVOICE_PROCESSING_FAILED",
      failureMessage: "PDF render failed",
    })
  })
})

describe("renderWorkOrderInvoicePdf", () => {
  it("creates a non-empty invoice pdf buffer", async () => {
    const pdf = await renderWorkOrderInvoicePdf("WO-00001", {
      headerFields: [
        { label: "Work Order", value: "WO-00001" },
        { label: "Property", value: "Oak Apartments" },
      ],
      materialLines: [
        { description: "Pad", unit: "SF", quantity: "2", unitPriceLabel: "$4.00", lineTotalLabel: "$8.00", notes: "" },
      ],
      serviceLines: [
        { description: "Install", unit: "SF", quantity: "1", unitPriceLabel: "$9.00", lineTotalLabel: "$9.00", notes: "" },
      ],
      totals: {
        materialTotal: 8,
        serviceTotal: 9,
        invoiceTotal: 17,
        materialTotalLabel: "$8.00",
        serviceTotalLabel: "$9.00",
        invoiceTotalLabel: "$17.00",
      },
    })

    expect(Buffer.isBuffer(pdf)).toBe(true)
    expect(pdf.byteLength).toBeGreaterThan(500)
  })
})
