"use client"

import type { ReactNode } from "react"

export type PickerFilterChipProps = {
  children: ReactNode
  className?: string
}

export function PickerFilterChip({ children, className }: PickerFilterChipProps) {
  return (
    <div className={["min-w-[14rem] max-w-[20rem]", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  )
}
