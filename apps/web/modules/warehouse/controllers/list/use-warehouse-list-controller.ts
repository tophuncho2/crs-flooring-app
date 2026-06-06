"use client"

import { useRecordEntryNavigation } from "@/hooks/navigation"

export function useWarehouseListController() {
  const navigation = useRecordEntryNavigation("/dashboard/warehouse")

  return {
    openCreate: navigation.openCreate,
    openWarehouse: navigation.openRecord,
  }
}
