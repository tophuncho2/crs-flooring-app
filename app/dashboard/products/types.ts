export type CategoryDto = {
  id: string
  name: string
  stockUnit: string
  purchaseUnit: string
  coverageUnit: string
  rateUnit: string
  altUnit: string | null
  createdAt: string
  productCount: number
}

export type ProductDto = {
  id: string
  name: string
  description: string | null
  categoryId: string
  internalCost: string
  customerCost: string
  laborRate: string
  coveragePerUnit: string
  isActive: boolean
  createdAt: string
  category: {
    id: string
    name: string
    stockUnit: string
    purchaseUnit: string
    coverageUnit: string
    rateUnit: string
    altUnit: string | null
  }
}

export type CategoryForm = {
  name: string
  stockUnit: string
  purchaseUnit: string
  coverageUnit: string
  rateUnit: string
  altUnit: string
}

export type ProductForm = {
  name: string
  description: string
  categoryId: string
  internalCost: string
  customerCost: string
  laborRate: string
  coveragePerUnit: string
  isActive: boolean
}
