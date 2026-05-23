import { z } from "zod"
import { ManufacturerExecutionError } from "@builders/application"
import type {
  ListInput,
  ManufacturerInput,
  ManufacturersListFilters,
} from "@builders/application"
import {
  LIST_MANUFACTURERS_MAX_PAGE_SIZE,
  LIST_MANUFACTURERS_PAGE_SIZE,
} from "@builders/domain"

function fail(message: string, field?: string): never {
  throw new ManufacturerExecutionError({
    code: "MANUFACTURER_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

export function validateManufacturerInput(body: Record<string, unknown>): ManufacturerInput {
  const companyName = typeof body.companyName === "string" ? body.companyName.trim() : ""

  if (!companyName) {
    fail("companyName is required", "companyName")
  }

  return {
    companyName,
    agentName: typeof body.agentName === "string" ? body.agentName : typeof body.name === "string" ? body.name : "",
    website: typeof body.website === "string" ? body.website : "",
    phone: typeof body.phone === "string" ? body.phone : "",
    email: typeof body.email === "string" ? body.email : "",
  }
}

// --- List query validator ---

const listManufacturersQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_MANUFACTURERS_MAX_PAGE_SIZE)
    .default(LIST_MANUFACTURERS_PAGE_SIZE),
})

export function validateListManufacturersQuery(
  searchParams: URLSearchParams,
): ListInput<ManufacturersListFilters> {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = listManufacturersQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    fail(
      issue?.message ?? "Invalid manufacturers list query",
      issue?.path[0] ? String(issue.path[0]) : undefined,
    )
  }

  const parsed = parseResult.data
  const trimmedSearch = parsed.q?.trim()
  const search = trimmedSearch ? trimmedSearch : undefined

  return {
    search,
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}

// --- Options query validator (picker) ---

const manufacturerOptionsQuerySchema = z.object({
  search: z.string().optional(),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(50).default(20),
})

export type ValidatedManufacturerOptionsQuery = {
  search?: string
  skip: number
  take: number
}

export function validateManufacturerOptionsQuery(
  searchParams: URLSearchParams,
): ValidatedManufacturerOptionsQuery {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = manufacturerOptionsQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    fail(
      issue?.message ?? "Invalid manufacturer options query",
      issue?.path[0] ? String(issue.path[0]) : undefined,
    )
  }

  const parsed = parseResult.data
  const trimmed = parsed.search?.trim()
  return {
    search: trimmed ? trimmed : undefined,
    skip: parsed.skip,
    take: parsed.take,
  }
}
