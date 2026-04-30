"use client"

import { useState } from "react"
import { useRecordEntryNavigation } from "@/hooks/navigation"
import { useWorkOrdersListMutations } from "./use-work-orders-list-mutations"

export type { WorkOrderListRow } from "@builders/domain"

export function useWorkOrdersListController() {
  const navigation = useRecordEntryNavigation("/dashboard/work-orders")
  const mutations = useWorkOrdersListMutations()
  const [message, setMessage] = useState("")
  const [pageError, setPageError] = useState("")

  return {
    message,
    setMessage,
    pageError,
    setPageError,
    openCreate: navigation.openCreate,
    openWorkOrder: navigation.openRecord,
    mutations,
  }
}
