import {
  completeWorkOrderInvoiceGeneration,
  failWorkOrderInvoiceGeneration,
  getWorkOrderInvoiceSource,
  startWorkOrderInvoiceGeneration,
} from "@builders/db"
import {
  buildWorkOrderInvoiceDocument,
  type GenerateWorkOrderInvoiceJobV1,
} from "@builders/domain"
import { uploadBucketObject, type StorageEnvironment } from "@builders/lib"
import type { WorkerEnvironment } from "../env.js"
import { renderWorkOrderInvoicePdf } from "../render/render-work-order-invoice.js"

export type WorkOrderInvoiceProcessorDependencies = {
  getInvoiceSource: typeof getWorkOrderInvoiceSource
  startInvoiceGeneration: typeof startWorkOrderInvoiceGeneration
  completeInvoiceGeneration: typeof completeWorkOrderInvoiceGeneration
  failInvoiceGeneration: typeof failWorkOrderInvoiceGeneration
  renderInvoicePdf: typeof renderWorkOrderInvoicePdf
  uploadInvoicePdf: (env: StorageEnvironment, input: { data: Buffer; key: string; contentType: string }) => Promise<string>
}

function defaultDependencies(): WorkOrderInvoiceProcessorDependencies {
  return {
    getInvoiceSource: getWorkOrderInvoiceSource,
    startInvoiceGeneration: startWorkOrderInvoiceGeneration,
    completeInvoiceGeneration: completeWorkOrderInvoiceGeneration,
    failInvoiceGeneration: failWorkOrderInvoiceGeneration,
    renderInvoicePdf: renderWorkOrderInvoicePdf,
    uploadInvoicePdf: (env, input) =>
      uploadBucketObject(env, {
        data: input.data,
        key: input.key,
        contentType: input.contentType,
      }),
  }
}

export function createWorkOrderInvoiceProcessor(
  dependencies: WorkOrderInvoiceProcessorDependencies = defaultDependencies(),
) {
  return async function processWorkOrderInvoice(job: GenerateWorkOrderInvoiceJobV1, env: WorkerEnvironment) {
    const claimed = await dependencies.startInvoiceGeneration(job.workOrderId, job.idempotencyKey)
    if (!claimed) {
      return {
        status: "skipped" as const,
        reason: "invoice-generation-superseded",
      }
    }

    try {
      const source = await dependencies.getInvoiceSource(job.workOrderId)
      if (
        source.invoiceIdempotencyKey !== job.idempotencyKey ||
        source.invoiceSourceUpdatedAt !== job.invoiceSourceUpdatedAt
      ) {
        return {
          status: "skipped" as const,
          reason: "invoice-source-changed",
        }
      }

      const document = buildWorkOrderInvoiceDocument(source)
      const pdf = await dependencies.renderInvoicePdf(source.workOrderNumber, document)
      const fileKey = `invoices/${source.workOrderId}/${job.idempotencyKey}.pdf`

      await dependencies.uploadInvoicePdf(env.storage, {
        data: pdf,
        key: fileKey,
        contentType: "application/pdf",
      })

      await dependencies.completeInvoiceGeneration(job.workOrderId, {
        idempotencyKey: job.idempotencyKey,
        fileKey,
      })

      return {
        status: "completed" as const,
        fileKey,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invoice generation failed"
      await dependencies.failInvoiceGeneration(job.workOrderId, {
        idempotencyKey: job.idempotencyKey,
        errorMessage: message,
      })
      throw error
    }
  }
}
