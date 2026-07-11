import { z } from "zod"
import { isPaletteColor, PALETTE_COLOR_INVALID_MESSAGE, type PaletteColor } from "@builders/domain"
import { createAppError } from "@/server/http/api-helpers"

/**
 * Shared validator factories for the per-module `_validators.ts` files. These
 * collapse the copy-pasted query-parsing + field-guard boilerplate while keeping
 * runtime behavior byte-identical: the guards are parametrized by each module's
 * own `fail` (so the thrown `*ExecutionError` is unchanged), and the options
 * schema factory reproduces each module's exact bounds/fields.
 */

/** A module's typed validation-failure thrower (throws its `*ExecutionError`). */
export type FailFn = (message: string, field?: string) => never

/**
 * Shared 400 thrower for list/options validators that have no module
 * `*ExecutionError` of their own. Response is byte-identical (status 400 +
 * message + field) to the per-module `*ValidationError` classes it replaces —
 * both surface through `normalizePrismaError`.
 */
export const failValidation: FailFn = (message, field) => {
  throw createAppError(message, { status: 400, field })
}

/** Require a non-empty trimmed string. Parametrized by the caller's `fail`. */
export function requireString(value: unknown, field: string, fail: FailFn): string {
  if (typeof value !== "string") fail(`${field} is required`, field)
  const trimmed = (value as string).trim()
  if (!trimmed) fail(`${field} is required`, field)
  return trimmed
}

/** Require a valid PaletteColor. Parametrized by the caller's `fail`. */
export function requireColor(value: unknown, field: string, fail: FailFn): PaletteColor {
  if (!isPaletteColor(value)) fail(PALETTE_COLOR_INVALID_MESSAGE, field)
  return value
}

/**
 * Build a module's canonical `/options` query schema: `search?` + `skip`
 * (min 0, default 0) + `take` (min 1, max `takeMax`, default `takeDefault`).
 * Modules that add fields chain `.extend({ ... })` on the result; the one module
 * without a `skip` (job-types) keeps its own inline schema.
 */
export function optionsQuerySchema(options?: { takeMax?: number; takeDefault?: number }) {
  const { takeMax = 50, takeDefault = 20 } = options ?? {}
  return z.object({
    search: z.string().optional(),
    skip: z.coerce.number().int().min(0).default(0),
    take: z.coerce.number().int().min(1).max(takeMax).default(takeDefault),
  })
}

/**
 * The shared raw-record + safeParse query builder. Reproduces the per-module
 * inline: flatten all search params into a record, `safeParse`, and `fail` with
 * the first issue's message/path on error. (Use the module's own reader for
 * multi-value chip params BEFORE calling this, mirroring the current code.)
 */
export function parseQuery<S extends z.ZodType>(
  searchParams: URLSearchParams,
  schema: S,
  fail: FailFn,
  defaultMessage: string,
): z.output<S> {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })
  const parseResult = schema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    fail(issue?.message ?? defaultMessage, issue?.path[0] ? String(issue.path[0]) : undefined)
  }
  return parseResult.data as z.output<S>
}
