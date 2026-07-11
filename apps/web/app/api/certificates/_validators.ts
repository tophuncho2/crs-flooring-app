import { z } from "zod"
import { CertificateExecutionError } from "@builders/application"
import type {
  CertificatesListFilters,
  CreateCertificateUseCaseInput,
  ListInput,
  ListSort,
  UpdateCertificateUseCaseInput,
} from "@builders/application"
import {
  CERTIFICATE_FILE_REQUIRED_MESSAGE,
  CERTIFICATE_FILE_TOO_LARGE_MESSAGE,
  CERTIFICATE_FILE_TYPE_NOT_ALLOWED_MESSAGE,
  CERTIFICATE_NOTES_MAX_LENGTH,
  CERTIFICATE_NOTES_TOO_LONG_MESSAGE,
  LIST_CERTIFICATES_MAX_PAGE_SIZE,
  LIST_CERTIFICATES_PAGE_SIZE,
  isAllowedCertificateFileContentType,
  isAllowedCertificateFileSize,
} from "@builders/domain"
import { requireString } from "@/app/api/_shared/validators"

function fail(message: string, field?: string): never {
  throw new CertificateExecutionError({
    code: "CERTIFICATE_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

function optionalString(value: unknown): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function optionalNotes(value: unknown): string | null {
  const trimmed = optionalString(value)
  if (trimmed === null) return null
  if (trimmed.length > CERTIFICATE_NOTES_MAX_LENGTH) {
    fail(CERTIFICATE_NOTES_TOO_LONG_MESSAGE, "internalNotes")
  }
  return trimmed
}

// Accepts a bare `YYYY-MM-DD` calendar date and projects it to a UTC-midnight
// Date for the `@db.Date` column; empty → null, any other shape → 400.
function optionalDate(value: unknown, field: string): Date | null {
  if (value === undefined || value === null) return null
  if (typeof value !== "string") fail(`${field} must be a date`, field)
  const trimmed = (value as string).trim()
  if (!trimmed) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) fail(`${field} must be a YYYY-MM-DD date`, field)
  const date = new Date(`${trimmed}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) fail(`${field} must be a valid date`, field)
  return date
}

export function validateCreateCertificateInput(
  body: Record<string, unknown>,
): CreateCertificateUseCaseInput {
  return {
    entityId: optionalString(body.entityId),
    name: requireString(body.name, "name", fail),
    expirationDate: optionalDate(body.expirationDate, "expirationDate"),
    internalNotes: optionalNotes(body.internalNotes),
  }
}

export function validateUpdateCertificateInput(
  body: Record<string, unknown>,
): UpdateCertificateUseCaseInput {
  const input: UpdateCertificateUseCaseInput = {}
  if ("entityId" in body) input.entityId = optionalString(body.entityId)
  if ("name" in body) input.name = requireString(body.name, "name", fail)
  if ("expirationDate" in body) input.expirationDate = optionalDate(body.expirationDate, "expirationDate")
  if ("internalNotes" in body) input.internalNotes = optionalNotes(body.internalNotes)
  return input
}

// --- File upload metadata validator ---

export type CertificateFileUploadMetadata = {
  fileName: string
  contentType: string
  sizeBytes: number
}

/**
 * Gate the extracted multipart file metadata at the edge (early 400s). The
 * upload use case re-checks the same rules against the real byte length —
 * defense in depth — so this never loosens the server-side gate.
 */
export function validateCertificateFileUpload(input: {
  fileName: string | null
  contentType: string | null
  sizeBytes: number
}): CertificateFileUploadMetadata {
  const fileName = input.fileName?.trim()
  if (!fileName) fail(CERTIFICATE_FILE_REQUIRED_MESSAGE, "file")
  if (!input.contentType || !isAllowedCertificateFileContentType(input.contentType)) {
    fail(CERTIFICATE_FILE_TYPE_NOT_ALLOWED_MESSAGE, "file")
  }
  if (!isAllowedCertificateFileSize(input.sizeBytes)) {
    fail(CERTIFICATE_FILE_TOO_LARGE_MESSAGE, "file")
  }
  return { fileName, contentType: input.contentType, sizeBytes: input.sizeBytes }
}

// --- List query validator ---

const listCertificatesQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_CERTIFICATES_MAX_PAGE_SIZE)
    .default(LIST_CERTIFICATES_PAGE_SIZE),
})

// UI-exposable sortable fields — defense-in-depth allowlist independent of the
// data layer (which silently drops unknowns). No Sort UI ships yet; the list
// falls to its server default `expirationDate ASC` when no `sorts` param.
export const CERTIFICATES_UI_SORT_FIELDS = [
  "name",
  "entity",
  "expirationDate",
  "createdAt",
  "updatedAt",
] as const
const CERTIFICATES_MAX_SORT_LEVELS = 3
/** The list's default order when no `sorts` param is supplied (soonest first). */
const CERTIFICATES_DEFAULT_SORT: ListSort = { field: "expirationDate", direction: "asc" }

/** Parse the ordered `sorts=field:dir,field:dir` param (validated, deduped, capped). */
function parseSortsParam(raw: string | null): ListSort[] {
  if (!raw) return []
  const allowed = new Set<string>(CERTIFICATES_UI_SORT_FIELDS)
  const result: ListSort[] = []
  const seen = new Set<string>()
  for (const token of raw.split(",")) {
    const [field, direction] = token.split(":")
    if (!field || seen.has(field) || !allowed.has(field)) continue
    seen.add(field)
    result.push({ field, direction: direction === "desc" ? "desc" : "asc" })
    if (result.length >= CERTIFICATES_MAX_SORT_LEVELS) break
  }
  return result
}

export function validateListCertificatesQuery(
  searchParams: URLSearchParams,
): ListInput<CertificatesListFilters> {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    if (key === "entityId") return
    raw[key] = value
  })

  const parseResult = listCertificatesQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    fail(
      issue?.message ?? "Invalid certificates list query",
      issue?.path[0] ? String(issue.path[0]) : undefined,
    )
  }

  const parsed = parseResult.data
  const trimmedSearch = parsed.q?.trim()
  const search = trimmedSearch ? trimmedSearch : undefined

  const entityIdRaw = searchParams.getAll("entityId")
  const entityId = Array.from(
    new Set(entityIdRaw.map((entry) => entry.trim()).filter((entry) => entry.length > 0)),
  )

  const filters = entityId.length > 0 ? { entityId } : undefined

  // Canonical ordered sort via `sorts`; absent → the expirationDate-asc default.
  const parsedSorts = parseSortsParam(searchParams.get("sorts"))
  const sorts: ListSort[] = parsedSorts.length > 0 ? parsedSorts : [CERTIFICATES_DEFAULT_SORT]

  return {
    search,
    sort: sorts[0],
    sorts,
    filters,
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}
