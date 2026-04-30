"use client"

import type { RecordFieldSectionProps } from "./record-field-section"
import { RecordFieldSection } from "./record-field-section"

export function RecordPrimarySectionInstance({
  ...props
}: RecordFieldSectionProps) {
  return <RecordFieldSection {...props} />
}
