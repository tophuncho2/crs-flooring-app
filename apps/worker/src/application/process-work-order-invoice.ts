import { createHash } from "node:crypto"
import {
  completeInvoiceGeneration,
  failInvoiceGeneration,
  getWorkOrderInvoiceGenerationById,
  getWorkOrderInvoiceSource,
  insertInvoiceArtifact,
  startInvoiceGeneration,
  supersedeInvoiceGeneration,
  withDatabaseTransaction,
} from "@builders/db"
import {
  buildWorkOrderInvoiceDocument,
  type GenerateWorkOrderInvoiceJobV1,
} from "@builders/domain"
import { uploadBucketObject, type StorageEnvironment } from "@builders/lib"
import type { WorkerEnvironment } from "../env.js"
import { renderWorkOrderInvoicePdf } from "../render/render-work-order-invoice.js"

export type WorkOrderInvoiceApplicationDependencies = {
  getInvoiceGeneration: typeof getWorkOrderInvoiceGenerationById
  getInvoiceSource: typeof getWorkOrderInvoiceSource
  startInvoiceGeneration: typeof startInvoiceGeneration
  supersedeInvoiceGeneration: typeof supersedeInvoiceGeneration
  failInvoiceGeneration: typeof failInvoiceGeneration
  persistCompletedInvoice: (input: {
    generationId: string
    workOrderId: string
    bucketName: string
    storageKey: string
    fileName: string
    contentType: string
    checksum: string
    sizeBytes: number
  }) => Promise<void>
  renderInvoicePdf: typeof renderWorkOrderInvoicePdf
  uploadInvoicePdf: (env: StorageEnvironment, input: { data: Buffer; key: string; contentType: string }) => Promise<string>
}

function defaultDependencies(): WorkOrderInvoiceApplicationDependencies {
  return {
    getInvoiceGeneration: getWorkOrderInvoiceGenerationById,
    getInvoiceSource: getWorkOrderInvoiceSource,
    startInvoiceGeneration,
    supersedeInvoiceGeneration,
    failInvoiceGeneration,
    persistCompletedInvoice: async (input) => {
      await withDatabaseTransaction(async (tx) => {
        await insertInvoiceArtifact(
          {
            generationId: input.generationId,
            workOrderId: input.workOrderId,
            bucketName: input.bucketName,
            storageKey: input.storageKey,
            fileName: input.fileName,
            contentType: input.contentType,
            checksum: input.checksum,
            sizeBytes: input.sizeBytes,
          },
          tx,
        )
        await completeInvoiceGeneration(
          {
            generationId: input.generationId,
          },
          tx,
        )
      })
    },
    renderInvoicePdf: renderWorkOrderInvoicePdf,
    uploadInvoicePdf: (env, input) =>
      uploadBucketObject(env, {
        data: input.data,
        key: input.key,
        contentType: input.contentType,
      }),
  }
}

export function createProcessWorkOrderInvoiceUseCase(
  dependencies: WorkOrderInvoiceApplicationDependencies = defaultDependencies(),
) {
  return async function processWorkOrderInvoice(job: GenerateWorkOrderInvoiceJobV1, env: WorkerEnvironment) {
    const generation = await dependencies.getInvoiceGeneration(job.generationId)
    const claimed = await dependencies.startInvoiceGeneration(job.generationId)

    if (!claimed) {
      return {
        status: "skipped" as const,
        reason: "invoice-generation-unavailable",
      }
    }

    try {
      if (
        generation.workOrderId !== job.workOrderId ||
        generation.idempotencyKey !== job.idempotencyKey ||
        generation.sourceVersion !== job.sourceVersion
      ) {
        await dependencies.failInvoiceGeneration({
          generationId: job.generationId,
          failureCode: "INVALID_JOB_PAYLOAD",
          failureMessage: "Invoice generation payload did not match the stored generation state",
        })

        return {
          status: "skipped" as const,
          reason: "invoice-generation-invalid-payload",
        }
      }

      const source = await dependencies.getInvoiceSource(job.workOrderId)
      if (source.sourceVersion !== job.sourceVersion) {
        await dependencies.supersedeInvoiceGeneration({
          generationId: job.generationId,
        })

        return {
          status: "skipped" as const,
          reason: "invoice-source-changed",
        }
      }

      const document = buildWorkOrderInvoiceDocument(source)
      const pdf = await dependencies.renderInvoicePdf(source.workOrderNumber, document)
      const fileKey = `invoices/${source.workOrderId}/${job.idempotencyKey}.pdf`
      const fileName = `${source.workOrderNumber}.pdf`
      const checksum = createHash("sha256").update(pdf).digest("hex")

      await dependencies.uploadInvoicePdf(env.storage, {
        data: pdf,
        key: fileKey,
        contentType: "application/pdf",
      })

      await dependencies.persistCompletedInvoice({
        generationId: job.generationId,
        workOrderId: source.workOrderId,
        bucketName: env.storage.bucketName,
        storageKey: fileKey,
        fileName,
        contentType: "application/pdf",
        checksum,
        sizeBytes: pdf.byteLength,
      })

      return {
        status: "completed" as const,
        fileKey,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invoice generation failed"
      await dependencies.failInvoiceGeneration({
        generationId: job.generationId,
        failureCode: "INVOICE_PROCESSING_FAILED",
        failureMessage: message,
      })
      throw error
    }
  }
}
