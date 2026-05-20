import { listCutLogsForWorkOrderId } from "@builders/db"
import type { CutLogRow } from "@builders/domain"
import { CutLogExecutionError } from "./errors.js"

export type ListWorkOrderCutLogsInput = { workOrderId: string }
export type WorkOrderCutLogsPage = { rows: CutLogRow[] }

/**
 * Work-order-scoped flat list of cut logs. Powers the read-only
 * "cuts-only-preview" side panel on the WO record view. No pagination
 * (cut-log count per WO is small); no transaction (pure read).
 */
export async function listWorkOrderCutLogsUseCase(
  input: ListWorkOrderCutLogsInput,
): Promise<WorkOrderCutLogsPage> {
  if (!input.workOrderId || typeof input.workOrderId !== "string") {
    throw new CutLogExecutionError({
      code: "CUT_LOG_VALIDATION_FAILED",
      message: "workOrderId is required",
      status: 400,
      field: "workOrderId",
    })
  }
  const rows = await listCutLogsForWorkOrderId(input.workOrderId)
  return { rows }
}
