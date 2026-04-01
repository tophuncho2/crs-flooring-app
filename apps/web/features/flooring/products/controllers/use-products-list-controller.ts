"use client"

import { useState } from "react"
import { useRecordEntryNavigation } from "@/features/shared/engines/common/record-entry"
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

  function clearNotices() {
    setMessage("")
    setError("")
  }

  function openCreateProduct() {
    clearNotices()
    productNavigation.openCreate()
  }

  return {
    products,
    message,
    error,
    clearNotices,
    openCreateProduct,
    openProductRecord: productNavigation.openRecord,
  }
}
