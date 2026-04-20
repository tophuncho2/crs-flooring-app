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
  type RecordGridLayout,
  type RecordSectionSubHeaderProps,
} from "@/modules/shared/engines/record-view"
import {
  joinRecordSectionClasses,
  RECORD_SECTION_BORDER_CLASS_NAME,
} from "@/modules/shared/engines/record-view/sections/structure/record-section-tokens"
import { formatLocationLabel } from "@builders/domain"
import { isLocalOnlyRecordRow } from "@/modules/shared/engines/record-view"
import type { LocationLocal, SectionLocal } from "@/modules/warehouse/controllers/use-warehouse-sections-section"
import { WAREHOUSE_LOCATION_COLUMNS, WAREHOUSE_SECTION_COLUMNS } from "./warehouse-item-grid"

const WAREHOUSE_LOCATION_LAYOUT: RecordGridLayout = { dataColumns: WAREHOUSE_LOCATION_COLUMNS }

function sectionDisplayLabel(section: SectionLocal): string {
  return section.number != null ? `Section ${section.number}` : "New section (unsaved)"
}

export function WarehouseSectionsSection({
  sections,
  locations,
  subHeader,
  noticeMessage,
  noticeError,
  onRemoveSection,
  onAddLocation,
  onRemoveLocation,
  onRafterChange,
  onLevelChange,
}: {
  sections: SectionLocal[]
  locations: LocationLocal[]
  subHeader: Omit<RecordSectionSubHeaderProps, "sectionType" | "capabilities">
  noticeMessage?: string
  noticeError?: string
  onRemoveSection: (sectionId: string) => void
  onAddLocation: (sectionId: string) => void
  onRemoveLocation: (locationId: string) => void
  onRafterChange: (locationId: string, value: number) => void
  onLevelChange: (locationId: string, value: number) => void
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
      isEmpty={sections.length === 0}
      emptyState="No sections yet."
    >
      <RecordSectionGrid
        columns={WAREHOUSE_SECTION_COLUMNS}
        isEmpty={sections.length === 0}
        emptyState="No sections yet."
      >
        {sections.map((section, index) => {
          const isExpanded = expandedSectionIds.includes(section.id)
          const sectionLocations = locations.filter((location) => location.sectionId === section.id)
          const isLocalSection = isLocalOnlyRecordRow(section.id)

          return (
            <Fragment key={section.id}>
              <RecordSectionGridRow columns={WAREHOUSE_SECTION_COLUMNS}>
                <RecordItemCell columnKey="number" chrome="grid" showLabel={index === 0}>
                  <RecordStaticFieldValue>{sectionDisplayLabel(section)}</RecordStaticFieldValue>
                </RecordItemCell>
                <RecordItemCell columnKey="locationsCount" chrome="grid" showLabel={index === 0}>
                  <RecordStaticFieldValue>{sectionLocations.length}</RecordStaticFieldValue>
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
                    ariaLabel: isExpanded
                      ? `Hide locations for ${sectionDisplayLabel(section)}`
                      : `Show locations for ${sectionDisplayLabel(section)}`,
                  }}
                  remove={{
                    onRemove: () => onRemoveSection(section.id),
                    disabled: subHeader.isSaving,
                    ...(isLocalSection ? {} : {}),
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
                        <RecordItemCell
                          columnKey="rafter"
                          chrome="grid"
                          tone="allocation"
                          density="compact"
                          showLabel={locationIndex === 0}
                        >
                          <RecordGridCellInput
                            type="number"
                            value={String(location.rafter)}
                            onChange={(event) =>
                              onRafterChange(location.id, parsePositiveInt(event.target.value))
                            }
                            placeholder="Rafter"
                            controlSize="compact"
                          />
                        </RecordItemCell>
                        <RecordItemCell
                          columnKey="level"
                          chrome="grid"
                          tone="allocation"
                          density="compact"
                          showLabel={locationIndex === 0}
                        >
                          <RecordGridCellInput
                            type="number"
                            value={String(location.level)}
                            onChange={(event) =>
                              onLevelChange(location.id, parsePositiveInt(event.target.value))
                            }
                            placeholder="Level"
                            controlSize="compact"
                          />
                        </RecordItemCell>
                        <RecordItemCell
                          columnKey="label"
                          chrome="grid"
                          tone="allocation"
                          density="compact"
                          showLabel={locationIndex === 0}
                        >
                          <RecordStaticFieldValue>
                            {formatLocationLabel(location.rafter, location.level)}
                          </RecordStaticFieldValue>
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
                    <RecordFooterNeutralButton
                      onClick={() => onAddLocation(section.id)}
                      disabled={subHeader.isSaving}
                    >
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

function parsePositiveInt(value: string): number {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed < 0) return 0
  return parsed
}
