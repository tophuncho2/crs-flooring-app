"use client"

import type { ReactNode } from "react"
import { FieldSection } from "@/engines/record-view"

/**
 * The single grid wrapper for every inventory cell section — record view,
 * create form, and duplicate form all render their cells inside this. A thin
 * pin over the record-view engine's `FieldSection` (the invisible 8-column
 * field grid) that fixes the module's standard gap, so "how an inventory cell
 * section is laid out" lives in exactly one place.
 *
 * Drop `<CellAt col colSpan>` children (from `@/engines/record-view`) inside,
 * each wrapping one of the field components from `./inventory-fields`.
 */
export function InventoryFieldGrid({ children }: { children: ReactNode }) {
  return <FieldSection gap="0.75rem">{children}</FieldSection>
}
