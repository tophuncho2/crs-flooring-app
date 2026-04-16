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
  coverageAvailableUnit: {
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
  serviceUnit: {
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
  coverageAvailableUnit: UnitRef
  itemCoverageUnit: UnitRef
  serviceUnit: UnitRef
}

export function normalizeCategoryUnitValues(category: CategoryUnitRefs) {
  return {
    sendUnitId: category.sendUnit?.id ?? "",
    stockUnitId: category.stockUnit?.id ?? "",
    coverageAvailableUnitId: category.coverageAvailableUnit?.id ?? "",
    itemCoverageUnitId: category.itemCoverageUnit?.id ?? "",
    serviceUnitId: category.serviceUnit?.id ?? "",
    sendUnit: category.sendUnit?.name ?? "",
    stockUnit: category.stockUnit?.name ?? "",
    coverageAvailableUnit: category.coverageAvailableUnit?.name ?? "",
    itemCoverageUnit: category.itemCoverageUnit?.name ?? "",
    serviceUnit: category.serviceUnit?.name ?? "",
  }
}
