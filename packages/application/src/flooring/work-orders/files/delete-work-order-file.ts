import {
  Prisma,
  deleteWorkOrderFile,
  getWorkOrderFileById,
  withDatabaseTransaction,
} from "@builders/db"
import { deleteBucketObject } from "@builders/lib"
import { WorkOrderFileExecutionError } from "./errors.js"
import type { DeleteWorkOrderFileInput } from "./types.js"

/**
 * Synchronous delete: read the file row to obtain the bucket key,
 * delete the bucket object, then delete the row. The bucket delete
 * runs OUTSIDE the database transaction — Postgres does not lock
 * remote storage. If the bucket delete succeeds but the row delete
 * fails (very unlikely), the next API call from the user retries
 * cleanly because deleting a missing bucket object is a no-op.
 *
 * If the row has no `fileKey` (status QUEUED / WORKING / FAILED with
 * no upload), we skip the bucket delete — there is nothing to remove.
 */
export async function deleteWorkOrderFileUseCase(
  input: DeleteWorkOrderFileInput,
): Promise<{ ok: true }> {
  const file = await readFileOrThrow(input.fileId)
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

  if (file.fileKey !== null) {
    try {
      await deleteBucketObject(input.storageEnv, file.fileKey)
    } catch (error) {
      throw new WorkOrderFileExecutionError({
        code: "WORK_ORDER_FILE_DELETE_FAILED",
        message: error instanceof Error ? error.message : "Bucket object delete failed",
        status: 500,
        payload: { fileId: input.fileId, fileKey: file.fileKey },
      })
    }
  }

  await withDatabaseTransaction(async (tx) => {
    try {
      await deleteWorkOrderFile(input.fileId, tx)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        // Already gone — no-op.
        return
      }
      throw error
    }
  })

  return { ok: true }
}

async function readFileOrThrow(fileId: string) {
  try {
    return await getWorkOrderFileById(fileId)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new WorkOrderFileExecutionError({
        code: "WORK_ORDER_FILE_NOT_FOUND",
        message: "Work order file not found",
        status: 404,
      })
    }
    throw error
  }
}
