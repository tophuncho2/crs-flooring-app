"use client"

import { requestJson } from "@/modules/shared/engines/common/transport/http"
import { withMutationMeta } from "@/modules/shared/engines/common/transport/mutation"
import type { ProductRecord } from "@builders/db"

// Serialized product form — the raw client-side shape sent to the API.
// `coveragePerUnit` is a string at this layer because the UI uses text inputs;
// the route-edge `_validators.ts` converts it to a Prisma.Decimal.
export type ProductRequestInput = {
  categoryId: string
  manufacturerId: string
  style: string
  color: string
  coveragePerUnit: string
  note: string
}

function toCreateRequestBody(input: ProductRequestInput): Record<string, unknown> {
  return {
    ...input,
    coveragePerUnit: input.coveragePerUnit.trim(),
  }
}

// Strips `categoryId` before sending. Category is immutable post-create — the
// PATCH validator rejects the field with 400 (PRODUCT_CATEGORY_LOCKED). The
// record-view section displays category as readonly but the controller's local
// form value still carries categoryId for shape parity with the create flow,
// so we drop it here at the wire boundary.
function toUpdateRequestBody(input: ProductRequestInput): Record<string, unknown> {
  const { categoryId: _categoryId, ...rest } = input
  return {
    ...rest,
    coveragePerUnit: rest.coveragePerUnit.trim(),
  }
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
