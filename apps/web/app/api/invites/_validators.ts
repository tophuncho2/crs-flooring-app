import { z } from "zod"
import { InviteExecutionError } from "@builders/application"
import type { CreateInviteUseCaseInput, InvitesListFilters, ListInput } from "@builders/application"
import {
  createInvitePayloadSchema,
  LIST_INVITES_MAX_PAGE_SIZE,
  LIST_INVITES_PAGE_SIZE,
} from "@builders/domain"

export function validateCreateInviteInput(
  body: Record<string, unknown>,
): CreateInviteUseCaseInput {
  const parseResult = createInvitePayloadSchema.safeParse(body)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    throw new InviteExecutionError({
      code: "INVITE_VALIDATION_FAILED",
      message: issue?.message ?? "Invalid invite",
      status: 400,
      field: issue?.path[0] ? String(issue.path[0]) : undefined,
    })
  }
  return parseResult.data
}

// Read-only list — pagination only (no search/filter on this surface).
const listInvitesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_INVITES_MAX_PAGE_SIZE)
    .default(LIST_INVITES_PAGE_SIZE),
})

export function validateListInvitesQuery(
  searchParams: URLSearchParams,
): ListInput<InvitesListFilters> {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = listInvitesQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    throw new InviteExecutionError({
      code: "INVITE_VALIDATION_FAILED",
      message: issue?.message ?? "Invalid invites list query",
      status: 400,
      field: issue?.path[0] ? String(issue.path[0]) : undefined,
    })
  }

  const parsed = parseResult.data
  return {
    filters: {},
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}
