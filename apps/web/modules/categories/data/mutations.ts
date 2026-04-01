"use client"

import { requestJson } from "@/modules/shared/engines/common/transport/http"
import { withMutationMeta } from "@/modules/shared/engines/common/transport/mutation"
import type { CategoryForm, CategoryRow } from "../domain/types"

export async function createCategoryRequest(input: CategoryForm) {
  return requestJson<{ category: CategoryRow }>("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export async function updateCategoryRequest(id: string, input: CategoryForm) {
  return requestJson<{ category: CategoryRow }>(`/api/categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export async function deleteCategoryRequest(id: string, updatedAt: string) {
  return requestJson<{ ok: true }>(`/api/categories/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({}, updatedAt)),
  })
}
