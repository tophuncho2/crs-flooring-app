"use client"

import { useState } from "react"
import {
  RecordFooterNeutralButton,
  RecordGridCellInput,
  RecordItemCell,
  RecordItemSection,
  RecordItemSectionControls,
  RecordRowLayout,
  RecordSectionGrid,
  RecordSectionGridRow,
  RecordStaticFieldValue,
  type RecordSectionSubHeaderProps,
} from "@/features/shared/engines/record-view"
import type { WarehouseLocationDraft, WarehouseSectionDraft } from "../../../types"
import { WAREHOUSE_LOCATION_COLUMNS, WAREHOUSE_SECTION_COLUMNS } from "./warehouse-item-grid"

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
        supportsNestedAllocations: true,
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
            <RecordSectionGridRow
              key={section.id}
              columns={WAREHOUSE_SECTION_COLUMNS}
              nestedContent={
                isExpanded ? (
                  <RecordSectionGrid
                    columns={WAREHOUSE_LOCATION_COLUMNS}
                    surface="nested"
                    isEmpty={sectionLocations.length === 0}
                    emptyState="No locations in this section yet."
                    footer={
                      <RecordFooterNeutralButton onClick={() => onAddLocation(section.id)} disabled={subHeader.isSaving}>
                        Add Location
                      </RecordFooterNeutralButton>
                    }
                  >
                    {sectionLocations.map((location, locationIndex) => (
                      <RecordSectionGridRow
                        key={location.id}
                        columns={WAREHOUSE_LOCATION_COLUMNS}
                        rowTone="allocation"
                      >
                        <RecordRowLayout columns={WAREHOUSE_LOCATION_COLUMNS}>
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
                        </RecordRowLayout>
                      </RecordSectionGridRow>
                    ))}
                  </RecordSectionGrid>
                ) : null
              }
            >
              <RecordRowLayout columns={WAREHOUSE_SECTION_COLUMNS}>
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
                  capabilities={{ supportsNestedAllocations: true, supportsRemoveRow: true }}
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
              </RecordRowLayout>
            </RecordSectionGridRow>
          )
        })}
      </RecordSectionGrid>
    </RecordItemSection>
  )
}
