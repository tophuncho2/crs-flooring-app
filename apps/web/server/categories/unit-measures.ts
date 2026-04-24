export const flooringCategoryUnitInclude = {
  sendUnit: {
    select: {
      id: true,
      name: true,
    },
  },
  stockUnit: {
    select: {
      id: true,
      name: true,
    },
  },
  itemCoverageUnit: {
    select: {
      id: true,
      name: true,
    },
  },
} as const

type UnitRef = {
  id: string
  name: string
} | null

type CategoryUnitRefs = {
  sendUnit: UnitRef
  stockUnit: UnitRef
  itemCoverageUnit: UnitRef
}

export function normalizeCategoryUnitValues(category: CategoryUnitRefs) {
  return {
    sendUnitId: category.sendUnit?.id ?? "",
    stockUnitId: category.stockUnit?.id ?? "",
    itemCoverageUnitId: category.itemCoverageUnit?.id ?? "",
    sendUnit: category.sendUnit?.name ?? "",
    stockUnit: category.stockUnit?.name ?? "",
    itemCoverageUnit: category.itemCoverageUnit?.name ?? "",
  }
}
