"use client"

import { useEffect } from "react"
import { useRecordPageController } from "@/features/flooring/shared/controllers/record-page/use-record-page-controller"
import { FormStatusNotices } from "@/features/dashboard/shared/feedback/notices"
import { RecordFormField } from "@/features/flooring/shared/ui/forms/record-form"
import { RecordPanelFooter } from "@/features/dashboard/shared/record-view/record-panel-footer"
import { RecordSummaryCard } from "@/features/flooring/shared/ui/display/record-summary-card"
import { RecordSummaryGrid } from "@/features/flooring/shared/ui/display/record-summary-grid"
import { RecordDetailPageShell } from "@/features/dashboard/shared/record-view/record-detail-page-shell"
import type { LocationRow, SectionRow, WarehouseRow } from "../types"
import { useWarehouseRecordController } from "../use-warehouse-record-controller"
import { WarehouseLocationsSection } from "./warehouse-locations-section"
import { WarehouseSectionsSection } from "./warehouse-sections-section"

export function WarehouseDetailClient({
  warehouse,
  sections,
  locations,
  backHref,
}: {
  warehouse: WarehouseRow
  sections: SectionRow[]
  locations: LocationRow[]
  backHref: string
}) {
  const { closePage, setIsDirty } = useRecordPageController({
    backHref,
    dirtyMessage: "You have unsaved warehouse changes. Leave this warehouse without saving?",
  })
  const controller = useWarehouseRecordController({
    initialWarehouse: warehouse,
    initialSections: sections,
    initialLocations: locations,
  })

  useEffect(() => {
    setIsDirty(controller.isDirty)
  }, [controller.isDirty, setIsDirty])

  return (
    <RecordDetailPageShell
      title={`Warehouse ${controller.warehouse.name}`}
      backHref={backHref}
      onBack={closePage}
    >
      <div className="space-y-6">
        <FormStatusNotices
          message={controller.message}
          error={controller.error}
          loadingMessage={controller.isSavingWarehouse ? "Saving warehouse..." : ""}
        />

        <RecordSummaryGrid>
          <RecordSummaryCard label="Sections">{controller.warehouse.sectionsCount}</RecordSummaryCard>
          <RecordSummaryCard label="Locations">{controller.warehouse.locationsCount}</RecordSummaryCard>
          <RecordSummaryCard label="Work Orders">{controller.warehouse.workOrdersCount}</RecordSummaryCard>
          <RecordSummaryCard label="Updated">{new Date(controller.warehouse.updatedAt).toISOString().slice(0, 10)}</RecordSummaryCard>
        </RecordSummaryGrid>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <RecordFormField label="Warehouse Name">
            <input
              value={controller.draft.name}
              onChange={(event) => controller.updateDraft("name", event.target.value)}
              className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
            />
          </RecordFormField>
          <RecordFormField label="Street Address">
            <input
              value={controller.draft.address}
              onChange={(event) => controller.updateDraft("address", event.target.value)}
              className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
            />
          </RecordFormField>
          <RecordFormField label="Store Phone">
            <input
              value={controller.draft.phone}
              onChange={(event) => controller.updateDraft("phone", event.target.value)}
              className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
            />
          </RecordFormField>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <WarehouseSectionsSection
            sections={controller.sections}
            sectionDrafts={controller.sectionDrafts}
            newSection={controller.newSection}
            deletingSectionId={controller.deletingSectionId}
            onNewSectionChange={controller.setNewSection}
            onAddSection={controller.addSection}
            onSectionDraftChange={(sectionId, value) =>
              controller.setSectionDrafts((prev) => ({ ...prev, [sectionId]: value }))
            }
            onSectionBlur={controller.saveSection}
            onDeleteSection={controller.deleteSection}
          />

          <WarehouseLocationsSection
            locations={controller.locations}
            sections={controller.sections}
            locationDrafts={controller.locationDrafts}
            newLocation={controller.newLocation}
            deletingLocationId={controller.deletingLocationId}
            onNewLocationChange={(field, value) =>
              controller.setNewLocation((prev) => ({ ...prev, [field]: value }))
            }
            onAddLocation={controller.addLocation}
            onLocationDraftChange={(locationId, value) =>
              controller.setLocationDrafts((prev) => ({
                ...prev,
                [locationId]: value,
              }))
            }
            onLocationBlur={controller.saveLocation}
            onDeleteLocation={controller.deleteLocation}
          />
        </div>

        <RecordPanelFooter
          onClose={closePage}
          closeLabel="Back"
          onSave={() => void controller.saveWarehouse()}
          saveLabel="Save Warehouse"
          savingLabel="Saving Warehouse..."
          isSaving={controller.isSavingWarehouse}
        />
      </div>
    </RecordDetailPageShell>
  )
}
