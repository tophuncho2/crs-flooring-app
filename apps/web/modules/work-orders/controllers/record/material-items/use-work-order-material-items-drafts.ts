"use client"

import { useCallback } from "react"
import type { Dispatch, SetStateAction } from "react"
import { createLocalRecordRowId } from "@/controllers/record/utils/record-row-ids"
import type { ProductOption } from "@builders/domain"
import type { RecordSectionError } from "@/types/record/section-error"
import { createBlankMaterialItemLocal } from "./drafts"
import type {
  WorkOrderMaterialItemLocal,
  WorkOrderMaterialItemsLocalState,
} from "./types"

/**
 * Minimum slice of the engine's section controller that this hook needs
 * to mutate drafts and clear stale errors. The rows slice passes the
 * full section object; structural typing lets us narrow to just the
 * three setters we touch. `setError` mirrors the engine's signature —
 * it normalizes strings / Errors / RecordSectionError, not a setState
 * updater.
 */
type SectionRef = {
  setLocalValue: Dispatch<SetStateAction<WorkOrderMaterialItemsLocalState>>
  setError: (value: RecordSectionError | string | Error | null) => void
  error: RecordSectionError | null
}

/**
 * CRUD callbacks for the material-items draft list. Decoupled from the
 * section-controller wrap (which owns server reconciliation + save)
 * so each callback gets room to grow without bloating the slice.
 */
export function useWorkOrderMaterialItemsDrafts({ section }: { section: SectionRef }) {
  const addItem = useCallback(() => {
    section.setLocalValue((previous) => ({
      items: [
        createBlankMaterialItemLocal(createLocalRecordRowId("work-order-material-item")),
        ...previous.items,
      ],
    }))
    section.setError(null)
  }, [section])

  const removeItem = useCallback(
    (itemId: string) => {
      section.setLocalValue((previous) => ({
        items: previous.items.filter((row) => row.id !== itemId),
      }))
      section.setError(null)
    },
    [section],
  )

  const changeField = useCallback(
    (itemId: string, field: keyof WorkOrderMaterialItemLocal, value: string) => {
      section.setLocalValue((previous) => ({
        items: previous.items.map((row) =>
          row.id === itemId ? { ...row, [field]: value } : row,
        ),
      }))
      if (section.error) section.setError(null)
    },
    [section],
  )

  const changeCategoryFilter = useCallback(
    (itemId: string, categoryId: string | null) => {
      section.setLocalValue((previous) => ({
        items: previous.items.map((row) => {
          if (row.id !== itemId) return row
          if (row.categoryFilterId === categoryId) return row
          // Only the filter id moves here; ProductCategoryPicker clears the
          // selected product (via onProductChange/onProductOptionSelected)
          // when the category changes, so a mismatched product can't linger.
          return { ...row, categoryFilterId: categoryId }
        }),
      }))
    },
    [section],
  )

  const setProductSnapshot = useCallback(
    (itemId: string, option: ProductOption | null) => {
      section.setLocalValue((previous) => ({
        items: previous.items.map((row) => {
          if (row.id !== itemId) return row
          if (option === null) {
            return { ...row, productName: "", sendUnitAbbrev: "" }
          }
          return {
            ...row,
            productName: option.name,
            sendUnitAbbrev: option.sendUnitAbbrev,
          }
        }),
      }))
    },
    [section],
  )

  return {
    addItem,
    removeItem,
    changeField,
    changeCategoryFilter,
    setProductSnapshot,
  }
}
