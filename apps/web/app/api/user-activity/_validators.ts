import { z } from "zod"
import type { ListInput, UserLoginActivityListFilters } from "@builders/application"
import {
  LIST_USER_LOGIN_ACTIVITY_MAX_PAGE_SIZE,
  LIST_USER_LOGIN_ACTIVITY_PAGE_SIZE,
} from "@builders/domain"
import { failValidation, parseQuery } from "@/app/api/_shared/validators"

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
  const parsed = parseQuery(
    searchParams,
    listUserActivityQuerySchema,
    failValidation,
    "Invalid user activity list query",
  )
  return {
    filters: {},
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}
