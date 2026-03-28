"use client"

import { TableEmptyRow, TableHeaderCell } from "@/features/flooring/shared/table-shell"
import { DeleteRowButton } from "@/features/flooring/shared/row-action-buttons"
import { confirmRecordDelete } from "@/features/dashboard/shared/record-view/shell/record-panel-footer"
import { ModalTableHead, RecordChildTableSection } from "@/features/flooring/shared/line-items/record-child-table-section"
import type { LocationDraft, LocationRow, SectionRow } from "../types"

export function WarehouseLocationsSection({
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
    <RecordChildTableSection
      title="Locations"
      actions={
        <div className="grid gap-2 sm:grid-cols-[minmax(0,12rem)_minmax(0,14rem)_auto]">
          <input
            value={newLocation.locationCode}
            onChange={(event) => onNewLocationChange("locationCode", event.target.value)}
            placeholder="Location code"
            className="rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
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
            className="rounded border border-[var(--panel-border)] px-3 py-1 text-sm disabled:opacity-60"
          >
            Add
          </button>
        </div>
      }
    >
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
                  <DeleteRowButton
                    onClick={() => {
                      if (!confirmRecordDelete(`Delete location ${location.locationCode}?`)) {
                        return
                      }

                      void onDeleteLocation(location)
                    }}
                    disabled={deletingLocationId === location.id}
                  >
                    {deletingLocationId === location.id ? "Deleting..." : "Delete"}
                  </DeleteRowButton>
                </td>
              </tr>
            )
          })
        )}
      </tbody>
    </RecordChildTableSection>
  )
}
