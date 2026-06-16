"use client"

import { DataTable } from "@/engines/list-view"
import type { TemplateListRow } from "@builders/domain"
import { TEMPLATES_LIST_COLUMNS } from "../../list/table/templates-list-columns"
import { renderTemplateRowCell } from "../../list/table/templates-row-cell"

/**
 * The selected template rendered as the same single row the list view shows
 * (list `DataTable` columns + cell renderer, display-only). The loaded
 * `TemplateDetail` is a superset of `TemplateListRow`, so the reference header
 * passes it straight through. Future column additions land here (and in
 * `TEMPLATES_LIST_COLUMNS`).
 */
export function TemplateReferenceRow({ template }: { template: TemplateListRow }) {
  return (
    <DataTable rows={[template]} columns={TEMPLATES_LIST_COLUMNS} renderCell={renderTemplateRowCell} />
  )
}
