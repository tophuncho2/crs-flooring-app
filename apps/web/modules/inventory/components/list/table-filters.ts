import type { TableFilterDefinition } from "@/modules/shared/engines/list-view/controllers/table-filter-state"
import type {
  InventoryCategoryOption,
  InventoryProductOption,
  InventoryWarehouseOption,
} from "@builders/domain"

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
      label: "Status",
      clearLabel: "All",
      options: [
        { value: "pending", label: "Pending" },
        { value: "final", label: "Final" },
      ],
    },
    {
      key: "warehouseId",
      param: "warehouse",
      type: "select",
      label: "Warehouse",
      clearLabel: "All Warehouses",
      options: warehouseOptions.map((warehouse) => ({
        value: warehouse.id,
        label: warehouse.name,
      })),
    },
    {
      key: "categoryId",
      param: "category",
      type: "select",
      label: "Category",
      clearLabel: "All Categories",
      options: categoryOptions.map((category) => ({
        value: category.id,
        label: category.name,
      })),
    },
    {
      key: "productId",
      param: "product",
      type: "select",
      label: "Product",
      clearLabel: "All Products",
      options: productOptions.map((product) => ({
        value: product.id,
        label: product.label,
      })),
    },
  ]
}

export function createInventoryChildFilterDefinitions(
  warehouseOptions: InventoryWarehouseOption[],
): TableFilterDefinition[] {
  return createInventoryPageFilterDefinitions({
    warehouseOptions,
    categoryOptions: [],
    productOptions: [],
  }).filter((definition) => definition.key === "status" || definition.key === "warehouseId")
}
