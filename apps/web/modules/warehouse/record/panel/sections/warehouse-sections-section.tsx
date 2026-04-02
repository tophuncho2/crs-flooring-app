"use client"

import { Fragment, useState } from "react"
import {
  RecordFooterNeutralButton,
  RecordGridCellInput,
  RecordItemCell,
  RecordItemSection,
  RecordItemSectionControls,
  RecordScopedRow,
  RecordSectionGrid,
  RecordSectionGridRow,
  RecordStaticFieldValue,
  type RecordSectionSubHeaderProps,
  type RecordGridLayout,
} from "@/modules/shared/engines/record-view"
import {
  joinRecordSectionClasses,
  RECORD_SECTION_BORDER_CLASS_NAME,
} from "@/modules/shared/engines/record-view/sections/record-section-tokens"
import type { WarehouseLocationDraft, WarehouseSectionDraft } from "../../../types"
import { WAREHOUSE_LOCATION_COLUMNS, WAREHOUSE_SECTION_COLUMNS } from "./warehouse-item-grid"

const WAREHOUSE_LOCATION_LAYOUT: RecordGridLayout = { dataColumns: WAREHOUSE_LOCATION_COLUMNS }

export function WarehouseSectionsSection({
  rows,
  locations,
  subHeader,
  noticeMessage,
  noticeError,
  onNameChange,
  onRemoveRow,
  onAddLocation,
  onLocationCodeChange,
  onRemoveLocation,
}: {
  rows: WarehouseSectionDraft[]
  locations: WarehouseLocationDraft[]
  subHeader: Omit<RecordSectionSubHeaderProps, "sectionType" | "capabilities">
  noticeMessage?: string
  noticeError?: string
  onNameChange: (rowId: string, value: string) => void
  onRemoveRow: (rowId: string) => void
  onAddLocation: (sectionId: string) => void
  onLocationCodeChange: (locationId: string, value: string) => void
  onRemoveLocation: (locationId: string) => void
}) {
  const [expandedSectionIds, setExpandedSectionIds] = useState<string[]>([])

  return (
    <RecordItemSection
      title="Sections"
      bodyClassName="space-y-0"
      subHeader={subHeader}
      noticeMessage={noticeMessage}
      noticeError={noticeError}
      capabilities={{
        editable: true,
        supportsAddRow: true,
        supportsRemoveRow: true,
        supportsSaveDiscard: true,
        supportsEmptyState: true,
        supportsScopedRows: true,
      }}
      isEmpty={rows.length === 0}
      emptyState="No sections yet."
    >
      <RecordSectionGrid
        columns={WAREHOUSE_SECTION_COLUMNS}
        isEmpty={rows.length === 0}
        emptyState="No sections yet."
      >
        {rows.map((section, index) => {
          const isExpanded = expandedSectionIds.includes(section.id)
          const sectionLocations = locations.filter((location) => location.sectionId === section.id)

          return (
            <Fragment key={section.id}>
              <RecordSectionGridRow
                columns={WAREHOUSE_SECTION_COLUMNS}
              >
                <RecordItemCell columnKey="name" chrome="grid" showLabel={index === 0}>
                  <RecordGridCellInput
                    value={section.name}
                    onChange={(event) => onNameChange(section.id, event.target.value)}
                    placeholder="Section name"
                  />
                </RecordItemCell>
                <RecordItemCell columnKey="locationsCount" chrome="grid" showLabel={index === 0}>
                  <RecordStaticFieldValue>{section.locationsCount}</RecordStaticFieldValue>
                </RecordItemCell>
                <RecordItemSectionControls
                  capabilities={{ supportsScopedRows: true, supportsRemoveRow: true }}
                  cellChrome="grid"
                  showCellLabels={index === 0}
                  toggle={{
                    expanded: isExpanded,
                    onToggle: () => {
                      setExpandedSectionIds((previous) =>
                        previous.includes(section.id)
                          ? previous.filter((id) => id !== section.id)
                          : [...previous, section.id],
                      )
                    },
                    ariaLabel: isExpanded ? `Hide locations for ${section.name || "section"}` : `Show locations for ${section.name || "section"}`,
                  }}
                  remove={{
                    onRemove: () => onRemoveRow(section.id),
                    disabled: subHeader.isSaving,
                  }}
                />
              </RecordSectionGridRow>
              {isExpanded ? (
                <>
                  {sectionLocations.length === 0 ? (
                    <div className="bg-orange-500/[0.06] px-4 py-8 text-center text-[var(--foreground)]/65">
                      No locations in this section yet.
                    </div>
                  ) : (
                    sectionLocations.map((location, locationIndex) => (
                      <RecordScopedRow
                        key={location.id}
                        layout={WAREHOUSE_LOCATION_LAYOUT}
                        rowTone="allocation"
                      >
                        <RecordItemCell columnKey="locationCode" chrome="grid" tone="allocation" density="compact" showLabel={locationIndex === 0}>
                          <RecordGridCellInput
                            value={location.locationCode}
                            onChange={(event) => onLocationCodeChange(location.id, event.target.value)}
                            placeholder="Location code"
                            controlSize="compact"
                          />
                        </RecordItemCell>
                        <RecordItemSectionControls
                          capabilities={{ supportsRemoveRow: true }}
                          cellChrome="grid"
                          showCellLabels={locationIndex === 0}
                          remove={{
                            onRemove: () => onRemoveLocation(location.id),
                            disabled: subHeader.isSaving,
                          }}
                        />
                      </RecordScopedRow>
                    ))
                  )}
                  <div
                    className={joinRecordSectionClasses(
                      "flex justify-end bg-orange-500/[0.06] px-3 py-3",
                      "border-t",
                      RECORD_SECTION_BORDER_CLASS_NAME,
                    )}
                  >
                    <RecordFooterNeutralButton onClick={() => onAddLocation(section.id)} disabled={subHeader.isSaving}>
                      Add Location
                    </RecordFooterNeutralButton>
                  </div>
                </>
              ) : null}
            </Fragment>
          )
        })}
      </RecordSectionGrid>
    </RecordItemSection>
  )
}
