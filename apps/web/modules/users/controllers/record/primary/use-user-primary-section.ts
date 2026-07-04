"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { toUserForm, type User, type UserForm } from "@builders/domain"
import { deleteUserRequest, updateUserRankRequest } from "@/modules/users/data/mutations"
import { USERS_LIST_QUERY_KEY } from "@/modules/users/data/list-users-request"

// The user record view has ONE saved field (rank, via optimistic-concurrency on
// `updatedAt`) plus a permanent delete. Both flow through the single-section
// controller; delete cascades the user's sessions and returns to the list.
export function useUserPrimarySection({
  page,
  entry,
}: {
  page: RecordDetailClientScaffoldContext
  entry: User
}) {
  const queryClient = useQueryClient()

  return useSingleSectionRecordController<User, UserForm>({
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
    deleteRecord: async (record) => {
      await deleteUserRequest(record.id, record.updatedAt)
      await queryClient.invalidateQueries({ queryKey: [...USERS_LIST_QUERY_KEY] })
    },
    deleteErrorMessage: "Failed to delete user",
  })
}
