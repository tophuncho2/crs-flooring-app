"use client"

import type { InputHTMLAttributes } from "react"
import {
  getRecordGridCellControlAlignClassName,
  getRecordGridCellControlSizeClassName,
  joinGridCellClasses,
  RECORD_GRID_CELL_CONTROL_BASE_CLASS_NAME,
  RECORD_GRID_CELL_CONTROL_INVALID_CLASS_NAME,
} from "./record-grid-cell-control-shared"

export function RecordGridCellInput({
  invalid = false,
  controlSize = "regular",
  align = "left",
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean
  controlSize?: "compact" | "regular" | "wide"
  align?: "left" | "center" | "right"
}) {
  return (
    <input
      {...props}
      className={joinGridCellClasses(
        RECORD_GRID_CELL_CONTROL_BASE_CLASS_NAME,
        getRecordGridCellControlSizeClassName(controlSize),
        getRecordGridCellControlAlignClassName(align),
        invalid ? RECORD_GRID_CELL_CONTROL_INVALID_CLASS_NAME : undefined,
        className,
      )}
    />
  )
}
