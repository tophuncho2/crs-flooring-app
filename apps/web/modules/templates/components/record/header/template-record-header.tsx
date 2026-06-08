"use client"

import type { CascadePickerController } from "@/engines/picker"
import type {
  ManagementCompanyOption,
  PropertyOption,
  TemplateDetail,
  TemplateListRow,
} from "@builders/domain"
import type { TemplateOptionsGridController } from "@/modules/templates/controllers/record/header/use-template-options-grid"
import { TemplateOptionsGrid } from "./template-options-grid"
import { TemplateReferenceRow } from "./template-reference-row"

/**
 * The templates reference-header body (rendered inside the shared
 * `RecordReferenceHeader` card). When expanded it shows the picker grid
 * (Management Company + Property pickers over a paginated results table); when a
 * template is selected and the picker is collapsed it shows the selected template
 * as the same list-view row (reusing the list `DataTable` columns + cell renderer,
 * display-only). The labeled card chrome, the Re-select / Discard / Clear actions,
 * and the dirty discard-guard all live above this body. When collapsed the
 * selected row is clickable (`onReselect`) to re-open the picker.
 */
export function TemplateRecordHeader({
  cascade,
  grid,
  templateDetail,
  expanded,
  onReselect,
  onSelectManagementCompany,
  onSelectProperty,
  onSelectTemplate,
}: {
  cascade: CascadePickerController
  grid: TemplateOptionsGridController
  templateDetail: TemplateDetail | null
  expanded: boolean
  onReselect: () => void
  onSelectManagementCompany: (option: ManagementCompanyOption | null) => void
  onSelectProperty: (option: PropertyOption | null) => void
  onSelectTemplate: (row: TemplateListRow) => void
}) {
  if (expanded) {
    return (
      <TemplateOptionsGrid
        cascade={cascade}
        grid={grid}
        onSelectManagementCompany={onSelectManagementCompany}
        onSelectProperty={onSelectProperty}
        onSelectTemplate={onSelectTemplate}
      />
    )
  }

  // Collapsed: render the selected template as the same row the list view shows,
  // clickable to re-open the picker. The full row needs the loaded detail; during
  // the brief load window `templateDetail` is null, so fall back to the label from
  // cascade state (also clickable to re-open).
  if (!templateDetail) {
    return (
      <button
        type="button"
        onClick={onReselect}
        className="w-full truncate text-left text-sm font-medium text-[var(--foreground)]"
      >
        {cascade.templateLabel ?? "No template selected"}
      </button>
    )
  }

  return <TemplateReferenceRow template={templateDetail} onRowClick={onReselect} />
}
