"use client"

import { useState } from "react"
import { useRecordEntryNavigation } from "@/features/shared/engines/common/record-entry"
import { confirmRecordDelete, buildDeleteConfirmationMessage } from "@/features/flooring/shared/ui/table/confirm-delete"
import { requestJson } from "@/features/flooring/shared/transport/http"
import type { ProductRow } from "../domain/types"

export type { ProductRow } from "../domain/types"

export function useProductsListController({
  initialProducts,
}: {
  initialProducts: ProductRow[]
}) {
  const productNavigation = useRecordEntryNavigation("/dashboard/flooring/products")
  const [products, setProducts] = useState(initialProducts)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null)

  function clearNotices() {
    setMessage("")
    setError("")
  }

  function openCreateProduct() {
    clearNotices()
    productNavigation.openCreate()
  }

  async function deleteProduct(product: ProductRow) {
    if (!confirmRecordDelete(buildDeleteConfirmationMessage(product.name || "product"))) {
      return
    }

    clearNotices()
    setDeletingProductId(product.id)

    try {
      await requestJson<{ success: boolean }>(`/api/flooring/products/${product.id}`, { method: "DELETE" })
      setProducts((previous) => previous.filter((item) => item.id !== product.id))
      setMessage("Product deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete product")
    } finally {
      setDeletingProductId(null)
    }
  }

  return {
    products,
    message,
    error,
    clearNotices,
    openCreateProduct,
    deletingProductId,
    deleteProduct,
    openProductRecord: productNavigation.openRecord,
  }
}
