"use client"

import { requestJson } from "@/modules/shared/engines/common/transport/http"
import { withMutationMeta } from "@/modules/shared/engines/common/transport/mutation"
import { useSingleSectionRecordController, type RecordDetailClientScaffoldContext } from "@/modules/shared/engines/record-view"
import { toManagedUserForm, type ManagedUserForm, type ManagedUserRow } from "../../../domain/types"

export function useAdminUserPrimarySection({
  page,
  user,
}: {
  page: RecordDetailClientScaffoldContext
  user: ManagedUserRow
}) {
  return useSingleSectionRecordController<ManagedUserRow, ManagedUserForm>({
    page,
    scope: "admin-users",
    id: user.id,
    initialRecord: user,
    detailUrl: `/api/admin/users/${user.id}`,
    payloadKey: "user",
    createLocalValue: toManagedUserForm,
    saveSection: async ({ localValue, record, revisionKey }) => {
      const payload = await requestJson<{ user: ManagedUserRow }>(
        `/api/admin/users/${record.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(withMutationMeta(localValue, revisionKey)),
        },
      )

      return {
        serverValue: payload.user,
        noticeMessage: "User saved",
      }
    },
    deleteRecord: async (record) => {
      await requestJson(`/api/admin/users/${record.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withMutationMeta({}, record.createdAt)),
      })
    },
    deleteErrorMessage: "Failed to delete user",
  })
}
