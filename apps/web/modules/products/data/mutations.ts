"use client"

import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"
import type { ProductRecord } from "@builders/db"
import type { ProductCreateForm, ProductUpdateForm } from "@builders/domain"

function toCreateRequestBody(input: ProductCreateForm): Record<string, unknown> {
  return { ...input }
}

// `ProductUpdateForm` already omits `categoryId` (immutable post-create — the
// PATCH validator rejects it with PRODUCT_CATEGORY_LOCKED), so the body is the
// form as-is. The defensive strip stays in case a caller passes a wider shape.
function toUpdateRequestBody(input: ProductUpdateForm): Record<string, unknown> {
  const { categoryId: _categoryId, ...rest } = input as ProductUpdateForm & {
    categoryId?: string
  }
  return rest
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
