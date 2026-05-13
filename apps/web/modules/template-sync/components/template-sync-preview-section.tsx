"use client"

import { useQuery } from "@tanstack/react-query"
import type { TemplatePreview } from "@builders/domain"
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
  const query = useQuery({
    queryKey: [...TEMPLATE_SYNC_PREVIEW_QUERY_KEY, templateId],
    queryFn: ({ signal }) => templatePreviewRequest(templateId, signal),
    placeholderData: (previous) => previous,
  })

  const preview = query.data

  if (!preview) {
    return (
      <div className="rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)]/40 p-3 text-xs text-[var(--foreground)]/55">
        {query.isError ? "Could not load template details." : "Loading template details…"}
      </div>
    )
  }

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
    </div>
  )
}
