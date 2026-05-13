import { listInventoryCutLogsPage } from "@builders/db"
import {
  INVENTORY_CUT_LOG_MAX_PAGE_SIZE,
  type InventoryCutLogPage,
} from "@builders/domain"
import { CutLogExecutionError } from "./errors.js"

export type ListInventoryCutLogsInput = {
  inventoryId: string
  page: number
  pageSize: number
}

function failValidation(message: string, field: string): never {
  throw new CutLogExecutionError({
    code: "CUT_LOG_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

export async function listInventoryCutLogsUseCase(
  input: ListInventoryCutLogsInput,
): Promise<InventoryCutLogPage> {
  if (!Number.isInteger(input.page) || input.page < 1) {
    failValidation("page must be a positive integer", "page")
  }
  if (
    !Number.isInteger(input.pageSize) ||
    input.pageSize < 1 ||
    input.pageSize > INVENTORY_CUT_LOG_MAX_PAGE_SIZE
  ) {
    failValidation(
      `pageSize must be between 1 and ${INVENTORY_CUT_LOG_MAX_PAGE_SIZE}`,
      "pageSize",
    )
  }

  const { rows, total } = await listInventoryCutLogsPage({
    inventoryId: input.inventoryId,
    page: input.page,
    pageSize: input.pageSize,
  })

  return {
    rows,
    total,
    page: input.page,
    pageSize: input.pageSize,
  }
}
