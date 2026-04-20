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
  width: string
  sheetSize: string
  thickness: string
  unitWeight: string
  coveragePerUnit: string
  notes: string
}

function toRequestBody(input: ProductRequestInput): Record<string, unknown> {
  return {
    ...input,
    coveragePerUnit: input.coveragePerUnit.trim(),
  }
}

export async function createProductRequest(input: ProductRequestInput) {
  return requestJson<{ product: ProductRecord }>("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(toRequestBody(input))),
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
    body: JSON.stringify(withMutationMeta(toRequestBody(input), revisionKey)),
  })
}

export async function deleteProductRequest(id: string, updatedAt: string) {
  return requestJson<{ ok: true }>(`/api/products/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({}, updatedAt)),
  })
}
