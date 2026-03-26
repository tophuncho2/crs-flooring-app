"use client"

import { useCallback, useRef, useState } from "react"
import { requestJson } from "@/features/flooring/shared/transport/http"

type UseReadOnlyChildCollectionConfig<TItem> = {
  listUrl: string
  mapItems: (payload: Record<string, unknown>) => TItem[]
  initialItems?: TItem[]
}

export function useReadOnlyChildCollection<TItem>({
  listUrl,
  mapItems,
  initialItems = [],
}: UseReadOnlyChildCollectionConfig<TItem>) {
  const [items, setItemsState] = useState<TItem[]>(initialItems)
  const itemsRef = useRef<TItem[]>(initialItems)
  const [loading, setLoading] = useState(false)

  const setItems = useCallback((value: TItem[] | ((previous: TItem[]) => TItem[])) => {
    const nextItems = typeof value === "function" ? value(itemsRef.current) : value
    if (Object.is(itemsRef.current, nextItems)) {
      return
    }

    itemsRef.current = nextItems
    setItemsState(nextItems)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const payload = await requestJson<Record<string, unknown>>(listUrl)
      const nextItems = mapItems(payload)
      if (Object.is(itemsRef.current, nextItems)) {
        return itemsRef.current
      }

      itemsRef.current = nextItems
      setItemsState(nextItems)
      return nextItems
    } finally {
      setLoading(false)
    }
  }, [listUrl, mapItems])

  return {
    items,
    setItems,
    loading,
    load,
  }
}
