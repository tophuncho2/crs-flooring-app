"use client"

import { useRecordEntryNavigation } from "@/hooks/navigation"

export function useInvitesListController() {
  const navigation = useRecordEntryNavigation("/dashboard/invites")

  return {
    openInvite: navigation.openRecord,
    openCreate: navigation.openCreate,
  }
}
