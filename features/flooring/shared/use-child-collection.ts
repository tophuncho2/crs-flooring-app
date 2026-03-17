"use client"

import { useCallback, useState } from "react"
import { requestJson } from "./http"

type UseChildCollectionConfig<TItem, TCreateInput, TUpdateInput> = {
  listUrl: string
  createUrl: string
  updateUrl: (itemId: string) => string
  deleteUrl: (itemId: string) => string
  mapItems: (payload: Record<string, unknown>) => TItem[]
  serializeCreate: (input: TCreateInput) => unknown
  serializeUpdate: (input: TUpdateInput) => unknown
  skipReloadAfterMutation?: boolean
  onAfterMutation?: () => Promise<void>
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
  onAfterMutation,
}: UseChildCollectionConfig<TItem, TCreateInput, TUpdateInput>) {
  const [items, setItems] = useState<TItem[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [savingItemId, setSavingItemId] = useState<string | null>(null)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const payload = (await requestJson<Record<string, unknown>>(listUrl)) as Record<string, unknown>
      const nextItems = mapItems(payload)
      setItems(nextItems)
      return nextItems
    } finally {
      setLoading(false)
    }
  }, [listUrl, mapItems])

  const createItem = useCallback(
    async (input: TCreateInput) => {
      setAdding(true)
      try {
        await requestJson(createUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(serializeCreate(input)),
        })
        const nextItems = skipReloadAfterMutation ? items : await load()
        if (onAfterMutation) {
          await onAfterMutation()
        }
        return nextItems
      } finally {
        setAdding(false)
      }
    },
    [createUrl, items, load, onAfterMutation, serializeCreate, skipReloadAfterMutation],
  )

  const updateItem = useCallback(
    async (itemId: string, input: TUpdateInput) => {
      setSavingItemId(itemId)
      try {
        await requestJson(updateUrl(itemId), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(serializeUpdate(input)),
        })
        const nextItems = skipReloadAfterMutation ? items : await load()
        if (onAfterMutation) {
          await onAfterMutation()
        }
        return nextItems
      } finally {
        setSavingItemId(null)
      }
    },
    [items, load, onAfterMutation, serializeUpdate, skipReloadAfterMutation, updateUrl],
  )

  const deleteItem = useCallback(
    async (itemId: string) => {
      setDeletingItemId(itemId)
      try {
        await requestJson(deleteUrl(itemId), { method: "DELETE" })
        const nextItems = skipReloadAfterMutation ? items : await load()
        if (onAfterMutation) {
          await onAfterMutation()
        }
        return nextItems
      } finally {
        setDeletingItemId(null)
      }
    },
    [deleteUrl, items, load, onAfterMutation, skipReloadAfterMutation],
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
