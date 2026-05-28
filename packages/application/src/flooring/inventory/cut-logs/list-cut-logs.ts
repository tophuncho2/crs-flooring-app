import { listCutLogsForListView } from "@builders/db"
import {
  CUT_LOGS_LIST_MAX_PAGE_SIZE,
  CUT_LOGS_LIST_PAGE_SIZE,
  type CutLogListFilters,
  type InventoryCutLogRow,
} from "@builders/domain"
import type { ListInput, ListOutput } from "../../../list-view/contracts.js"

function normalizeIds(
  raw: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> | undefined {
  if (!raw || raw.length === 0) return undefined
  const cleaned = Array.from(
    new Set(raw.map((entry) => entry.trim()).filter((entry) => entry.length > 0)),
  )
  return cleaned.length > 0 ? cleaned : undefined
}

export async function listCutLogsUseCase(
  input: ListInput<CutLogListFilters>,
): Promise<ListOutput<InventoryCutLogRow>> {
  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(input.pageSize || CUT_LOGS_LIST_PAGE_SIZE)
  const pageSize = Math.max(1, Math.min(CUT_LOGS_LIST_MAX_PAGE_SIZE, requestedPageSize))

  const search = input.search?.trim() || undefined
  const warehouseId = normalizeIds(input.filters?.warehouseId)

  const { rows, total } = await listCutLogsForListView({
    search,
    filters: warehouseId ? { warehouseId } : {},
    page,
    pageSize,
  })

  return { rows, total }
}
