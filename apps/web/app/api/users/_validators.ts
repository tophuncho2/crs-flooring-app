import { z } from "zod"
import type { ListInput, UsersListFilters } from "@builders/application"
import { LIST_USERS_MAX_PAGE_SIZE, LIST_USERS_PAGE_SIZE } from "@builders/domain"

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
