"use client"

import { useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { getClientErrorMessage } from "@/transport"
import { toUserForm, type User, type UserForm } from "@builders/domain"
import { setUserActiveRequest, updateUserRankRequest } from "@/modules/users/data/mutations"
import { USERS_LIST_QUERY_KEY } from "@/modules/users/data/list-users-request"

// The user record view has ONE saved field (rank, via optimistic-concurrency on
// `updatedAt`) plus ONE discrete action (activate/deactivate, its own route).
// The rank save flows through the single-section controller; the activation
// toggle is a side action that publishes the fresh record in place.
export function useUserPrimarySection({
  page,
  entry,
}: {
  page: RecordDetailClientScaffoldContext
  entry: User
}) {
  const queryClient = useQueryClient()
  const [activeError, setActiveError] = useState<string | null>(null)
  const [isTogglingActive, setIsTogglingActive] = useState(false)

  const controller = useSingleSectionRecordController<User, UserForm>({
    page,
    scope: "users",
    id: entry.id,
    initialRecord: entry,
    detailUrl: `/api/users/${entry.id}`,
    payloadKey: "user",
    createLocalValue: toUserForm,
    manageDirtySections: false,
    saveSection: async ({ localValue, record }) => {
      const { user } = await updateUserRankRequest(record.id, localValue.rank, record.updatedAt)
      await queryClient.invalidateQueries({ queryKey: [...USERS_LIST_QUERY_KEY] })
      return { serverValue: user, noticeMessage: "Rank saved" }
    },
  })

  const record = controller.record

  const toggleActive = useCallback(async () => {
    if (isTogglingActive) return
    setIsTogglingActive(true)
    setActiveError(null)
    try {
      const { user } = await setUserActiveRequest(record.id, !record.isActive)
      controller.publishRecord(user)
      await queryClient.invalidateQueries({ queryKey: [...USERS_LIST_QUERY_KEY] })
    } catch (error) {
      setActiveError(getClientErrorMessage(error, "Could not update the user."))
    } finally {
      setIsTogglingActive(false)
    }
  }, [controller, isTogglingActive, queryClient, record.id, record.isActive])

  return { controller, toggleActive, isTogglingActive, activeError }
}
