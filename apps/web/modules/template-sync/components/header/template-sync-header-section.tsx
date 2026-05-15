"use client"

import { useQuery } from "@tanstack/react-query"
import type { TemplatePreviewHeader } from "@builders/domain"
import { SidePanelPreviewSection } from "@/components/side-panel-preview"
import {
  TEMPLATE_SYNC_PREVIEW_HEADER_QUERY_KEY,
  templatePreviewHeaderRequest,
} from "@/modules/template-sync/data/template-preview-header-request"

const EMPTY_CELL = "—"

function formatAddressLine(header: TemplatePreviewHeader): string {
  const tail = [header.propertyCity, header.propertyState, header.propertyPostalCode]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(", ")
  const street = header.propertyStreetAddress.trim()
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

function HeaderRow({ label, value, multiline = false }: RowProps) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 text-sm">
      <span className="text-xs uppercase tracking-wide text-[var(--foreground)]/55">{label}</span>
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

export function TemplateSyncHeaderSection({ templateId }: Props) {
  const query = useQuery({
    queryKey: [...TEMPLATE_SYNC_PREVIEW_HEADER_QUERY_KEY, templateId],
    queryFn: ({ signal }) => templatePreviewHeaderRequest(templateId, signal),
    // Drop cache on unmount so re-opening the side panel always refetches —
    // header data may have been edited while the panel was closed.
    staleTime: 0,
    gcTime: 0,
  })

  const header = query.data

  if (!header) {
    return (
      <div className="rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)]/40 p-3 text-xs text-[var(--foreground)]/55">
        {query.isError ? "Could not load template details." : "Loading template details…"}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)]/40 p-3">
      <SidePanelPreviewSection title="Property">
        <HeaderRow label="Address" value={formatAddressLine(header)} />
        <HeaderRow
          label="Instructions"
          value={valueOrDash(header.propertyInstructions)}
          multiline
        />
      </SidePanelPreviewSection>

      <SidePanelPreviewSection title="Template">
        <HeaderRow label="Job type" value={valueOrDash(header.jobTypeName)} />
        <HeaderRow label="Unit type" value={valueOrDash(header.unitType)} />
        <HeaderRow label="Warehouse" value={valueOrDash(header.warehouseName)} />
        <HeaderRow label="Description" value={valueOrDash(header.description)} multiline />
        <HeaderRow
          label="Installer Instructions"
          value={valueOrDash(header.installerInstructions)}
          multiline
        />
      </SidePanelPreviewSection>
    </div>
  )
}
