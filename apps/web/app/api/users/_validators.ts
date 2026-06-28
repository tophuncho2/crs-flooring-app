import { z } from "zod"
import { UserExecutionError } from "@builders/application"
import type { ListInput, UsersListFilters } from "@builders/application"
import {
  LIST_USERS_MAX_PAGE_SIZE,
  LIST_USERS_PAGE_SIZE,
  setUserActivePayloadSchema,
  updateUserRankPayloadSchema,
  type SetUserActivePayload,
  type UpdateUserRankPayload,
} from "@builders/domain"

function failUserValidation(message: string, field?: string): never {
  throw new UserExecutionError({
    code: "USER_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

export function validateUpdateUserRankInput(
  body: Record<string, unknown>,
): UpdateUserRankPayload {
  const parseResult = updateUserRankPayloadSchema.safeParse(body)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    failUserValidation(
      issue?.message ?? "Invalid rank",
      issue?.path[0] ? String(issue.path[0]) : undefined,
    )
  }
  return parseResult.data
}

export function validateSetUserActiveInput(
  body: Record<string, unknown>,
): SetUserActivePayload {
  const parseResult = setUserActivePayloadSchema.safeParse(body)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    failUserValidation(
      issue?.message ?? "Invalid activation state",
      issue?.path[0] ? String(issue.path[0]) : undefined,
    )
  }
  return parseResult.data
}

export class UsersListValidationError extends Error {
  readonly status = 400
  readonly field: string | undefined

  constructor(message: string, field?: string) {
    super(message)
    this.name = "UsersListValidationError"
    this.field = field
  }
}

// Read-only list — pagination only (no search/filter on this surface).
const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_USERS_MAX_PAGE_SIZE)
    .default(LIST_USERS_PAGE_SIZE),
})

export function validateListUsersQuery(
  searchParams: URLSearchParams,
): ListInput<UsersListFilters> {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = listUsersQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    throw new UsersListValidationError(
      issue?.message ?? "Invalid users list query",
      issue?.path[0] ? String(issue.path[0]) : undefined,
    )
  }

  const parsed = parseResult.data
  return {
    filters: {},
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}
