"use client"

import { useMemo, useState } from "react"
import {
  RecordAllocationItemRow,
  RecordAllocationItemsPanel,
  RecordFooterNeutralButton,
  RecordGridCellInput,
  RecordItemCell,
  RecordItemSection,
  RecordItemSectionControls,
  RecordRowDeleteButton,
  RecordRowLayout,
  RecordSectionItem,
  RecordStaticFieldValue,
  type RecordSectionSubHeaderProps,
} from "@/features/shared/engines/record-view"
import type { WarehouseLocationDraft, WarehouseSectionDraft } from "../../../types"
import { WAREHOUSE_LOCATION_COLUMNS, WAREHOUSE_SECTION_COLUMNS } from "./warehouse-item-grid"

function WarehouseLocationRow({
  location,
  onLocationCodeChange,
  onRemove,
}: {
  location: WarehouseLocationDraft
  onLocationCodeChange: (value: string) => void
  onRemove: () => void
}) {
  return (
    <RecordAllocationItemRow>
      <RecordRowLayout columns={WAREHOUSE_LOCATION_COLUMNS}>
        <RecordItemCell label="Location" columnKey="locationCode" tone="allocation" density="compact">
          <RecordGridCellInput
            value={location.locationCode}
            onChange={(event) => onLocationCodeChange(event.target.value)}
            placeholder="Location code"
            controlSize="compact"
          />
        </RecordItemCell>
        <RecordItemCell label="Remove" columnKey="remove" tone="allocation" density="compact" align="end">
          <div className="flex min-h-[2.5rem] items-center justify-start xl:justify-end">
            <RecordRowDeleteButton onClick={onRemove}>Remove</RecordRowDeleteButton>
          </div>
        </RecordItemCell>
      </RecordRowLayout>
    </RecordAllocationItemRow>
  )
}

function WarehouseSectionRow({
  section,
  locations,
  expanded,
  saving,
  onToggle,
  onNameChange,
  onRemove,
  onAddLocation,
  onLocationCodeChange,
  onRemoveLocation,
}: {
  section: WarehouseSectionDraft
  locations: WarehouseLocationDraft[]
  expanded: boolean
  saving: boolean
  onToggle: () => void
  onNameChange: (value: string) => void
  onRemove: () => void
  onAddLocation: () => void
  onLocationCodeChange: (locationId: string, value: string) => void
  onRemoveLocation: (locationId: string) => void
}) {
  const sectionLocations = useMemo(
    () => locations.filter((location) => location.sectionId === section.id),
    [locations, section.id],
  )

  return (
    <RecordSectionItem
      nestedContent={
        expanded ? (
          <RecordAllocationItemsPanel
            emptyState="No locations in this section yet."
            footer={
              <RecordFooterNeutralButton onClick={onAddLocation} disabled={saving}>
                Add Location
              </RecordFooterNeutralButton>
            }
          >
            {sectionLocations.length > 0
              ? sectionLocations.map((location) => (
                  <WarehouseLocationRow
                    key={location.id}
                    location={location}
                    onLocationCodeChange={(value) => onLocationCodeChange(location.id, value)}
                    onRemove={() => onRemoveLocation(location.id)}
                  />
                ))
              : null}
          </RecordAllocationItemsPanel>
        ) : null
      }
    >
      <RecordRowLayout columns={WAREHOUSE_SECTION_COLUMNS}>
        <RecordItemCell label="Section" columnKey="name">
          <RecordGridCellInput
            value={section.name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Section name"
          />
        </RecordItemCell>
        <RecordItemCell label="Locations" columnKey="locationsCount" align="center">
          <RecordStaticFieldValue>{sectionLocations.length}</RecordStaticFieldValue>
        </RecordItemCell>
        <RecordItemSectionControls
          capabilities={{ supportsNestedAllocations: true, supportsRemoveRow: true }}
          toggle={{
            expanded,
            onToggle,
            ariaLabel: expanded ? `Hide locations for ${section.name || "section"}` : `Show locations for ${section.name || "section"}`,
          }}
          remove={{
            onRemove,
            disabled: saving,
          }}
        />
      </RecordRowLayout>
    </RecordSectionItem>
  )
}

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
      emptyState={
        <div className="border border-dashed px-4 py-8 text-center text-[var(--foreground)]/65">
          No sections yet.
        </div>
      }
    >
      {rows.map((section) => {
        const isExpanded = expandedSectionIds.includes(section.id)

        return (
          <WarehouseSectionRow
            key={section.id}
            section={section}
            locations={locations}
            expanded={isExpanded}
            saving={subHeader.isSaving}
            onToggle={() => {
              setExpandedSectionIds((previous) =>
                previous.includes(section.id)
                  ? previous.filter((id) => id !== section.id)
                  : [...previous, section.id],
              )
            }}
            onNameChange={(value) => onNameChange(section.id, value)}
            onRemove={() => onRemoveRow(section.id)}
            onAddLocation={() => onAddLocation(section.id)}
            onLocationCodeChange={onLocationCodeChange}
            onRemoveLocation={onRemoveLocation}
          />
        )
      })}
    </RecordItemSection>
  )
}
