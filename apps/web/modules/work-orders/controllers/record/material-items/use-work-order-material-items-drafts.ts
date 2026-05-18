"use client"

import { useCallback } from "react"
import type { Dispatch, SetStateAction } from "react"
import { createLocalRecordRowId } from "@/controllers/record/utils/record-row-ids"
import { buildDuplicatedRow } from "@/components/features/duplicate-row"
import type { ProductOption } from "@builders/domain"
import type { RecordSectionError } from "@/types/record/section-error"
import {
  BLANK_MATERIAL_ITEM_LOCAL_DEFAULTS,
  createBlankMaterialItemLocal,
} from "./drafts"
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

  const duplicateItem = useCallback(
    (sourceItemId: string) => {
      section.setLocalValue((previous) => {
        const source = previous.items.find((row) => row.id === sourceItemId)
        if (!source) return previous
        // Copy productId + productName + sendUnitAbbrev + categoryFilterId so
        // the new row's picker shows the same product (with label) and the
        // unit-abbrev display is preserved. Quantity + notes start blank so
        // the user confirms per-row values for the new line.
        const duplicated: WorkOrderMaterialItemLocal = {
          id: createLocalRecordRowId("work-order-material-item"),
          ...buildDuplicatedRow(
            {
              productId: source.productId,
              productName: source.productName,
              sendUnitAbbrev: source.sendUnitAbbrev,
              quantity: source.quantity,
              notes: source.notes,
              categoryFilterId: source.categoryFilterId,
            },
            {
              copy: ["productId", "productName", "sendUnitAbbrev", "categoryFilterId"],
              defaults: BLANK_MATERIAL_ITEM_LOCAL_DEFAULTS,
            },
          ),
        }
        return { items: [duplicated, ...previous.items] }
      })
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
          // Filter-only cascade — narrowing the product picker's results
          // never clears the saved product. User picks a different product
          // explicitly if they want to change it.
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
    duplicateItem,
    changeField,
    changeCategoryFilter,
    setProductSnapshot,
  }
}
