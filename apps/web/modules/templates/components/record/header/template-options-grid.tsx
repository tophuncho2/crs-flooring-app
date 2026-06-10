"use client"

import { DataTable, PaginateControls } from "@/engines/list-view"
import type { CascadePickerController } from "@/engines/picker"
import type { ManagementCompanyOption, PropertyOption, TemplateListRow } from "@builders/domain"
import { ManagementCompanyPicker } from "@/modules/management-companies/components/picker/management-company-picker"
import { PropertyPicker } from "@/modules/properties/components/picker/property-picker"
import {
  TEMPLATE_PICKER_PAGE_SIZE,
  type TemplateOptionsGridController,
} from "@/modules/templates/controllers/record/header/use-template-options-grid"
import { TEMPLATES_LIST_COLUMNS } from "../../list/table/templates-list-columns"
import { renderTemplateRowCell } from "../../list/table/templates-row-cell"

/**
 * The templates reference-header picker grid: the Management Company + Property
 * scope pickers side by side over a 15-row paginated results table. Clicking a
 * row selects that template. The grid controller is owned by the record surface
 * (so the reference header's Clear can reset its page) and passed in. Renders rows
 * through the shared `TEMPLATES_LIST_COLUMNS` + `renderTemplateRowCell` (same as
 * the list table and the reference row) so column changes propagate everywhere a
 * row is shown. The MC/Property pickers drive the shared cascade controller, so
 * clear-downstream (MC clears property + template; property clears template) and
 * auto-link MC (a picked property back-fills its company) are preserved.
 */
export function TemplateOptionsGrid({
  cascade,
  grid,
  hideManagementCompanyPicker = false,
  onSelectManagementCompany,
  onSelectProperty,
  onSelectTemplate,
}: {
  cascade: CascadePickerController
  grid: TemplateOptionsGridController
  /**
   * Hide the MC scope picker — used when the host already fixes the management
   * company (the MC record view), so only the Property picker is shown. The MC
   * still rides in the cascade as a filter; it just isn't user-selectable.
   */
  hideManagementCompanyPicker?: boolean
  onSelectManagementCompany: (option: ManagementCompanyOption | null) => void
  onSelectProperty: (option: PropertyOption | null) => void
  onSelectTemplate: (row: TemplateListRow) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Scope pickers: management company + property. Both narrow the list. */}
      <div className={hideManagementCompanyPicker ? undefined : "grid gap-2 sm:grid-cols-2"}>
        {hideManagementCompanyPicker ? null : (
          <ManagementCompanyPicker
            value={cascade.managementCompanyId}
            selectedLabel={cascade.managementCompanyLabel}
            onChange={() => {}}
            onOptionSelected={onSelectManagementCompany}
            placeholder="Select company"
            ariaLabel="Select management company"
          />
        )}
        <PropertyPicker
          value={cascade.propertyId}
          selectedLabel={cascade.propertyLabel}
          managementCompanyId={cascade.managementCompanyId}
          onChange={() => {}}
          onOptionSelected={onSelectProperty}
          placeholder="Select property"
          ariaLabel="Select property"
        />
      </div>

      <DataTable
        rows={grid.rows}
        columns={TEMPLATES_LIST_COLUMNS}
        renderCell={renderTemplateRowCell}
        onRowClick={(row) => onSelectTemplate(row)}
        getRowAriaLabel={(row) => `Select template ${row.templateNumber}`}
        empty={grid.isLoading ? "Searching…" : grid.error ?? "No templates match these filters."}
        footerSlot={
          <PaginateControls
            page={grid.page}
            pageSize={TEMPLATE_PICKER_PAGE_SIZE}
            totalItems={grid.total}
            totalPages={grid.totalPages}
            hasPreviousPage={grid.hasPrevious}
            hasNextPage={grid.hasNext}
            onPreviousPage={grid.goToPrevious}
            onNextPage={grid.goToNext}
          />
        }
      />
    </div>
  )
}
