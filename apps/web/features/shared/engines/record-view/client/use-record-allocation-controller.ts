"use client"

import { useCallback } from "react"

type MaybeUpdater<T> = T | ((previous: T) => T)

export function useRecordAllocationController<TItem, TAllocation>({
  setItems,
  getItemId,
  getAllocationId,
  readAllocations,
  writeAllocations,
  reconcileItem,
}: {
  setItems: (value: MaybeUpdater<TItem[]>) => void
  getItemId: (item: TItem) => string
  getAllocationId: (allocation: TAllocation) => string
  readAllocations: (item: TItem) => TAllocation[]
  writeAllocations: (item: TItem, allocations: TAllocation[]) => TItem
  reconcileItem?: (item: TItem) => TItem
}) {
  const patchItemAllocations = useCallback(
    (itemId: string, updateAllocations: (allocations: TAllocation[]) => TAllocation[]) => {
      setItems((previous) =>
        previous.map((item) => {
          if (getItemId(item) !== itemId) {
            return item
          }

          const nextItem = writeAllocations(item, updateAllocations(readAllocations(item)))
          return reconcileItem ? reconcileItem(nextItem) : nextItem
        }),
      )
    },
    [getItemId, readAllocations, reconcileItem, setItems, writeAllocations],
  )

  const addAllocation = useCallback(
    (itemId: string, createAllocation: () => TAllocation) => {
      const nextAllocation = createAllocation()
      patchItemAllocations(itemId, (allocations) => [...allocations, nextAllocation])
      return nextAllocation
    },
    [patchItemAllocations],
  )

  const updateAllocation = useCallback(
    (itemId: string, allocationId: string, updateAllocationValue: (allocation: TAllocation) => TAllocation) => {
      patchItemAllocations(itemId, (allocations) =>
        allocations.map((allocation) =>
          getAllocationId(allocation) === allocationId ? updateAllocationValue(allocation) : allocation,
        ),
      )
    },
    [getAllocationId, patchItemAllocations],
  )

  const removeAllocation = useCallback(
    (itemId: string, allocationId: string) => {
      patchItemAllocations(itemId, (allocations) =>
        allocations.filter((allocation) => getAllocationId(allocation) !== allocationId),
      )
    },
    [getAllocationId, patchItemAllocations],
  )

  return {
    addAllocation,
    updateAllocation,
    removeAllocation,
  }
}
