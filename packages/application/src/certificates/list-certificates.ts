import {
  LIST_CERTIFICATES_MAX_PAGE_SIZE,
  LIST_CERTIFICATES_PAGE_SIZE,
  type CertificateListRow,
} from "@builders/domain"
import { listCertificatesForListView } from "@builders/db"
import type { ListInput, ListOutput } from "../list-view/contracts.js"

/** Cap on user-selected sort columns (the engine + API enforce the same). */
const MAX_SORT_LEVELS = 3

export type CertificatesListFilters = {
  entityId?: ReadonlyArray<string>
}

function normalizeEntityIds(
  raw: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> | undefined {
  if (!raw || raw.length === 0) return undefined
  const cleaned = Array.from(
    new Set(raw.map((entry) => entry.trim()).filter((entry) => entry.length > 0)),
  )
  return cleaned.length > 0 ? cleaned : undefined
}

export async function listCertificatesUseCase(
  input: ListInput<CertificatesListFilters>,
): Promise<ListOutput<CertificateListRow>> {
  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(input.pageSize || LIST_CERTIFICATES_PAGE_SIZE)
  const pageSize = Math.max(1, Math.min(LIST_CERTIFICATES_MAX_PAGE_SIZE, requestedPageSize))

  const search = input.search?.trim() || undefined
  const entityId = normalizeEntityIds(input.filters?.entityId)

  const filters = entityId ? { entityId } : undefined

  // The multi-column `sorts` array is canonical; a single `sort` is treated as
  // an array of one. Highest priority first, capped at MAX_SORT_LEVELS. The repo
  // silently drops unknown fields, so no field whitelist is needed here.
  const sortList = input.sorts ?? (input.sort ? [input.sort] : [])
  const entries = sortList
    .slice(0, MAX_SORT_LEVELS)
    .map((entry) => ({ field: entry.field, direction: entry.direction }))
  const sort = entries.length > 0 ? { entries } : undefined

  const { rows, total } = await listCertificatesForListView({
    search,
    sort,
    filters,
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return { rows, total }
}
