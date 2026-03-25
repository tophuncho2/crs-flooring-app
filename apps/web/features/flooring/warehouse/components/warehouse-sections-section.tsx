"use client"

import { TableEmptyRow, TableHeaderCell } from "@/features/flooring/shared/table-shell"
import { DeleteRowButton } from "@/features/flooring/shared/row-action-buttons"
import { confirmRecordDelete } from "@/features/flooring/shared/record-panel-footer"
import { ModalTableHead, RecordChildTableSection } from "@/features/flooring/shared/record-child-table-section"
import type { SectionRow } from "../types"

export function WarehouseSectionsSection({
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
    <RecordChildTableSection
      title="Sections"
      actions={
        <div className="flex items-center gap-2">
          <input
            value={newSection}
            onChange={(event) => onNewSectionChange(event.target.value)}
            placeholder="Section name"
            className="w-44 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
          />
          <button onClick={() => void onAddSection()} type="button" className="rounded border border-[var(--panel-border)] px-3 py-1 text-sm">
            Add
          </button>
        </div>
      }
    >
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
                <DeleteRowButton
                  onClick={() => {
                    if (!confirmRecordDelete(`Delete section ${section.name}?`)) {
                      return
                    }

                    void onDeleteSection(section)
                  }}
                  disabled={deletingSectionId === section.id}
                >
                  {deletingSectionId === section.id ? "Deleting..." : "Delete"}
                </DeleteRowButton>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </RecordChildTableSection>
  )
}
