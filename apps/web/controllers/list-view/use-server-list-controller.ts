"use client"

import type { ListControllerInput } from "./contracts/list-controller-input"
import type { ListControllerOutput } from "./contracts/list-controller-output"

export function useServerListController<TRow, TFilters = Record<string, never>>(
  _input: ListControllerInput<TRow, TFilters>,
): ListControllerOutput<TRow> {
  throw new Error("useServerListController: not implemented (lands in PR 2)")
}
