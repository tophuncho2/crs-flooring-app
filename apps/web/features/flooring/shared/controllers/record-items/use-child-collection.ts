"use client"

import { useCallback, useRef, useState } from "react"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { withMutationMeta } from "@/features/flooring/shared/transport/mutation"

type CollectionMutationResult<TItem> = {
  items: TItem[]
  payload: Record<string, unknown>
}

type UseChildCollectionConfig<TItem, TCreateInput, TUpdateInput> = {
  listUrl: string
  createUrl: string
  updateUrl: (itemId: string) => string
  deleteUrl: (itemId: string) => string
  mapItems: (payload: Record<string, unknown>) => TItem[]
  serializeCreate: (input: TCreateInput) => unknown
  serializeUpdate: (input: TUpdateInput) => unknown
  skipReloadAfterMutation?: boolean
  getItemId?: (item: TItem) => string
  getItemUpdatedAt?: (item: TItem) => string
  pickCreatedItem?: (payload: Record<string, unknown>) => TItem
  pickUpdatedItem?: (payload: Record<string, unknown>) => TItem
  onAfterMutation?: () => Promise<void>
  mutationMode?: "none" | "envelope"
}

export function useChildCollection<TItem, TCreateInput, TUpdateInput>({
  listUrl,
  createUrl,
  updateUrl,
  deleteUrl,
  mapItems,
  serializeCreate,
  serializeUpdate,
  skipReloadAfterMutation = false,
  getItemId,
  getItemUpdatedAt,
  pickCreatedItem,
  pickUpdatedItem,
  onAfterMutation,
  mutationMode = "none",
}: UseChildCollectionConfig<TItem, TCreateInput, TUpdateInput>) {
  const [items, setItemsState] = useState<TItem[]>([])
  const itemsRef = useRef<TItem[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [savingItemId, setSavingItemId] = useState<string | null>(null)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)

  const replaceItems = useCallback((nextItems: TItem[]) => {
    if (Object.is(itemsRef.current, nextItems)) {
      return itemsRef.current
    }

    itemsRef.current = nextItems
    setItemsState(nextItems)
    return nextItems
  }, [])

  const setItems = useCallback(
    (value: TItem[] | ((previous: TItem[]) => TItem[])) => {
      const nextItems = typeof value === "function" ? (value as (previous: TItem[]) => TItem[])(itemsRef.current) : value
      replaceItems(nextItems)
    },
    [replaceItems],
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const payload = (await requestJson<Record<string, unknown>>(listUrl)) as Record<string, unknown>
      const nextItems = mapItems(payload)
      replaceItems(nextItems)
      return nextItems
    } finally {
      setLoading(false)
    }
  }, [listUrl, mapItems, replaceItems])

  const createItem = useCallback(
    async (input: TCreateInput) => {
      setAdding(true)
      try {
        const serializedInput = serializeCreate(input) as Record<string, unknown>
        const payload = await requestJson<Record<string, unknown>>(createUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            mutationMode === "envelope" ? withMutationMeta(serializedInput) : serializedInput,
          ),
        })
        let nextItems = itemsRef.current

        if (skipReloadAfterMutation && pickCreatedItem) {
          const createdItem = pickCreatedItem(payload)
          nextItems = replaceItems([...itemsRef.current, createdItem])
        } else if (skipReloadAfterMutation) {
          nextItems = itemsRef.current
        } else {
          nextItems = await load()
        }

        if (onAfterMutation) {
          await onAfterMutation()
        }
        return {
          items: nextItems,
          payload,
        } satisfies CollectionMutationResult<TItem>
      } finally {
        setAdding(false)
      }
    },
    [createUrl, load, mutationMode, onAfterMutation, pickCreatedItem, replaceItems, serializeCreate, skipReloadAfterMutation],
  )

  const updateItem = useCallback(
    async (itemId: string, input: TUpdateInput) => {
      setSavingItemId(itemId)
      try {
        const serializedInput = serializeUpdate(input) as Record<string, unknown>
        const currentItem = getItemId ? itemsRef.current.find((item) => getItemId(item) === itemId) : undefined
        const expectedUpdatedAt =
          mutationMode === "envelope"
            ? currentItem && getItemUpdatedAt
              ? getItemUpdatedAt(currentItem)
              : undefined
            : undefined
        const payload = await requestJson<Record<string, unknown>>(updateUrl(itemId), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            mutationMode === "envelope"
              ? withMutationMeta(serializedInput, expectedUpdatedAt)
              : serializedInput,
          ),
        })
        let nextItems = itemsRef.current

        if (skipReloadAfterMutation && pickUpdatedItem && getItemId) {
          const updatedItem = pickUpdatedItem(payload)
          nextItems = replaceItems(itemsRef.current.map((item) => (getItemId(item) === itemId ? updatedItem : item)))
        } else if (skipReloadAfterMutation) {
          nextItems = itemsRef.current
        } else {
          nextItems = await load()
        }

        if (onAfterMutation) {
          await onAfterMutation()
        }
        return {
          items: nextItems,
          payload,
        } satisfies CollectionMutationResult<TItem>
      } finally {
        setSavingItemId(null)
      }
    },
    [
      getItemId,
      getItemUpdatedAt,
      load,
      mutationMode,
      onAfterMutation,
      pickUpdatedItem,
      replaceItems,
      serializeUpdate,
      skipReloadAfterMutation,
      updateUrl,
    ],
  )

  const deleteItem = useCallback(
    async (itemId: string) => {
      setDeletingItemId(itemId)
      try {
        const currentItem = getItemId ? itemsRef.current.find((item) => getItemId(item) === itemId) : undefined
        const expectedUpdatedAt =
          mutationMode === "envelope"
            ? currentItem && getItemUpdatedAt
              ? getItemUpdatedAt(currentItem)
              : undefined
            : undefined
        const payload = await requestJson<Record<string, unknown>>(deleteUrl(itemId), {
          method: "DELETE",
          headers: mutationMode === "envelope" ? { "Content-Type": "application/json" } : undefined,
          body:
            mutationMode === "envelope"
              ? JSON.stringify(withMutationMeta({}, expectedUpdatedAt))
              : undefined,
        })
        let nextItems = itemsRef.current

        if (skipReloadAfterMutation && getItemId) {
          nextItems = replaceItems(itemsRef.current.filter((item) => getItemId(item) !== itemId))
        } else if (skipReloadAfterMutation) {
          nextItems = itemsRef.current
        } else {
          nextItems = await load()
        }

        if (onAfterMutation) {
          await onAfterMutation()
        }
        return {
          items: nextItems,
          payload,
        } satisfies CollectionMutationResult<TItem>
      } finally {
        setDeletingItemId(null)
      }
    },
    [deleteUrl, getItemId, getItemUpdatedAt, load, mutationMode, onAfterMutation, replaceItems, skipReloadAfterMutation],
  )

  return {
    items,
    setItems,
    loading,
    adding,
    savingItemId,
    deletingItemId,
    load,
    createItem,
    updateItem,
    deleteItem,
  }
}
