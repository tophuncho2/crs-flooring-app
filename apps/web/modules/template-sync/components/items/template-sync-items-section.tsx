"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  TEMPLATE_PREVIEW_ITEMS_PAGE_SIZE,
  type TemplateMaterialItemRow,
} from "@builders/domain"
import {
  SidePanelPreviewRow,
  SidePanelPreviewSection,
} from "@/components/side-panel-preview"
import {
  TEMPLATE_SYNC_PREVIEW_MATERIAL_ITEMS_QUERY_KEY,
  templatePreviewMaterialItemsRequest,
} from "@/modules/template-sync/data/template-preview-material-items-request"

const EMPTY_CELL = "—"

function formatQuantity(item: TemplateMaterialItemRow): string {
  const qty = item.quantity.trim()
  const unit = item.sendUnitAbbrev.trim()
  if (qty.length === 0) return EMPTY_CELL
  return unit.length > 0 ? `${qty} ${unit}` : qty
}

type Props = {
  templateId: string
}

export function TemplateSyncItemsSection({ templateId }: Props) {
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [templateId])

  const query = useQuery({
    queryKey: [
      ...TEMPLATE_SYNC_PREVIEW_MATERIAL_ITEMS_QUERY_KEY,
      templateId,
      page,
    ],
    queryFn: ({ signal }) =>
      templatePreviewMaterialItemsRequest(
        templateId,
        page,
        TEMPLATE_PREVIEW_ITEMS_PAGE_SIZE,
        signal,
      ),
  })

  const data = query.data

  if (!data) {
    return (
      <SidePanelPreviewSection title="Material items">
        <p className="text-xs text-[var(--foreground)]/55">
          {query.isError ? "Could not load material items." : "Loading material items…"}
        </p>
      </SidePanelPreviewSection>
    )
  }

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize))
  const showPagination = data.total > data.pageSize
  const prevDisabled = page <= 1 || query.isFetching
  const nextDisabled = page >= totalPages || query.isFetching

  return (
    <SidePanelPreviewSection title="Material items" titleAside={`(${data.total})`}>
      {data.rows.length === 0 ? (
        <p className="text-xs text-[var(--foreground)]/55">{EMPTY_CELL}</p>
      ) : (
        <ul className="flex flex-col">
          {data.rows.map((item) => (
            <li key={item.id}>
              <SidePanelPreviewRow
                primary={item.productName}
                secondary={item.notes.trim().length > 0 ? item.notes : undefined}
                meta={formatQuantity(item)}
              />
            </li>
          ))}
        </ul>
      )}
      {showPagination ? (
        <div className="flex items-center justify-between gap-2 pt-1 text-xs text-[var(--foreground)]/65">
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={prevDisabled}
            className="rounded border border-[var(--panel-border)] px-2 py-1 transition hover:bg-[var(--panel-hover)] disabled:opacity-50"
          >
            Prev
          </button>
          <span className="tabular-nums text-[var(--foreground)]/55">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            disabled={nextDisabled}
            className="rounded border border-[var(--panel-border)] px-2 py-1 transition hover:bg-[var(--panel-hover)] disabled:opacity-50"
          >
            Next
          </button>
        </div>
      ) : null}
    </SidePanelPreviewSection>
  )
}
