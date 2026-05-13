"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  TEMPLATE_PREVIEW_ITEMS_PAGE_SIZE,
  type TemplateMaterialItemRow,
  type TemplatePreview,
} from "@builders/domain"
import {
  TEMPLATE_SYNC_PREVIEW_QUERY_KEY,
  templatePreviewRequest,
} from "@/modules/template-sync/data/template-preview-request"

const EMPTY_CELL = "—"

function formatAddressLine(preview: TemplatePreview): string {
  const tail = [preview.propertyCity, preview.propertyState, preview.propertyPostalCode]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(", ")
  const street = preview.propertyStreetAddress.trim()
  const composed = [street, tail].filter((part) => part.length > 0).join(", ")
  return composed.length > 0 ? composed : EMPTY_CELL
}

function valueOrDash(value: string | null | undefined): string {
  if (value === null || value === undefined) return EMPTY_CELL
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : EMPTY_CELL
}

function formatQuantity(item: TemplateMaterialItemRow): string {
  const qty = item.quantity.trim()
  const unit = item.sendUnitAbbrev.trim()
  if (qty.length === 0) return EMPTY_CELL
  return unit.length > 0 ? `${qty} ${unit}` : qty
}

type RowProps = {
  label: string
  value: string
  multiline?: boolean
}

function PreviewRow({ label, value, multiline = false }: RowProps) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 text-sm">
      <span className="text-xs uppercase tracking-wide text-[var(--foreground)]/55">
        {label}
      </span>
      <span
        className={
          multiline
            ? "whitespace-pre-wrap text-[var(--foreground)]/85"
            : "truncate text-[var(--foreground)]/85"
        }
      >
        {value}
      </span>
    </div>
  )
}

type Props = {
  templateId: string
}

export function TemplateSyncPreviewSection({ templateId }: Props) {
  const [itemsPage, setItemsPage] = useState(1)

  useEffect(() => {
    setItemsPage(1)
  }, [templateId])

  const query = useQuery({
    queryKey: [...TEMPLATE_SYNC_PREVIEW_QUERY_KEY, templateId, itemsPage],
    queryFn: ({ signal }) =>
      templatePreviewRequest(templateId, itemsPage, TEMPLATE_PREVIEW_ITEMS_PAGE_SIZE, signal),
    // Drop cache on unmount so re-opening the side panel always refetches —
    // fix for stale preview after editing the template while the panel is closed.
    staleTime: 0,
    gcTime: 0,
  })

  const preview = query.data

  if (!preview) {
    return (
      <div className="rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)]/40 p-3 text-xs text-[var(--foreground)]/55">
        {query.isError ? "Could not load template details." : "Loading template details…"}
      </div>
    )
  }

  const totalPages = Math.max(1, Math.ceil(preview.itemsTotal / preview.itemsPageSize))
  const showPagination = preview.itemsTotal > preview.itemsPageSize
  const prevDisabled = itemsPage <= 1 || query.isFetching
  const nextDisabled = itemsPage >= totalPages || query.isFetching

  return (
    <div className="flex flex-col gap-4 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)]/40 p-3">
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/65">
          Property
        </h3>
        <PreviewRow label="Address" value={formatAddressLine(preview)} />
        <PreviewRow
          label="Instructions"
          value={valueOrDash(preview.propertyInstructions)}
          multiline
        />
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/65">
          Template
        </h3>
        <PreviewRow label="Job type" value={valueOrDash(preview.jobTypeName)} />
        <PreviewRow label="Unit type" value={valueOrDash(preview.unitType)} />
        <PreviewRow label="Warehouse" value={valueOrDash(preview.warehouseName)} />
        <PreviewRow label="Description" value={valueOrDash(preview.description)} multiline />
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/65">
          Material items
          <span className="ml-2 font-normal text-[var(--foreground)]/45">
            ({preview.itemsTotal})
          </span>
        </h3>
        {preview.items.length === 0 ? (
          <p className="text-xs text-[var(--foreground)]/55">{EMPTY_CELL}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--panel-border)]/60">
            {preview.items.map((item) => (
              <li key={item.id} className="flex flex-col gap-0.5 py-1.5 first:pt-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate text-[var(--foreground)]/85">{item.productName}</span>
                  <span className="shrink-0 tabular-nums text-[var(--foreground)]/70">
                    {formatQuantity(item)}
                  </span>
                </div>
                {item.notes.trim().length > 0 ? (
                  <p className="whitespace-pre-wrap text-xs text-[var(--foreground)]/55">
                    {item.notes}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {showPagination ? (
          <div className="flex items-center justify-between gap-2 pt-1 text-xs text-[var(--foreground)]/65">
            <button
              type="button"
              onClick={() => setItemsPage((page) => Math.max(1, page - 1))}
              disabled={prevDisabled}
              className="rounded border border-[var(--panel-border)] px-2 py-1 transition hover:bg-[var(--panel-hover)] disabled:opacity-50"
            >
              Prev
            </button>
            <span className="tabular-nums text-[var(--foreground)]/55">
              Page {itemsPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setItemsPage((page) => Math.min(totalPages, page + 1))}
              disabled={nextDisabled}
              className="rounded border border-[var(--panel-border)] px-2 py-1 transition hover:bg-[var(--panel-hover)] disabled:opacity-50"
            >
              Next
            </button>
          </div>
        ) : null}
      </section>
    </div>
  )
}
