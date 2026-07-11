import { z } from "zod"
import { UserExecutionError } from "@builders/application"
import type { ListInput, UsersListFilters } from "@builders/application"
import {
  LIST_USERS_MAX_PAGE_SIZE,
  LIST_USERS_PAGE_SIZE,
  updateUserRankPayloadSchema,
  type UpdateUserRankPayload,
} from "@builders/domain"
import { parseQuery } from "@/app/api/_shared/validators"

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
  const parsed = parseQuery(
    searchParams,
    listUsersQuerySchema,
    failUserValidation,
    "Invalid users list query",
  )
  return {
    filters: {},
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}
