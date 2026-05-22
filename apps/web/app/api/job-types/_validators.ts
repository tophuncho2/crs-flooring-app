import { z } from "zod"
import { JobTypeExecutionError } from "@builders/application"
import type {
  CreateJobTypeUseCaseInput,
  JobTypesListFilters,
  ListInput,
  UpdateJobTypeUseCaseInput,
} from "@builders/application"
import {
  LIST_JOB_TYPES_MAX_PAGE_SIZE,
  LIST_JOB_TYPES_PAGE_SIZE,
} from "@builders/domain"

function fail(message: string, field?: string): never {
  throw new JobTypeExecutionError({
    code: "JOB_TYPE_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string") fail(`${field} is required`, field)
  const trimmed = (value as string).trim()
  if (!trimmed) fail(`${field} is required`, field)
  return trimmed
}

export function validateCreateJobTypeInput(
  body: Record<string, unknown>,
): CreateJobTypeUseCaseInput {
  return {
    name: requireString(body.name, "name"),
  }
}

export function validateUpdateJobTypeInput(
  body: Record<string, unknown>,
): UpdateJobTypeUseCaseInput {
  const input: UpdateJobTypeUseCaseInput = {}
  if ("name" in body) input.name = requireString(body.name, "name")
  return input
}

// --- List query validator ---

const listJobTypesQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_JOB_TYPES_MAX_PAGE_SIZE)
    .default(LIST_JOB_TYPES_PAGE_SIZE),
})

export function validateListJobTypesQuery(
  searchParams: URLSearchParams,
): ListInput<JobTypesListFilters> {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = listJobTypesQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    fail(
      issue?.message ?? "Invalid job types list query",
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

// --- Options query validator (existing — powers the picker) ---

const OPTIONS_DEFAULT_TAKE = 20
const OPTIONS_MAX_TAKE = 50

const jobTypeOptionsQuerySchema = z.object({
  search: z.string().optional(),
  take: z.coerce
    .number()
    .int()
    .min(1)
    .max(OPTIONS_MAX_TAKE)
    .default(OPTIONS_DEFAULT_TAKE),
})

export type ValidatedJobTypeOptionsQuery = {
  search?: string
  take: number
}

export class JobTypeOptionsValidationError extends Error {
  readonly status = 400
  readonly field: string | undefined

  constructor(message: string, field?: string) {
    super(message)
    this.name = "JobTypeOptionsValidationError"
    this.field = field
  }
}

export function validateJobTypeOptionsQuery(
  searchParams: URLSearchParams,
): ValidatedJobTypeOptionsQuery {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = jobTypeOptionsQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    throw new JobTypeOptionsValidationError(
      issue?.message ?? "Invalid job type options query",
      issue?.path[0] ? String(issue.path[0]) : undefined,
    )
  }

  const parsed = parseResult.data
  const trimmed = parsed.search?.trim()
  return {
    search: trimmed ? trimmed : undefined,
    take: parsed.take,
  }
}
