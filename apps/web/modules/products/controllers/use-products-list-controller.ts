"use client"

import { useState } from "react"
import { useRecordEntryNavigation } from "@/modules/shared/engines/common/record-entry"
import type { ProductRecord } from "@builders/db"

export type { ProductRecord } from "@builders/db"

export function useProductsListController({
  initialProducts,
}: {
  initialProducts: ProductRecord[]
}) {
  const productNavigation = useRecordEntryNavigation("/dashboard/products")
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
