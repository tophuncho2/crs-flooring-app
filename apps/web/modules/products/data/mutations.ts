"use client"

import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"
import type { ProductRecord } from "@builders/db"

// Serialized product form — the raw client-side shape sent to the API.
export type ProductRequestInput = {
  categoryId: string
  manufacturerId: string
  style: string
  color: string
  productNamingAddon: string
}

function toCreateRequestBody(input: ProductRequestInput): Record<string, unknown> {
  return { ...input }
}

// Strips `categoryId` before sending — it's immutable post-create. The PATCH
// validator rejects categoryId (PRODUCT_CATEGORY_LOCKED). The record-view
// section displays it readonly but the controller's local form value still
// carries it for shape parity with the create flow, so we drop it here at the
// wire boundary.
function toUpdateRequestBody(input: ProductRequestInput): Record<string, unknown> {
  const { categoryId: _categoryId, ...rest } = input
  return rest
}

export async function createProductRequest(input: ProductRequestInput) {
  return requestJson<{ product: ProductRecord }>("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(toCreateRequestBody(input))),
  })
}

export async function updateProductRequest(
  id: string,
  input: ProductRequestInput,
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
