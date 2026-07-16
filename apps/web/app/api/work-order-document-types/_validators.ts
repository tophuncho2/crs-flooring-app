import { z } from "zod"
import { WorkOrderDocumentTypeExecutionError } from "@builders/application"
import type {
  CreateWorkOrderDocumentTypeUseCaseInput,
  ListInput,
  UpdateWorkOrderDocumentTypeUseCaseInput,
  WorkOrderDocumentTypesListFilters,
} from "@builders/application"
import {
  LIST_WORK_ORDER_DOCUMENT_TYPES_MAX_PAGE_SIZE,
  LIST_WORK_ORDER_DOCUMENT_TYPES_PAGE_SIZE,
  workOrderPrintConfigSchema,
  type WorkOrderStoredPrintConfig,
} from "@builders/domain"
import { parseQuery, requireColor, requireString } from "@/app/api/_shared/validators"

function fail(message: string, field?: string): never {
  throw new WorkOrderDocumentTypeExecutionError({
    code: "WORK_ORDER_DOCUMENT_TYPE_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

/** Validate the doc-type checkbox-defaults payload against the domain schema. */
function requirePrintConfig(value: unknown): WorkOrderStoredPrintConfig {
  const result = workOrderPrintConfigSchema.safeParse(value ?? {})
  if (!result.success) fail("Invalid print configuration", "printConfig")
  return result.data as WorkOrderStoredPrintConfig
}

export function validateCreateWorkOrderDocumentTypeInput(
  body: Record<string, unknown>,
): CreateWorkOrderDocumentTypeUseCaseInput {
  return {
    name: requireString(body.name, "name", fail),
    color: requireColor(body.color, "color", fail),
    printConfig: requirePrintConfig(body.printConfig),
  }
}

export function validateUpdateWorkOrderDocumentTypeInput(
  body: Record<string, unknown>,
): UpdateWorkOrderDocumentTypeUseCaseInput {
  const input: UpdateWorkOrderDocumentTypeUseCaseInput = {}
  if ("name" in body) input.name = requireString(body.name, "name", fail)
  if ("color" in body) input.color = requireColor(body.color, "color", fail)
  if ("printConfig" in body) input.printConfig = requirePrintConfig(body.printConfig)
  return input
}

// --- List query validator ---

const listWorkOrderDocumentTypesQuerySchema = z.object({
  q: z.string().optional(),
  workOrderDocumentTypeNumber: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_WORK_ORDER_DOCUMENT_TYPES_MAX_PAGE_SIZE)
    .default(LIST_WORK_ORDER_DOCUMENT_TYPES_PAGE_SIZE),
})

export function validateListWorkOrderDocumentTypesQuery(
  searchParams: URLSearchParams,
): ListInput<WorkOrderDocumentTypesListFilters> {
  const parsed = parseQuery(
    searchParams,
    listWorkOrderDocumentTypesQuerySchema,
    fail,
    "Invalid document types list query",
  )
  const trimmedSearch = parsed.q?.trim()
  const search = trimmedSearch ? trimmedSearch : undefined
  const trimmedNumber = parsed.workOrderDocumentTypeNumber?.trim()
  const workOrderDocumentTypeNumber = trimmedNumber ? trimmedNumber : undefined

  return {
    search,
    filters: { workOrderDocumentTypeNumber },
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}
