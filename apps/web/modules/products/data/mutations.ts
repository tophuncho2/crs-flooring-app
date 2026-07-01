"use client"

import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"
import type { ProductRecord } from "@builders/db"
import type { ProductCreateForm, ProductUpdateForm } from "@builders/domain"

function toCreateRequestBody(input: ProductCreateForm): Record<string, unknown> {
  return { ...input }
}

// `ProductUpdateForm` carries the full draft (categoryId + unitId are both
// mutable now, UoM epic 2A) — send it as-is. The PATCH validator requires
// categoryId + unitId; `coverageUnitId` is dormant and never sent.
function toUpdateRequestBody(input: ProductUpdateForm): Record<string, unknown> {
  return { ...input }
}

export async function createProductRequest(input: ProductCreateForm) {
  return requestJson<{ product: ProductRecord }>("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(toCreateRequestBody(input))),
  })
}

export async function updateProductRequest(
  id: string,
  input: ProductUpdateForm,
  revisionKey: string,
) {
  return requestJson<{ product: ProductRecord }>(`/api/products/${id}/primary/section`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(toUpdateRequestBody(input), revisionKey)),
  })
}

export async function deleteProductRequest(id: string, updatedAt: string) {
  return requestJson<{ ok: true }>(`/api/products/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({}, updatedAt)),
  })
}
