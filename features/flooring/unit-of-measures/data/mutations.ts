"use client"

import { requestJson } from "@/features/flooring/shared/transport/http"
import type { UnitOfMeasureForm, UnitOfMeasureRow } from "../domain/types"

export async function createUnitOfMeasure(input: UnitOfMeasureForm) {
  return requestJson<{ unitOfMeasure: UnitOfMeasureRow }>("/api/builder/unit-of-measures", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export async function updateUnitOfMeasure(id: string, input: UnitOfMeasureForm) {
  return requestJson<{ unitOfMeasure: UnitOfMeasureRow }>(`/api/builder/unit-of-measures/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export async function deleteUnitOfMeasure(id: string) {
  return requestJson<{ success: boolean }>(`/api/builder/unit-of-measures/${id}`, {
    method: "DELETE",
  })
}
