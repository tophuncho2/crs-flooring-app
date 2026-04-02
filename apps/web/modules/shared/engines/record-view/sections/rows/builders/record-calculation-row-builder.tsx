"use client"

import type { ReactNode } from "react"
import { TextCell } from "../../cells/text-cell"
import { RecordItemCell } from "../../cells/record-item-cell"
import { buildGridCellProps } from "./record-row-builder-shared"

export function RecordCalculationRowBuilder({
  label,
  value,
  showCellLabels = true,
}: {
  label: ReactNode
  value: ReactNode
  showCellLabels?: boolean
}) {
  return (
    <>
      <RecordItemCell {...buildGridCellProps("calculation", showCellLabels)}>
        <TextCell>{label}</TextCell>
      </RecordItemCell>
      <RecordItemCell {...buildGridCellProps("value", showCellLabels)}>
        <TextCell align="right" className="font-medium">
          {value}
        </TextCell>
      </RecordItemCell>
    </>
  )
}
