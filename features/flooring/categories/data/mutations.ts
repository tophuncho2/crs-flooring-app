"use client"

import { requestJson } from "@/features/flooring/shared/transport/http"
import type { CategoryForm, CategoryRow } from "../domain/types"

export async function createCategoryRequest(input: CategoryForm) {
  return requestJson<{ category: CategoryRow }>("/api/flooring/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export async function updateCategoryRequest(id: string, input: CategoryForm) {
  return requestJson<{ category: CategoryRow }>(`/api/flooring/categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export async function deleteCategoryRequest(id: string) {
  return requestJson<{ success: boolean }>(`/api/flooring/categories/${id}`, {
    method: "DELETE",
  })
}
