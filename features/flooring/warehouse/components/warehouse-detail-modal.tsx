"use client"

import { DeleteRowButton } from "@/features/flooring/shared/row-action-buttons"
import { RecordModalShell } from "@/features/flooring/shared/record-form"
import { FormStatusNotices } from "@/features/flooring/shared/notices"
import { confirmRecordDelete } from "@/features/flooring/shared/record-panel-footer"
import { RecordSummaryCard } from "@/features/flooring/shared/record-summary-card"
import { ModalTableHead, ModalTableShell, TableEmptyRow, TableHeaderCell } from "@/features/flooring/shared/table-shell"
import type { LocationDraft, LocationRow, SectionRow, WarehouseRow } from "../types"

function WarehouseSectionsTable({
  sections,
  sectionDrafts,
  newSection,
  deletingSectionId,
  onNewSectionChange,
  onAddSection,
  onSectionDraftChange,
  onSectionBlur,
  onDeleteSection,
}: {
  sections: SectionRow[]
  sectionDrafts: Record<string, string>
  newSection: string
  deletingSectionId: string | null
  onNewSectionChange: (value: string) => void
  onAddSection: () => void | Promise<void>
  onSectionDraftChange: (sectionId: string, value: string) => void
  onSectionBlur: (section: SectionRow) => void | Promise<void>
  onDeleteSection: (section: SectionRow) => void | Promise<void>
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--foreground)]/70">Sections</h3>
      <div className="mb-3 flex gap-2">
        <input
          value={newSection}
          onChange={(event) => onNewSectionChange(event.target.value)}
          placeholder="Section name"
          className="w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
        />
        <button onClick={() => void onAddSection()} type="button" className="rounded border border-[var(--panel-border)] px-3 py-1">
          Add
        </button>
      </div>
      <ModalTableShell minWidthClass="min-w-full" className="max-h-80 overflow-auto">
        <ModalTableHead>
          <tr>
            <TableHeaderCell>Section</TableHeaderCell>
            <TableHeaderCell>Locations</TableHeaderCell>
            <TableHeaderCell>Delete</TableHeaderCell>
          </tr>
        </ModalTableHead>
        <tbody>
          {sections.length === 0 ? (
            <TableEmptyRow message="No sections yet." colSpan={3} />
          ) : (
            sections.map((section) => (
              <tr key={section.id} className="border-t border-[color:var(--subpanel-border)]">
                <td className="px-3 py-2">
                  <input
                    value={sectionDrafts[section.id] ?? section.name}
                    onChange={(event) => onSectionDraftChange(section.id, event.target.value)}
                    onBlur={() => void onSectionBlur(section)}
                    className="w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                  />
                </td>
                <td className="px-3 py-2">{section.locationsCount}</td>
                <td className="px-3 py-2">
                  <DeleteRowButton onClick={() => void onDeleteSection(section)} disabled={deletingSectionId === section.id}>
                    {deletingSectionId === section.id ? "Deleting..." : "Delete"}
                  </DeleteRowButton>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </ModalTableShell>
    </div>
  )
}

function WarehouseLocationsTable({
  locations,
  sections,
  locationDrafts,
  newLocation,
  deletingLocationId,
  onNewLocationChange,
  onAddLocation,
  onLocationDraftChange,
  onLocationBlur,
  onDeleteLocation,
}: {
  locations: LocationRow[]
  sections: SectionRow[]
  locationDrafts: Record<string, LocationDraft>
  newLocation: LocationDraft
  deletingLocationId: string | null
  onNewLocationChange: (field: keyof LocationDraft, value: string) => void
  onAddLocation: () => void | Promise<void>
  onLocationDraftChange: (locationId: string, value: LocationDraft) => void
  onLocationBlur: (location: LocationRow) => void | Promise<void>
  onDeleteLocation: (location: LocationRow) => void | Promise<void>
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--foreground)]/70">Locations</h3>
      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
        <input
          value={newLocation.locationCode}
          onChange={(event) => onNewLocationChange("locationCode", event.target.value)}
          placeholder="Location code"
          className="rounded border border-[var(--panel-border)] bg-transparent px-2 py-1 md:col-span-2"
        />
        <select
          value={newLocation.sectionId}
          onChange={(event) => onNewLocationChange("sectionId", event.target.value)}
          className="rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
        >
          <option value="">Select section</option>
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => void onAddLocation()}
          type="button"
          disabled={!newLocation.sectionId}
          className="rounded border border-[var(--panel-border)] px-3 py-1 disabled:opacity-60 md:col-span-3"
        >
          Add Location
        </button>
      </div>
      <ModalTableShell minWidthClass="min-w-full" className="max-h-80 overflow-auto">
        <ModalTableHead>
          <tr>
            <TableHeaderCell>Location</TableHeaderCell>
            <TableHeaderCell>Section</TableHeaderCell>
            <TableHeaderCell>Delete</TableHeaderCell>
          </tr>
        </ModalTableHead>
        <tbody>
          {locations.length === 0 ? (
            <TableEmptyRow message="No locations yet." colSpan={3} />
          ) : (
            locations.map((location) => {
              const draft = locationDrafts[location.id] ?? {
                locationCode: location.locationCode,
                sectionId: location.sectionId,
              }

              return (
                <tr key={location.id} className="border-t border-[color:var(--subpanel-border)]">
                  <td className="px-3 py-2">
                    <input
                      value={draft.locationCode}
                      onChange={(event) => onLocationDraftChange(location.id, { ...draft, locationCode: event.target.value })}
                      onBlur={() => void onLocationBlur(location)}
                      className="w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={draft.sectionId}
                      onChange={(event) => onLocationDraftChange(location.id, { ...draft, sectionId: event.target.value })}
                      onBlur={() => void onLocationBlur(location)}
                      className="w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                    >
                      <option value="">Select section</option>
                      {sections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <DeleteRowButton onClick={() => void onDeleteLocation(location)} disabled={deletingLocationId === location.id}>
                      {deletingLocationId === location.id ? "Deleting..." : "Delete"}
                    </DeleteRowButton>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </ModalTableShell>
    </div>
  )
}

export function WarehouseDetailModal({
  warehouse,
  message,
  error,
  sections,
  locations,
  sectionDrafts,
  locationDrafts,
  newSection,
  newLocation,
  deletingSectionId,
  deletingLocationId,
  onClose,
  onNewSectionChange,
  onAddSection,
  onSectionDraftChange,
  onSectionBlur,
  onDeleteSection,
  onNewLocationChange,
  onAddLocation,
  onLocationDraftChange,
  onLocationBlur,
  onDeleteLocation,
}: {
  warehouse: WarehouseRow
  message?: string
  error?: string
  sections: SectionRow[]
  locations: LocationRow[]
  sectionDrafts: Record<string, string>
  locationDrafts: Record<string, LocationDraft>
  newSection: string
  newLocation: LocationDraft
  deletingSectionId: string | null
  deletingLocationId: string | null
  onClose: () => void
  onNewSectionChange: (value: string) => void
  onAddSection: () => void | Promise<void>
  onSectionDraftChange: (sectionId: string, value: string) => void
  onSectionBlur: (section: SectionRow) => void | Promise<void>
  onDeleteSection: (section: SectionRow) => void | Promise<void>
  onNewLocationChange: (field: keyof LocationDraft, value: string) => void
  onAddLocation: () => void | Promise<void>
  onLocationDraftChange: (locationId: string, value: LocationDraft) => void
  onLocationBlur: (location: LocationRow) => void | Promise<void>
  onDeleteLocation: (location: LocationRow) => void | Promise<void>
}) {
  return (
    <RecordModalShell title={`Warehouse - ${warehouse.name}`} onClose={onClose} sizeClass="max-w-6xl">
      <div className="space-y-6">
        <FormStatusNotices message={message} error={error} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <RecordSummaryCard label="Warehouse">{warehouse.name}</RecordSummaryCard>
          <RecordSummaryCard label="Address">{warehouse.address || "-"}</RecordSummaryCard>
          <RecordSummaryCard label="Store Phone">{warehouse.phone || "-"}</RecordSummaryCard>
          <RecordSummaryCard label="Counts">
            {warehouse.sectionsCount} sections / {warehouse.locationsCount} locations / {warehouse.workOrdersCount} work orders
          </RecordSummaryCard>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <WarehouseSectionsTable
            sections={sections}
            sectionDrafts={sectionDrafts}
            newSection={newSection}
            deletingSectionId={deletingSectionId}
            onNewSectionChange={onNewSectionChange}
            onAddSection={onAddSection}
            onSectionDraftChange={onSectionDraftChange}
            onSectionBlur={onSectionBlur}
            onDeleteSection={(section) => {
              if (!confirmRecordDelete(`Delete section ${section.name}?`)) {
                return
              }

              return onDeleteSection(section)
            }}
          />

          <WarehouseLocationsTable
            locations={locations}
            sections={sections}
            locationDrafts={locationDrafts}
            newLocation={newLocation}
            deletingLocationId={deletingLocationId}
            onNewLocationChange={onNewLocationChange}
            onAddLocation={onAddLocation}
            onLocationDraftChange={onLocationDraftChange}
            onLocationBlur={onLocationBlur}
            onDeleteLocation={(location) => {
              if (!confirmRecordDelete(`Delete location ${location.locationCode}?`)) {
                return
              }

              return onDeleteLocation(location)
            }}
          />
        </div>
      </div>
    </RecordModalShell>
  )
}
