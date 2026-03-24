import type { TableFilterDefinition } from "@/features/flooring/shared/controllers/table/table-filter-state"
import {
  ALL_INVENTORY_CATEGORY_FILTER,
  ALL_INVENTORY_PRODUCT_FILTER,
  ALL_INVENTORY_STATUS_FILTER,
  ALL_INVENTORY_WAREHOUSE_FILTER,
} from "@/features/flooring/inventory/domain/filters"
import type {
  InventoryCategoryOption,
  InventoryProductOption,
  InventoryWarehouseOption,
} from "@/features/flooring/inventory/domain/types"

export function createInventoryPageFilterDefinitions({
  warehouseOptions,
  categoryOptions,
  productOptions,
}: {
  warehouseOptions: InventoryWarehouseOption[]
  categoryOptions: InventoryCategoryOption[]
  productOptions: InventoryProductOption[]
}): TableFilterDefinition[] {
  return [
    {
      key: "status",
      param: "status",
      type: "tabs",
      defaultValue: ALL_INVENTORY_STATUS_FILTER,
      options: [
        { value: ALL_INVENTORY_STATUS_FILTER, label: "All" },
        { value: "pending", label: "Pending" },
        { value: "final", label: "Final" },
      ],
    },
    {
      key: "warehouseId",
      param: "warehouse",
      type: "select",
      label: "Warehouse",
      defaultValue: ALL_INVENTORY_WAREHOUSE_FILTER,
      options: [
        { value: ALL_INVENTORY_WAREHOUSE_FILTER, label: "All Warehouses" },
        ...warehouseOptions.map((warehouse) => ({
          value: warehouse.id,
          label: warehouse.name,
        })),
      ],
    },
    {
      key: "categoryId",
      param: "category",
      type: "select",
      label: "Category",
      defaultValue: ALL_INVENTORY_CATEGORY_FILTER,
      options: [
        { value: ALL_INVENTORY_CATEGORY_FILTER, label: "All Categories" },
        ...categoryOptions.map((category) => ({
          value: category.id,
          label: category.name,
        })),
      ],
    },
    {
      key: "productId",
      param: "product",
      type: "select",
      label: "Product",
      defaultValue: ALL_INVENTORY_PRODUCT_FILTER,
      options: [
        { value: ALL_INVENTORY_PRODUCT_FILTER, label: "All Products" },
        ...productOptions.map((product) => ({
          value: product.id,
          label: product.label,
        })),
      ],
    },
  ]
}

export function createInventoryChildFilterDefinitions(warehouseOptions: InventoryWarehouseOption[]): TableFilterDefinition[] {
  return createInventoryPageFilterDefinitions({
    warehouseOptions,
    categoryOptions: [],
    productOptions: [],
  }).filter((definition) => definition.key === "status" || definition.key === "warehouseId")
}
