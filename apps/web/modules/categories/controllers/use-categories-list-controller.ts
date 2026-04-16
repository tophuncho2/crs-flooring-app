"use client"

import { useState } from "react"
import type { CategoryRow } from "../types"

export function useCategoriesListController(initialRows: CategoryRow[]) {
  const [rows] = useState(initialRows)

  return {
    rows,
  }
}
