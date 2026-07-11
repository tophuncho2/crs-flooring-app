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
import { parseQuery, requireString } from "@/app/api/_shared/validators"

function fail(message: string, field?: string): never {
  throw new JobTypeExecutionError({
    code: "JOB_TYPE_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

export function validateCreateJobTypeInput(
  body: Record<string, unknown>,
): CreateJobTypeUseCaseInput {
  return {
    name: requireString(body.name, "name", fail),
  }
}

export function validateUpdateJobTypeInput(
  body: Record<string, unknown>,
): UpdateJobTypeUseCaseInput {
  const input: UpdateJobTypeUseCaseInput = {}
  if ("name" in body) input.name = requireString(body.name, "name", fail)
  return input
}

// --- List query validator ---

const listJobTypesQuerySchema = z.object({
  q: z.string().optional(),
  jobTypeNumber: z.string().optional(),
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
  const parsed = parseQuery(
    searchParams,
    listJobTypesQuerySchema,
    fail,
    "Invalid job types list query",
  )

  const trimmedSearch = parsed.q?.trim()
  const search = trimmedSearch ? trimmedSearch : undefined
  const trimmedJobTypeNumber = parsed.jobTypeNumber?.trim()
  const jobTypeNumber = trimmedJobTypeNumber ? trimmedJobTypeNumber : undefined

  return {
    search,
    filters: { jobTypeNumber },
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

export function validateJobTypeOptionsQuery(
  searchParams: URLSearchParams,
): ValidatedJobTypeOptionsQuery {
  const parsed = parseQuery(
    searchParams,
    jobTypeOptionsQuerySchema,
    fail,
    "Invalid job type options query",
  )
  const trimmed = parsed.search?.trim()
  return {
    search: trimmed ? trimmed : undefined,
    take: parsed.take,
  }
}
