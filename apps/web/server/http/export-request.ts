import { z } from "zod"
import { EXPORT_MAX_ROWS } from "@builders/domain"

/**
 * Shared shape of a CSV-export POST body. `query` is the same URL search string
 * the list view builds (so the export reuses the module's list query validator
 * verbatim); `ids` are the ticked rows; `columns` the picked column keys; `cap`
 * the requested row count.
 */
const exportEnvelopeSchema = z.object({
  query: z.string().optional(),
  ids: z.array(z.string()).optional(),
  columns: z.array(z.string()).optional(),
  cap: z.union([z.literal(250), z.literal(500), z.literal(1000), z.literal("all")]).optional(),
})

export type ParsedExportEnvelope = {
  /** The list-view search string — feed to the module's `validateList*Query`. */
  query: string
  ids?: string[]
  columns?: string[]
  cap?: number | "all"
}

/**
 * Parse the export envelope leniently — invalid columns/cap/ids are dropped
 * rather than 400'd (mirrors how the list validators drop bad filter values);
 * only the embedded `query` can raise the module's validation error downstream.
 * `ids` are trimmed, de-duped, and hard-capped so a pathological selection can
 * never balloon the `where IN (...)`. `columns` are whitelisted against the
 * module's export manifest keys.
 */
export function parseExportEnvelope(
  body: unknown,
  allowedColumnKeys: ReadonlySet<string>,
): ParsedExportEnvelope {
  const parsed = exportEnvelopeSchema.safeParse(body)
  const data = parsed.success ? parsed.data : {}

  const query = typeof data.query === "string" ? data.query : ""

  const ids = data.ids
    ? Array.from(new Set(data.ids.map((id) => id.trim()).filter((id) => id.length > 0))).slice(
        0,
        EXPORT_MAX_ROWS,
      )
    : undefined

  const columns = data.columns?.filter((key) => allowedColumnKeys.has(key))

  return {
    query,
    ...(ids && ids.length > 0 ? { ids } : {}),
    ...(columns && columns.length > 0 ? { columns } : {}),
    ...(data.cap !== undefined ? { cap: data.cap } : {}),
  }
}
