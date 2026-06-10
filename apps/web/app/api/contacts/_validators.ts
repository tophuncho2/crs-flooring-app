import { z } from "zod"
import { ContactExecutionError } from "@builders/application"
import type {
  ContactsListFilters,
  CreateContactUseCaseInput,
  ListInput,
  UpdateContactUseCaseInput,
} from "@builders/application"
import {
  LIST_CONTACTS_MAX_PAGE_SIZE,
  LIST_CONTACTS_PAGE_SIZE,
} from "@builders/domain"

function fail(message: string, field?: string): never {
  throw new ContactExecutionError({
    code: "CONTACT_VALIDATION_FAILED",
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

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== "string") fail(`${field} must be a string`, field)
  return (value as string).trim()
}

export function validateCreateContactInput(
  body: Record<string, unknown>,
): CreateContactUseCaseInput {
  return {
    name: requireString(body.name, "name"),
    phone: optionalString(body.phone, "phone"),
    email: optionalString(body.email, "email"),
  }
}

export function validateUpdateContactInput(
  body: Record<string, unknown>,
): UpdateContactUseCaseInput {
  const input: UpdateContactUseCaseInput = {}
  if ("name" in body) input.name = requireString(body.name, "name")
  if ("phone" in body) input.phone = optionalString(body.phone, "phone")
  if ("email" in body) input.email = optionalString(body.email, "email")
  return input
}

// --- List query validator ---

const listContactsQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_CONTACTS_MAX_PAGE_SIZE)
    .default(LIST_CONTACTS_PAGE_SIZE),
})

export function validateListContactsQuery(
  searchParams: URLSearchParams,
): ListInput<ContactsListFilters> {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = listContactsQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    fail(
      issue?.message ?? "Invalid contacts list query",
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

// --- Options query validator (powers the contacts picker) ---

const OPTIONS_DEFAULT_TAKE = 20
const OPTIONS_MAX_TAKE = 50

const contactOptionsQuerySchema = z.object({
  search: z.string().optional(),
  take: z.coerce
    .number()
    .int()
    .min(1)
    .max(OPTIONS_MAX_TAKE)
    .default(OPTIONS_DEFAULT_TAKE),
})

export type ValidatedContactOptionsQuery = {
  search?: string
  take: number
}

export class ContactOptionsValidationError extends Error {
  readonly status = 400
  readonly field: string | undefined

  constructor(message: string, field?: string) {
    super(message)
    this.name = "ContactOptionsValidationError"
    this.field = field
  }
}

export function validateContactOptionsQuery(
  searchParams: URLSearchParams,
): ValidatedContactOptionsQuery {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = contactOptionsQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    throw new ContactOptionsValidationError(
      issue?.message ?? "Invalid contact options query",
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
