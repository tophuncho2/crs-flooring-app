import {
  LIST_IMPORTS_ALLOWED_GROUP_FIELDS,
  LIST_IMPORTS_MAX_PAGE_SIZE,
  LIST_IMPORTS_PAGE_SIZE,
  type ImportRow,
  type ListImportsAllowedGroupField,
} from "@builders/domain"
import { listImportsForListView } from "@builders/db"
import type { ListInput, ListOutput } from "../../list-view/contracts.js"

export type ImportsListFilters = {
  impNumber?: string
  warehouseId?: ReadonlyArray<string>
}

function isAllowedGroupField(value: string): value is ListImportsAllowedGroupField {
  return (LIST_IMPORTS_ALLOWED_GROUP_FIELDS as readonly string[]).includes(value)
}

function normalizeWarehouseIds(
  raw: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> | undefined {
  if (!raw || raw.length === 0) return undefined
  const cleaned = Array.from(
    new Set(raw.map((entry) => entry.trim()).filter((entry) => entry.length > 0)),
  )
  return cleaned.length > 0 ? cleaned : undefined
}

export async function listImportsUseCase(
  input: ListInput<ImportsListFilters>,
): Promise<ListOutput<ImportRow>> {
  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(input.pageSize || LIST_IMPORTS_PAGE_SIZE)
  const pageSize = Math.max(1, Math.min(LIST_IMPORTS_MAX_PAGE_SIZE, requestedPageSize))

  const group = input.group && isAllowedGroupField(input.group.field)
    ? { field: input.group.field }
    : null

  const search = input.search?.trim() || undefined
  const impNumber = input.filters?.impNumber?.trim() || undefined
  const warehouseId = normalizeWarehouseIds(input.filters?.warehouseId)

  const filters =
    impNumber || warehouseId
      ? {
          ...(impNumber ? { impNumber } : {}),
          ...(warehouseId ? { warehouseId } : {}),
        }
      : undefined

  const { rows, total } = await listImportsForListView({
    search,
    filters,
    group,
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return { rows, total }
}
