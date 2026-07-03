"use client"

import { useRecordEntryNavigation } from "@/hooks/navigation"

export function useUsersListController() {
  const navigation = useRecordEntryNavigation("/dashboard/users")

  return {
    openUser: navigation.openRecord,
  }
}
