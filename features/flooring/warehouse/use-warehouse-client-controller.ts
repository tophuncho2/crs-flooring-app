"use client"

import { useState } from "react"
import { getClientErrorMessage } from "@/features/flooring/shared/client-errors"
import { requestJson } from "@/features/flooring/shared/http"
import type { WarehouseDraft, WarehouseRow } from "./types"

type WarehousePayload = {
  warehouse?: WarehouseRow
}

export function useWarehouseClientController(initialRows: WarehouseRow[]) {
  const [rows, setRows] = useState(initialRows)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [createDraft, setCreateDraft] = useState<WarehouseDraft>({ name: "", address: "", phone: "" })

  function updateCreateDraft(field: keyof WarehouseDraft, value: string) {
    setCreateDraft((prev) => ({ ...prev, [field]: value }))
  }

  async function createWarehouse() {
    if (!createDraft.name.trim()) {
      setError("Warehouse name is required")
      return null
    }

    setMessage("")
    setError("")
    setIsSaving(true)

    try {
      const payload = await requestJson<WarehousePayload>("/api/flooring/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createDraft),
      })

      if (!payload.warehouse) {
        throw new Error("Failed to create warehouse")
      }

      setRows((prev) => [payload.warehouse!, ...prev])
      setCreateDraft({ name: "", address: "", phone: "" })
      setIsCreating(false)
      setMessage("Warehouse created")
      return payload.warehouse
    } catch (createError) {
      setError(getClientErrorMessage(createError, "Failed to create warehouse"))
      return null
    } finally {
      setIsSaving(false)
    }
  }

  return {
    rows,
    message,
    error,
    isCreating,
    isSaving,
    createDraft,
    setIsCreating,
    setMessage,
    setError,
    updateCreateDraft,
    createWarehouse,
  }
}
