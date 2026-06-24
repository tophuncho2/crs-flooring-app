"use client"

import { TextCell } from "@/engines/record-view"
import { FieldSection, FormField, StaticFieldValue } from "@/engines/record-view"
import { CellAt } from "@/engines/record-view"
import { formatEasternDateTime, type EntityTypeColor, type EntityTypeForm } from "@builders/domain"
import { PaletteColorDropdown } from "./palette-color-dropdown"

export type EntityTypePrimaryFieldsSectionProps = {
  draft: EntityTypeForm
  editable: boolean
  onTypeChange: (value: string) => void
  onColorChange: (value: EntityTypeColor) => void
  /** Read-only ET-N number shown in the detail view; omit in the create flow (DB-generated). */
  entityTypeNumber?: string
  /** Read-only timestamps + actor emails shown in the detail view; omit in the create flow. */
  createdAt?: string | null
  updatedAt?: string | null
  createdBy?: string | null
  updatedBy?: string | null
}

export function EntityTypePrimaryFieldsSection({
  draft,
  editable,
  onTypeChange,
  onColorChange,
  entityTypeNumber,
  createdAt,
  updatedAt,
  createdBy,
  updatedBy,
}: EntityTypePrimaryFieldsSectionProps) {
  const showTimestamps = createdAt !== undefined || updatedAt !== undefined

  return (
    <FieldSection gap="0.75rem">
      {entityTypeNumber ? (
        <CellAt col={1} colSpan={2}>
          <FormField label="ET #">
            <StaticFieldValue>{entityTypeNumber}</StaticFieldValue>
          </FormField>
        </CellAt>
      ) : null}
      <CellAt col={1} colSpan={2}>
        <FormField label="Type" required>
          <TextCell
            editable={editable}
            value={draft.type}
            onChange={(next) => onTypeChange(next)}
            placeholder="Entity type"
            ariaLabel="Entity type"
            maxLength={30}
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={2}>
        <FormField label="Color" required>
          <PaletteColorDropdown
            value={draft.color}
            editable={editable}
            onChange={onColorChange}
            ariaLabel="Entity type color"
          />
        </FormField>
      </CellAt>
      {showTimestamps ? (
        <>
          <CellAt col={1} colSpan={2}>
            <FormField label="Created">
              <StaticFieldValue>{formatEasternDateTime(createdAt ?? null) || "—"}</StaticFieldValue>
            </FormField>
          </CellAt>
          <CellAt col={1} colSpan={2}>
            <FormField label="Updated">
              <StaticFieldValue>{formatEasternDateTime(updatedAt ?? null) || "—"}</StaticFieldValue>
            </FormField>
          </CellAt>
          <CellAt col={1} colSpan={2}>
            <FormField label="Created by">
              <StaticFieldValue>{createdBy ?? "—"}</StaticFieldValue>
            </FormField>
          </CellAt>
          <CellAt col={1} colSpan={2}>
            <FormField label="Updated by">
              <StaticFieldValue>{updatedBy ?? "—"}</StaticFieldValue>
            </FormField>
          </CellAt>
        </>
      ) : null}
    </FieldSection>
  )
}
