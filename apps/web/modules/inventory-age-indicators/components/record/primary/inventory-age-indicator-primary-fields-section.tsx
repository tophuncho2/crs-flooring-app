"use client"

import { NumberCell } from "@/engines/record-view"
import { FieldSection, FormField, StaticFieldValue } from "@/engines/record-view"
import { CellAt } from "@/engines/record-view"
import { PaletteColorDropdown } from "@/engines/common"
import {
  formatEasternDateTime,
  type InventoryAgeIndicatorForm,
  type PaletteColor,
} from "@builders/domain"

export type InventoryAgeIndicatorPrimaryFieldsSectionProps = {
  draft: InventoryAgeIndicatorForm
  editable: boolean
  onDaysChange: (value: string) => void
  onColorChange: (value: PaletteColor) => void
  /** Read-only timestamps + actor emails shown in the detail view; omit in the create flow. */
  createdAt?: string | null
  updatedAt?: string | null
  createdBy?: string | null
  updatedBy?: string | null
}

export function InventoryAgeIndicatorPrimaryFieldsSection({
  draft,
  editable,
  onDaysChange,
  onColorChange,
  createdAt,
  updatedAt,
  createdBy,
  updatedBy,
}: InventoryAgeIndicatorPrimaryFieldsSectionProps) {
  const showTimestamps = createdAt !== undefined || updatedAt !== undefined

  return (
    <FieldSection gap="0.75rem">
      <CellAt col={1} colSpan={2}>
        <FormField label="Days" required>
          <NumberCell
            editable={editable}
            value={draft.days}
            onChange={(next) => onDaysChange(next)}
            placeholder="Age in days"
            ariaLabel="Age indicator days"
            inputMode="numeric"
            maxDecimals={0}
            align="start"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={2}>
        <FormField label="Color" required>
          <PaletteColorDropdown
            value={draft.color}
            editable={editable}
            onChange={onColorChange}
            ariaLabel="Age indicator color"
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
