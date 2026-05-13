import {
  Prisma,
  getWorkOrderFileById,
  getWorkOrderForFileGeneration,
  markWorkOrderFileCompleted,
  markWorkOrderFileFailed,
  markWorkOrderFileWorking,
  withDatabaseTransaction,
} from "@builders/db"
import { buildWorkOrderPdfHtml } from "@builders/domain"
import { uploadBucketObject } from "@builders/lib"
import { renderHtmlToPdf } from "@builders/pdf"
import { WorkOrderFileExecutionError } from "./errors.js"
import type {
  GenerateWorkOrderFileInput,
  GenerateWorkOrderFileResult,
} from "./types.js"

/**
 * Consumer for the file-generation flow. Called by the BullMQ worker
 * processor for the `flooring.work-order.file-generation.requested`
 * topic.
 *
 * Three phases:
 *
 *   TX1 — Lock the file row, ensure it is in QUEUED, mark WORKING.
 *         Other workers picking up the same job (BullMQ duplicates,
 *         retried events) will see WORKING and short-circuit via the
 *         `WORK_ORDER_FILE_INVALID_STATE` rejection below.
 *
 *   IO  — Read the joined snapshot via `getWorkOrderForFileGeneration`
 *         (NO transaction; read consistency is the caller's concern —
 *         the file row is already locked WORKING). Build the HTML via
 *         the domain's pure projector. Render to PDF via puppeteer.
 *         Upload to the bucket.
 *
 *   Mark COMPLETED — single write that persists `fileKey` and flips the
 *         file row to COMPLETED.
 *
 * On any error during IO or the COMPLETED write, mark the file row
 * FAILED + persist the error message. Then throw
 * `WorkOrderFileExecutionError` with status 500 so the worker
 * processor can classify it as `UnrecoverableError` for BullMQ.
 *
 * The WO row is intentionally NOT touched — only the file row and the
 * file row's lock participate in this flow. `FlooringWorkOrderFile.status`
 * is the single source of truth for the lifecycle.
 *
 * `storageEnv` is injected by the worker entrypoint (loaded from
 * `process.env`). Application package does not read env directly per
 * its CLAUDE.md rule.
 */
export async function generateWorkOrderFileUseCase(
  input: GenerateWorkOrderFileInput,
): Promise<GenerateWorkOrderFileResult> {
  // -------- TX1: lock + mark WORKING --------
  await withDatabaseTransaction(async (tx) => {
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "flooring_work_order_file" WHERE "id" = ${input.fileId} FOR UPDATE`,
    )
    const file = await getWorkOrderFileById(input.fileId, tx)
    if (file.workOrderId !== input.workOrderId) {
      throw new WorkOrderFileExecutionError({
        code: "WORK_ORDER_FILE_NOT_FOUND",
        message: "File does not belong to this work order",
        status: 404,
        payload: {
          providedWorkOrderId: input.workOrderId,
          actualWorkOrderId: file.workOrderId,
        },
      })
    }
    if (file.status !== "QUEUED") {
      throw new WorkOrderFileExecutionError({
        code: "WORK_ORDER_FILE_INVALID_STATE",
        message: `File is in status ${file.status}; expected QUEUED`,
        status: 409,
        payload: { status: file.status },
      })
    }
    await markWorkOrderFileWorking(input.fileId, tx)
  })

  // -------- IO: render + upload --------
  const fileKey = buildFileKey(input.workOrderId, input.fileId)

  try {
    const projection = await getWorkOrderForFileGeneration(input.workOrderId)
    const html = buildWorkOrderPdfHtml(projection)
    const pdfBytes = await renderHtmlToPdf(html)
    await uploadBucketObject(input.storageEnv, {
      data: Buffer.from(pdfBytes),
      key: fileKey,
      contentType: "application/pdf",
    })
  } catch (error) {
    await markFailedAfterRender(input, error)
    throw new WorkOrderFileExecutionError({
      code: "WORK_ORDER_FILE_GENERATION_FAILED",
      message: error instanceof Error ? error.message : "Work order file generation failed",
      status: 500,
      payload: { fileId: input.fileId },
    })
  }

  // -------- Mark COMPLETED --------
  const completedAt = new Date()
  try {
    await markWorkOrderFileCompleted(input.fileId, { fileKey, completedAt })
  } catch (error) {
    await markFailedAfterRender(input, error)
    throw new WorkOrderFileExecutionError({
      code: "WORK_ORDER_FILE_GENERATION_FAILED",
      message: error instanceof Error ? error.message : "Work order file completion failed",
      status: 500,
      payload: { fileId: input.fileId },
    })
  }

  return {
    fileId: input.fileId,
    fileKey,
    completedAt: completedAt.toISOString(),
  }
}

function buildFileKey(workOrderId: string, fileId: string): string {
  return `work-orders/${workOrderId}/${fileId}.pdf`
}

async function markFailedAfterRender(
  input: GenerateWorkOrderFileInput,
  error: unknown,
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error)
  try {
    await markWorkOrderFileFailed(input.fileId, { errorMessage })
  } catch {
    // Swallow. The original error is already surfaced via the throw
    // that this function precedes; failing to record FAILED on the
    // file row is non-fatal — a re-request from the producer will
    // create a fresh file row.
  }
}
