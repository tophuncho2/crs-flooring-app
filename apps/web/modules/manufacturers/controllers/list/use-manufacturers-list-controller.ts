"use client"

import { useRecordEntryNavigation } from "@/hooks/navigation"

export function useManufacturersListController() {
  const navigation = useRecordEntryNavigation("/dashboard/manufacturers")

  return {
    openCreate: navigation.openCreate,
    openManufacturer: navigation.openRecord,
  }
}
