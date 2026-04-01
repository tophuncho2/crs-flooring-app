"use client"

import { requestJson } from "@/modules/shared/engines/common/transport/http"
import { withMutationMeta } from "@/modules/shared/engines/common/transport/mutation"
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

export async function deleteUnitOfMeasure(id: string, updatedAt: string) {
  return requestJson<{ ok: true }>(`/api/builder/unit-of-measures/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({}, updatedAt)),
  })
}
