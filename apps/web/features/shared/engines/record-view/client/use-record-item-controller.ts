"use client"

import { useCallback } from "react"

type MaybeUpdater<T> = T | ((previous: T) => T)

export function useRecordItemController<TItem>({
  setItems,
  getItemId,
}: {
  setItems: (value: MaybeUpdater<TItem[]>) => void
  getItemId: (item: TItem) => string
}) {
  const addItem = useCallback(
    (createItem: () => TItem) => {
      const nextItem = createItem()
      setItems((previous) => [nextItem, ...previous])
      return nextItem
    },
    [setItems],
  )

  const updateItem = useCallback(
    (itemId: string, updateItemValue: (item: TItem) => TItem) => {
      setItems((previous) =>
        previous.map((item) => (getItemId(item) === itemId ? updateItemValue(item) : item)),
      )
    },
    [getItemId, setItems],
  )

  const removeItem = useCallback(
    (itemId: string) => {
      setItems((previous) => previous.filter((item) => getItemId(item) !== itemId))
    },
    [getItemId, setItems],
  )

  const replaceItems = useCallback(
    (items: TItem[]) => {
      setItems(items)
    },
    [setItems],
  )

  return {
    addItem,
    updateItem,
    removeItem,
    replaceItems,
  }
}
