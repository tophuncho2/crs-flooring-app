"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  createProductRequest,
  deleteProductRequest,
  updateProductRequest,
} from "@/modules/products/data/mutations"
import type { ProductCreateForm, ProductUpdateForm } from "@builders/domain"
import { PRODUCTS_LIST_QUERY_KEY } from "@/modules/products/data/list-products-request"

type UpdateArgs = { id: string; input: ProductUpdateForm; revisionKey: string }
type DeleteArgs = { id: string; updatedAt: string }

export function useProductsListMutations() {
  const queryClient = useQueryClient()
  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: [...PRODUCTS_LIST_QUERY_KEY] })

  const createProduct = useMutation({
    mutationFn: (input: ProductCreateForm) => createProductRequest(input),
    onSuccess: invalidateList,
  })

  const updateProduct = useMutation({
    mutationFn: ({ id, input, revisionKey }: UpdateArgs) =>
      updateProductRequest(id, input, revisionKey),
    onSuccess: invalidateList,
  })

  const deleteProduct = useMutation({
    mutationFn: ({ id, updatedAt }: DeleteArgs) => deleteProductRequest(id, updatedAt),
    onSuccess: invalidateList,
  })

  return { createProduct, updateProduct, deleteProduct }
}
