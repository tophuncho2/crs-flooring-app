import { z } from "zod"
import type { ListInput, UserLoginActivityListFilters } from "@builders/application"
import {
  LIST_USER_LOGIN_ACTIVITY_MAX_PAGE_SIZE,
  LIST_USER_LOGIN_ACTIVITY_PAGE_SIZE,
} from "@builders/domain"

export class UserActivityListValidationError extends Error {
  readonly status = 400
  readonly field: string | undefined

  constructor(message: string, field?: string) {
    super(message)
    this.name = "UserActivityListValidationError"
    this.field = field
  }
}

// Read-only list — pagination only (no search/filter on this surface).
const listUserActivityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_USER_LOGIN_ACTIVITY_MAX_PAGE_SIZE)
    .default(LIST_USER_LOGIN_ACTIVITY_PAGE_SIZE),
})

export function validateListUserActivityQuery(
  searchParams: URLSearchParams,
): ListInput<UserLoginActivityListFilters> {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = listUserActivityQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    throw new UserActivityListValidationError(
      issue?.message ?? "Invalid user activity list query",
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
