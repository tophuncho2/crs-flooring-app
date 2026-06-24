"use client"

import { DebouncedSearchControl } from "@/engines/list-view"

export type TemplatesSearchField = "unitType" | "description"

export type TemplatesListSearchProps = {
  unitType: string
  description: string
  onFieldChange: (field: TemplatesSearchField, next: string) => void
}

/**
 * Two independent search bars — Unit Type and Description — each ILIKEs its own
 * column (GIN trigram backed). Filling both narrows (AND). Mirrors the
 * inventory per-field search pattern.
 */
export function TemplatesListSearch({
  unitType,
  description,
  onFieldChange,
}: TemplatesListSearchProps) {
  return (
    <>
      <DebouncedSearchControl
        value={unitType}
        onCommit={(next) => onFieldChange("unitType", next)}
        placeholder="Unit type"
        ariaLabel="Search templates by unit type"
      />
      <DebouncedSearchControl
        value={description}
        onCommit={(next) => onFieldChange("description", next)}
        placeholder="Description"
        ariaLabel="Search templates by description"
      />
    </>
  )
}
