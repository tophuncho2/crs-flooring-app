"use client"

import type { SelectHTMLAttributes } from "react"
import {
  getRecordGridCellControlSizeClassName,
  joinGridCellClasses,
  RECORD_GRID_CELL_CONTROL_BASE_CLASS_NAME,
  RECORD_GRID_CELL_CONTROL_INVALID_CLASS_NAME,
} from "./record-grid-cell-control-shared"

export function RecordGridCellSelect({
  invalid = false,
  controlSize = "regular",
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean
  controlSize?: "compact" | "regular" | "wide"
}) {
  return (
    <select
      {...props}
      className={joinGridCellClasses(
        RECORD_GRID_CELL_CONTROL_BASE_CLASS_NAME,
        "pr-8",
        getRecordGridCellControlSizeClassName(controlSize),
        invalid ? RECORD_GRID_CELL_CONTROL_INVALID_CLASS_NAME : undefined,
        className,
      )}
    >
      {children}
    </select>
  )
}
